import { baseUrlFromRequest } from "@/lib/config";
import { db, Staff } from "@/lib/db";
import { json, errorMessage } from "@/lib/http";
import { upsertAuthUser } from "@/lib/supabaseAuth";
import { isBuiltInAdmin, newJoinCode, staffByEmail } from "@/lib/staff";
import { assignNumber } from "@/lib/numbers";
import { schoolByCode, schoolById } from "@/lib/schools";
import { isPersonalEmail, REQUIRE_SCHOOL_EMAIL } from "@/lib/schoolEmail";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { clientIp, limited, record, TOO_MANY } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Invite = {
  id: string;
  code: string;
  name: string;
  school: string | null;
  school_id: string | null;
  area_code: string | null;
  role: "admin" | "teacher";
  used_at: string | null;
  expires_at: string;
};

// A code is either a school's reusable code (anyone using it joins that school)
// or a one-time code an admin created for one person.
async function openInvite(code: string): Promise<Invite | null> {
  if (!/^\d{5}$/.test(code)) return null;
  const school = await schoolByCode(code);
  if (school) {
    return {
      id: "school",
      code,
      name: "",
      school: school.name,
      school_id: school.id,
      area_code: school.area_code,
      role: "teacher",
      used_at: null,
      expires_at: "",
    };
  }
  const { data } = await db()
    .from("invites")
    .select("*")
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const inv = data as Invite;
  if (inv.school_id) {
    const s = await schoolById(inv.school_id);
    if (s) return { ...inv, school: s.name, area_code: inv.area_code || s.area_code };
  }
  return inv;
}

// Public: check a sign-up code as it's typed, to greet the teacher by name.
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") || "").trim();
  const ip = `ip:${clientIp(req)}`;
  // Stop anyone guessing 5-digit codes.
  if (await limited([{ kind: "code_bad", key: ip, max: 20, minutes: 15 }])) return json({ valid: false, error: TOO_MANY }, 429);
  const inv = await openInvite(code).catch(() => null);
  if (!inv && /^\d{5}$/.test(code)) await record("code_bad", ip);
  return json(inv ? { valid: true, name: inv.name, school: inv.school } : { valid: false });
}

// Public: a teacher creates their account with a 5-digit code (their school's code, or a one-time code).
// The account is active right away, gets its own texting number, and is signed in.
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const code = String(b.code || "").replace(/\D/g, "");
    const name = String(b.name || "").trim().slice(0, 100);
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");

    const ip = `ip:${clientIp(req)}`;
    if (
      await limited([
        { kind: "code_bad", key: ip, max: 20, minutes: 15 },
        { kind: "signup", key: ip, max: 10, minutes: 60 },
      ])
    ) {
      return json({ error: TOO_MANY }, 429);
    }
    await record("signup", ip);
    const inv = await openInvite(code);
    if (!inv) await record("code_bad", ip);
    if (!inv) return json({ error: "That sign-up code isn't valid or has already been used. Check it with your Relay admin." }, 400);
    if (!name) return json({ error: "Enter your name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (REQUIRE_SCHOOL_EMAIL && isPersonalEmail(email)) return json({ error: "Please use your school email address, not a personal one." }, 400);
    if (password.length < 12) return json({ error: "Choose a password of at least 12 characters." }, 400);
    if (b.confirmPassword !== undefined && String(b.confirmPassword) !== password) {
      return json({ error: "The passwords don't match." }, 400);
    }
    if (await staffByEmail(email)) return json({ error: "An account with this email already exists. Sign in instead." }, 400);

    // A school's reusable code can be passed around, so those sign-ups wait for an admin to approve them
    // (and only get a texting number then). A one-time code was made for this person, so it's active right away.
    const needsApproval = inv.id === "school" && !isBuiltInAdmin(email);

    const userId = await upsertAuthUser(email, password);
    const ins = await db()
      .from("staff")
      .insert({
        email,
        name,
        school: inv.school,
        school_id: inv.school_id || null,
        area_code: inv.area_code,
        user_id: userId,
        role: inv.role === "admin" || isBuiltInAdmin(email) ? "admin" : "teacher",
        status: needsApproval ? "pending" : "active",
        join_code: newJoinCode(),
        last_seen_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const me = ins.data as Staff;

    if (inv.id !== "school") {
      await db().from("invites").update({ used_at: new Date().toISOString(), used_by: me.id }).eq("id", inv.id);
    }
    if (needsApproval) return json({ ok: true, pending: true, school: inv.school });
    await assignNumber(me, baseUrlFromRequest(req)).catch((e) => console.error("number on signup", e));

    const token = await createSessionToken(email, me.role);
    const res = json({ ok: true });
    res.headers.append(
      "set-cookie",
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
    );
    return res;
  } catch (e) {
    console.error("signup failed", e);
    const msg = errorMessage(e);
    if (/relation .*invites.* does not exist|invites.*schema cache/i.test(msg)) {
      return json({ error: "Sign-up isn't set up yet. Ask your admin to run the latest database script." }, 500);
    }
    return json({ error: `Sign-up didn't work: ${msg}` }, 500);
  }
}
