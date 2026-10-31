// Central place to read settings from environment variables (set in Vercel).
// Values are cleaned up, so stray spaces, quotes or a pasted "/rest/v1" don't break anything.
function clean(v: string | undefined): string {
  return (v || "").trim().replace(/^["']+|["']+$/g, "").trim();
}

function supabaseUrl(v: string): string {
  let u = clean(v);
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/(rest|auth)\/v1.*$/i, "").replace(/\/+$/, "");
}

export const env = {
  supabaseUrl: supabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
  supabaseServiceKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  googleKey: clean(process.env.GOOGLE_TRANSLATE_API_KEY),
  twilioSid: clean(process.env.TWILIO_ACCOUNT_SID),
  twilioToken: clean(process.env.TWILIO_AUTH_TOKEN),
  twilioFrom: clean(process.env.TWILIO_PHONE_NUMBER).replace(/[\s().-]/g, ""),
  twilioMessagingService: clean(process.env.TWILIO_MESSAGING_SERVICE_SID),
  appUrl: clean(process.env.APP_URL).replace(/\/+$/, ""),
};

export function twilioConfigured(): boolean {
  return Boolean(env.twilioSid && env.twilioToken && (env.twilioFrom || env.twilioMessagingService));
}

export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}

export function translateConfigured(): boolean {
  return Boolean(env.googleKey);
}

// The public base URL of this site, as Twilio sees it.
export function baseUrlFromRequest(req: Request): string {
  if (env.appUrl) return env.appUrl;
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}
