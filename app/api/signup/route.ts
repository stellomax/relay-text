import { baseUrlFromRequest } from "@/lib/config";
import { db, Staff } from "@/lib/db";
import { json, errorMessage } from "@/lib/http";
import { upsertAuthUser } from "@/lib/supabaseAuth";
import { isBuiltInAdmin, newJoinCode, staffByEmail } from "@/lib/staff";
import { assignNumber, autoBuyEnabled } from "@/lib/numbers";
import { isPersonalEmail } from "@/lib/schoolEmail";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Invite = {
  id: string;
  code: string;
  name: string;
  school: string | null;
  area_code: string | null;
  role: "admin" | "teacher";
  used_at: string | null;
  expires_at: string;
};

// Reusable test code for trying out sign-up. Defaults to 12345 while teachers get demo numbers;
// once real numbers are being bought it's off unless TEST_SIGNUP_CODE is set in Vercel ("off" disables it).
function testSignupCode(): string | null {
  const v = (process.env.TEST_SIGNUP_CODE || "").trim();
  if (/^off$/i.test(v)) return null;
  if (/^\d{5}$/.test(v)) return v;
  return autoBuyEnabled() ? null : "12345";
}

async function openInvite(code: string): Promise<Invite | null> {
  if (!/^\d{5}$/.test(code)) return null;
  if (code === testSignupCode()) {
    const school = (process.env.TEST_SIGNUP_SCHOOL || "Sagewood Middle School").trim() || null;
    return { id: "test", code, name: "", school, area_code: null, role: "teacher", used_at: null, expires_at: "" };
  }
  const { data } = await db()
    .from("invites")
    .select("*")
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data as Invite) || null;
}

// Public: check a sign-up code as it's typed, to greet the teacher by name.
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") || "").trim();
  const inv = await openInvite(code).catch(() => null);
  return json(inv ? { valid: true, name: inv.name, school: inv.school } : { valid: false });
}

// Public: a teacher creates their account with the 5-digit code an admin gave them.
// The account is active right away, gets its own texting number, and is signed in.
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const code = String(b.code || "").replace(/\D/g, "");
    const name = String(b.name || "").trim().slice(0, 100);
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");

    const inv = await openInvite(code);
    if (!inv) return json({ error: "That sign-up code isn't valid or has already been used. Check it with your Relay Text admin." }, 400);
    if (!name) return json({ error: "Enter your name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (isPersonalEmail(email)) return json({ error: "Please use your school email address, not a personal one." }, 400);
    if (password.length < 8) return json({ error: "Choose a password of at least 8 characters." }, 400);
    if (b.confirmPassword !== undefined && String(b.confirmPassword) !== password) {
      return json({ error: "The passwords don't match." }, 400);
    }
    if (await staffByEmail(email)) return json({ error: "An account with this email already exists. Sign in instead." }, 400);

    const userId = await upsertAuthUser(email, password);
    const ins = await db()
      .from("staff")
      .insert({
        email,
        name,
        school: inv.school,
        area_code: inv.area_code,
        user_id: userId,
        role: inv.role === "admin" || isBuiltInAdmin(email) ? "admin" : "teacher",
        status: "active",
        join_code: newJoinCode(),
        last_seen_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const me = ins.data as Staff;

    if (inv.id !== "test") {
      await db().from("invites").update({ used_at: new Date().toISOString(), used_by: me.id }).eq("id", inv.id);
    }
    await assignNumber(me, baseUrlFromRequest(req)).catch((e) => console.error("number on signup", e));

    const token = await createSessionToken(email);
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
