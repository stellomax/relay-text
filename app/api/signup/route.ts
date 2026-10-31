import { db } from "@/lib/db";
import { json, errorMessage } from "@/lib/http";
import { upsertAuthUser } from "@/lib/supabaseAuth";
import { cleanAreaCode, isBuiltInAdmin, newJoinCode, staffByEmail } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Public: a teacher requests an account. It stays pending until an admin approves it (and assigns a number).
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const name = String(b.name || "").trim().slice(0, 100);
    const email = String(b.email || "").trim().toLowerCase();
    const school = String(b.school || "").trim().slice(0, 120);
    const area_code = cleanAreaCode(b.area_code);
    const password = String(b.password || "");

    if (!name) return json({ error: "Enter your name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!school) return json({ error: "Enter your school." }, 400);
    if (b.area_code && !area_code) return json({ error: "Enter a 3-digit area code, like 303." }, 400);
    if (password.length < 8) return json({ error: "Choose a password of at least 8 characters." }, 400);

    const existing = await staffByEmail(email);
    if (existing) {
      return json(
        { error: existing.status === "pending" ? "You've already signed up. Your account is waiting for approval." : "An account with this email already exists. Sign in instead." },
        400
      );
    }

    const userId = await upsertAuthUser(email, password);
    const admin = isBuiltInAdmin(email);
    const { error } = await db().from("staff").insert({
      email,
      name,
      school,
      area_code,
      user_id: userId,
      role: admin ? "admin" : "teacher",
      status: admin ? "active" : "pending",
      join_code: newJoinCode(),
    });
    if (error) throw new Error(error.message);
    return json({ ok: true, pending: !admin });
  } catch (e) {
    console.error("signup failed", e);
    return json({ error: `Sign-up didn't work: ${errorMessage(e)}` }, 500);
  }
}
