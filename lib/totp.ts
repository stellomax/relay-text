import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Two-step sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).
// Standard TOTP: 6 digits, 30-second steps, SHA-1 (RFC 6238).

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  bytes.forEach((b) => (bits += b.toString(2).padStart(8, "0")));
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function fromBase32(s: string): Buffer {
  const clean = s.replace(/[\s=-]/g, "").toUpperCase();
  let bits = "";
  for (const c of clean) {
    const v = B32.indexOf(c);
    if (v < 0) throw new Error("Bad secret");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", fromBase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

// Accepts the current code and one step either side (clock drift).
export function verifyCode(secret: string, code: string): boolean {
  const c = String(code || "").replace(/\D/g, "");
  if (c.length !== 6) return false;
  const step = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((d) => {
    const want = Buffer.from(codeAt(secret, step + d));
    return timingSafeEqual(want, Buffer.from(c));
  });
}

export function otpauthUrl(secret: string, email: string): string {
  const label = encodeURIComponent(`Relay:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Relay&algorithm=SHA1&digits=6&period=30`;
}

// The secret is stored encrypted (AES-256-GCM), with a key derived from MFA_KEY, or SESSION_SECRET if that isn't set.
// Changing that variable means everyone sets up two-step sign-in again.
function key(): Buffer {
  const base = process.env.MFA_KEY || process.env.SESSION_SECRET || "";
  if (!base) throw new Error("SESSION_SECRET isn't set.");
  return createHash("sha256").update(`relay-mfa:${base}`).digest();
}

export function sealSecret(secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

export function openSecret(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1") throw new Error("Unknown secret format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(body, "base64")), d.final()]).toString("utf8");
}
