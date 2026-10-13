// Central place to read settings from environment variables (set in Vercel).
export const env = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  googleKey: process.env.GOOGLE_TRANSLATE_API_KEY || "",
  twilioSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFrom: process.env.TWILIO_PHONE_NUMBER || "",
  twilioMessagingService: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
  appUrl: (process.env.APP_URL || "").replace(/\/+$/, ""),
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
