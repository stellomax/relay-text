import { json } from "@/lib/http";
import { db } from "@/lib/db";
import { clientIp, limited, record, TOO_MANY } from "@/lib/ratelimit";
import { createSessionToken, sessionCookie, verifyMfaTicket } from "@/lib/session";
import { isBuiltInAdmin, staffByEmail } from "@/lib/staff";
import { openSecret, verifyCode } from "@/lib/totp";

export const dynamic = "force-dynamic";

// Second step of sign-in: the 6-digit code from the person's authenticator app.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = await verifyMfaTicket(String(b.ticket || ""));
  if (!email) return json({ error: "That sign-in took too long. Please enter your password again.", restart: true }, 401);

  const ip = `ip:${clientIp(req)}`;
  if (
    await limited([
      { kind: "mfa_fail", key: `email:${email}`, max: 5, minutes: 15 },
      { kind: "mfa_fail", key: ip, max: 20, minutes: 15 },
    ])
  ) {
    return json({ error: TOO_MANY }, 429);
  }

  const me = await staffByEmail(email);
  if (!me || me.status !== "active" || !me.mfa_enabled || !me.mfa_secret) {
    return json({ error: "Please enter your password again.", restart: true }, 401);
  }
  let ok = false;
  try {
    ok = verifyCode(openSecret(me.mfa_secret), String(b.code || ""));
  } catch (e) {
    console.error("mfa secret", e);
    return json({ error: "Two-step sign-in isn't working for this account. Ask a super admin to reset it." }, 500);
  }
  if (!ok) {
    await record("mfa_fail", `email:${email}`, ip);
    return json({ error: "That code didn't match. Check your authenticator app and try again." }, 401);
  }

  await db().from("staff").update({ last_seen_at: new Date().toISOString() }).eq("id", me.id);
  const role = isBuiltInAdmin(email) ? "admin" : me.role;
  const res = json({ ok: true, home: role === "admin" ? "/admin" : "/inbox" });
  res.headers.append("set-cookie", sessionCookie(await createSessionToken(email, role)));
  return res;
}
