// Cloudflare Turnstile: a free, mostly invisible CAPTCHA that stops bots from using the public parent
// sign-up form (/join) to send texts to numbers whose owners never signed up.
// Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in Vercel (Cloudflare dashboard → Turnstile → Add widget,
// domain relaytext.io), then redeploy. With either key missing, the check is off and the form works as before.

export function captchaSiteKey(): string | null {
  return (process.env.TURNSTILE_SITE_KEY || "").trim() || null;
}

function captchaSecret(): string {
  return (process.env.TURNSTILE_SECRET_KEY || "").trim();
}

export function captchaEnabled(): boolean {
  return !!captchaSiteKey() && !!captchaSecret();
}

// True if the token from the browser is valid (or the check is off). Fails closed: if Cloudflare can't be
// reached, the sign-up is refused rather than let through unchecked.
export async function verifyCaptcha(token: unknown, ip?: string | null): Promise<boolean> {
  if (!captchaEnabled()) return true;
  const response = typeof token === "string" ? token.trim() : "";
  if (!response || response.length > 2048) return false;
  try {
    const form = new URLSearchParams({ secret: captchaSecret(), response });
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("Turnstile check failed:", data["error-codes"]?.join(", ") || res.status);
    return !!data.success;
  } catch (e) {
    console.error("Turnstile check error:", e instanceof Error ? e.message : e);
    return false;
  }
}
