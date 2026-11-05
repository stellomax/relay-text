import { baseUrlFromRequest, twilioConfigured } from "@/lib/config";
import { json, withAuth } from "@/lib/http";
import { authClient, findAuthUserId, setPassword } from "@/lib/supabaseAuth";
import { db } from "@/lib/db";
import { endAllSessions, isSuperAdmin } from "@/lib/staff";
import { createSessionToken, sessionCookie } from "@/lib/session";
import { limited, record, TOO_MANY } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// The signed-in staff member: name, role, texting number, and their parent sign-up link.
export const GET = withAuth(async (req, me) => {
  return json({
    me: {
      id: me.id,
      name: me.name,
      email: me.email,
      school: me.school,
      role: me.role,
      is_super: me.role === "admin" && isSuperAdmin(me.email),
      mfa_enabled: !!me.mfa_enabled,
      phone_number: me.phone_number,
      phone_placeholder: me.phone_placeholder,
      texting_live: twilioConfigured(),
      join_link: me.join_code ? `${baseUrlFromRequest(req)}/join?t=${me.join_code}` : null,
    },
  });
});

// Update my name/school, or change my password (requires the current one).
export const POST = withAuth(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  if (b.newPassword !== undefined) {
    const next = String(b.newPassword || "");
    if (next.length < 12) return json({ error: "Choose a password of at least 12 characters." }, 400);
    if (await limited([{ kind: "login_fail", key: `email:${me.email}`, max: 5, minutes: 15 }])) return json({ error: TOO_MANY }, 429);
    const check = await authClient().auth.signInWithPassword({ email: me.email, password: String(b.currentPassword || "") });
    if (check.error) {
      await record("login_fail", `email:${me.email}`);
      return json({ error: "Your current password isn't right." }, 400);
    }
    const uid = me.user_id || (await findAuthUserId(me.email));
    if (!uid) return json({ error: "Couldn't find your login." }, 500);
    await setPassword(uid, next);
    // Sign out every other device, and keep this one signed in.
    const sv = await endAllSessions(me);
    const res = json({ ok: true });
    res.headers.append("set-cookie", sessionCookie(await createSessionToken(me.email, me.role, sv)));
    return res;
  }
  const update: Record<string, string> = {};
  if (typeof b.name === "string" && b.name.trim()) update.name = b.name.trim().slice(0, 100);
  if (typeof b.school === "string") update.school = b.school.trim().slice(0, 120);
  if (Object.keys(update).length) {
    const { error } = await db().from("staff").update(update).eq("id", me.id);
    if (error) throw new Error(error.message);
  }
  return json({ ok: true });
});
