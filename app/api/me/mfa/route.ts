import { toDataURL } from "qrcode";
import { db } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { clientIp, limited, record, TOO_MANY } from "@/lib/ratelimit";
import { newSecret, openSecret, otpauthUrl, sealSecret, verifyCode } from "@/lib/totp";

export const dynamic = "force-dynamic";

// Two-step sign-in for the signed-in person.
// GET: is it on? POST { action: "start" } → QR code and key; { action: "confirm", code } → turn on; { action: "off", code } → turn off.
export const GET = withAuth(async (_req, me) => json({ enabled: !!me.mfa_enabled }));

export const POST = withAuth(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const supa = db();

  if (b.action === "start") {
    if (me.mfa_enabled) return json({ error: "Two-step sign-in is already on." }, 400);
    const secret = newSecret();
    const { error } = await supa.from("staff").update({ mfa_secret: sealSecret(secret), mfa_enabled: false }).eq("id", me.id);
    if (error) {
      if (/mfa_/.test(error.message)) return json({ error: "The database needs updating first: run the latest supabase/schema.sql in Supabase." }, 500);
      throw new Error(error.message);
    }
    const url = otpauthUrl(secret, me.email);
    return json({ qr: await toDataURL(url, { margin: 1, width: 220 }), key: secret.replace(/(.{4})/g, "$1 ").trim(), url });
  }

  if (b.action === "confirm" || b.action === "off") {
    if (!me.mfa_secret) return json({ error: "Start setup first." }, 400);
    if (await limited([{ kind: "mfa_fail", key: `email:${me.email}`, max: 5, minutes: 15 }])) return json({ error: TOO_MANY }, 429);
    if (!verifyCode(openSecret(me.mfa_secret), String(b.code || ""))) {
      await record("mfa_fail", `email:${me.email}`, `ip:${clientIp(req)}`);
      return json({ error: "That code didn't match. Use the 6-digit code showing in your authenticator app now." }, 400);
    }
    const update = b.action === "confirm" ? { mfa_enabled: true } : { mfa_enabled: false, mfa_secret: null };
    const { error } = await supa.from("staff").update(update).eq("id", me.id);
    if (error) throw new Error(error.message);
    return json({ ok: true, enabled: b.action === "confirm" });
  }

  return json({ error: "Unknown action." }, 400);
});
