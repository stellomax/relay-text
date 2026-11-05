import { json } from "@/lib/http";
import { authClient, setPassword } from "@/lib/supabaseAuth";
import { endAllSessions, staffByEmail } from "@/lib/staff";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";

export const dynamic = "force-dynamic";

// Set a new password from the link in the reset email, then sign the person in.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.access_token || "");
  const password = String(body.password || "");
  if (!token) return json({ error: "This reset link isn't complete. Please request a new one." }, 400);
  if (password.length < 12) return json({ error: "Choose a password of at least 12 characters." }, 400);

  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user?.email) {
    return json({ error: "This reset link has expired or was already used. Please request a new one." }, 400);
  }
  const me = await staffByEmail(data.user.email);
  if (!me || me.status !== "active") return json({ error: "This account isn't active. Contact your Relay admin." }, 403);

  try {
    await setPassword(data.user.id, password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: /same|different/i.test(msg) ? "Choose a password different from your old one." : `Couldn't save the password: ${msg}` }, 400);
  }
  await db().from("staff").update({ user_id: data.user.id, last_seen_at: new Date().toISOString() }).eq("id", me.id);

  const sv = await endAllSessions(me); // a reset signs out every other device
  const sessionToken = await createSessionToken(me.email, me.role, sv);
  const res = json({ ok: true, home: me.role === "admin" ? "/admin" : "/inbox" });
  res.headers.append("set-cookie", `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
  return res;
}
