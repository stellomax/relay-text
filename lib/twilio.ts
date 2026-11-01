import { createHmac, timingSafeEqual } from "crypto";
import { env, twilioConfigured } from "./config";

const API = () => `https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}`;
// Signs in with an API key (TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET) if set, otherwise the Account SID + Auth Token.
const useKey = () => Boolean(env.twilioKeySid && env.twilioKeySecret);
const auth = () =>
  "Basic " +
  Buffer.from(useKey() ? `${env.twilioKeySid}:${env.twilioKeySecret}` : `${env.twilioSid}:${env.twilioToken}`).toString("base64");

async function twilio(url: string, method = "GET", form?: Record<string, string>) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth(), ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  if (method === "DELETE" && (res.status === 204 || res.status === 404)) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio error${data?.code ? ` ${data.code}` : ""}: ${data?.message || `HTTP ${res.status}`}`);
  return data;
}

// Send one SMS. `from` is the teacher's own number; without it the shared number / Messaging Service is used.
export async function sendSms(to: string, body: string, statusCallback?: string, from?: string | null) {
  if (!twilioConfigured()) throw new Error("Twilio is not configured.");
  const form: Record<string, string> = { To: to, Body: body };
  if (env.twilioMessagingService) form.MessagingServiceSid = env.twilioMessagingService;
  if (from) form.From = from;
  else if (!env.twilioMessagingService) form.From = env.twilioFrom;
  if (statusCallback) form.StatusCallback = statusCallback;
  const data = await twilio(`${API()}/Messages.json`, "POST", form);
  return { sid: data.sid as string, status: (data.status as string) || "queued", from: (data.from as string) || from || env.twilioFrom || null };
}

// Buy a local, SMS-capable number, preferably in the given area code, and point its incoming texts at Relay Text.
export async function buyNumber(opts: { areaCode?: string | null; friendlyName: string; smsUrl: string }) {
  const search = async (params: Record<string, string>) => {
    const q = new URLSearchParams({ SmsEnabled: "true", PageSize: "5", ...params });
    const d = await twilio(`${API()}/AvailablePhoneNumbers/US/Local.json?${q}`);
    return (d.available_phone_numbers || []) as { phone_number: string }[];
  };
  let found = opts.areaCode ? await search({ AreaCode: opts.areaCode }) : [];
  let note = "";
  if (!found.length) {
    found = await search({});
    if (opts.areaCode) note = `No numbers were available in area code ${opts.areaCode}, so a number from another area code was used.`;
  }
  if (!found.length) throw new Error("Twilio has no available local numbers right now. Try again later.");

  const bought = await twilio(`${API()}/IncomingPhoneNumbers.json`, "POST", {
    PhoneNumber: found[0].phone_number,
    FriendlyName: opts.friendlyName.slice(0, 64),
    SmsUrl: opts.smsUrl,
    SmsMethod: "POST",
  });

  // Put it in the Messaging Service so it's covered by the approved A2P campaign.
  if (env.twilioMessagingService) {
    try {
      await twilio(`https://messaging.twilio.com/v1/Services/${env.twilioMessagingService}/PhoneNumbers`, "POST", {
        PhoneNumberSid: bought.sid,
      });
    } catch (e) {
      note += ` The number was bought but couldn't be added to the Messaging Service (${(e as Error).message}). Add it in Twilio by hand.`;
    }
  }
  return { phone: bought.phone_number as string, sid: bought.sid as string, note: note.trim() };
}

export async function releaseNumber(sid: string) {
  await twilio(`${API()}/IncomingPhoneNumbers/${sid}.json`, "DELETE");
}

// Verify that a webhook request really came from Twilio (X-Twilio-Signature).
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!env.twilioToken || !signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const expected = createHmac("sha1", env.twilioToken).update(Buffer.from(data, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function twiml(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "content-type": "text/xml" },
  });
}

// Settings health check: actually signs in to Twilio and looks up the Messaging Service. Never returns secrets.
export async function twilioCheck(): Promise<{ ok: boolean; detail: string }> {
  const sid = env.twilioSid;
  const mg = env.twilioMessagingService;
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) {
    return { ok: false, detail: `TWILIO_ACCOUNT_SID doesn't look right. It should start with "AC" and be 34 characters (yours starts "${sid.slice(0, 2)}", ${sid.length} characters).` };
  }
  if (useKey() && !/^SK[0-9a-f]{32}$/i.test(env.twilioKeySid)) {
    return { ok: false, detail: `TWILIO_API_KEY_SID should start with "SK" and be 34 characters.` };
  }
  if (!useKey() && !/^[0-9a-f]{32}$/i.test(env.twilioToken)) {
    return { ok: false, detail: `TWILIO_AUTH_TOKEN doesn't look right. It should be 32 letters and numbers (yours is ${env.twilioToken.length} characters). Copy the Auth Token from the Twilio Console home page, not an API key.` };
  }
  let account: any = {};
  try {
    account = await twilio(`${API()}.json`);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    // A Standard API key can send texts but isn't allowed to read the account profile (70004) — that's fine.
    if (!(useKey() && /70004/.test(m))) {
      const how = useKey() ? "API key (TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET)" : "Auth Token";
      return {
        ok: false,
        detail: `Twilio rejected the login (${m}). Signing in with: Account ${sid.slice(0, 6)}…${sid.slice(-4)} + ${how}. Check that these are Live (not Test) credentials from the same Twilio account, and that the account is active.`,
      };
    }
  }
  const acct = account.friendly_name
    ? `Signed in to "${account.friendly_name}"${account.status && account.status !== "active" ? ` (account ${account.status})` : ""}`
    : `Signed in with API key`;
  if (!mg) return { ok: true, detail: `${acct}. Sending from ${env.twilioFrom}.` };
  if (!/^MG[0-9a-f]{32}$/i.test(mg)) {
    return { ok: false, detail: `${acct}, but TWILIO_MESSAGING_SERVICE_SID doesn't look right. It should start with "MG" and be 34 characters.` };
  }
  try {
    const svc: any = await twilio(`https://messaging.twilio.com/v1/Services/${mg}`);
    const nums: any = await twilio(`https://messaging.twilio.com/v1/Services/${mg}/PhoneNumbers?PageSize=50`);
    const list: string[] = (nums.phone_numbers || []).map((p: any) => p.phone_number);
    if (!list.length) {
      return { ok: false, detail: `${acct}. Messaging Service "${svc.friendly_name}" (${mg}) has no phone numbers in its Sender Pool. Add your number there.` };
    }
    return { ok: true, detail: `${acct}. Live texting from "${svc.friendly_name}" (${mg}), sender pool: ${list.join(", ")}` };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: `${acct}, but couldn't open Messaging Service ${mg} (${m}). Check that the SID is from this same Twilio account.` };
  }
}

// Second way to confirm an incoming text is real: look the message up in Twilio by its SID and check it matches.
// Used when the signature check fails (for example, the Auth Token in Vercel is out of date).
export async function confirmInboundWithTwilio(params: Record<string, string>): Promise<boolean> {
  const sid = params.MessageSid || params.SmsSid || "";
  if (!/^(SM|MM)[0-9a-f]{32}$/i.test(sid) || !twilioConfigured()) return false;
  try {
    const m: any = await twilio(`${API()}/Messages/${sid}.json`);
    const digits = (s: string) => String(s || "").replace(/\D/g, "");
    return (
      String(m.direction || "").startsWith("inbound") &&
      digits(m.from) === digits(params.From) &&
      (!params.To || digits(m.to) === digits(params.To))
    );
  } catch (e) {
    console.warn("Couldn't confirm incoming SMS with Twilio:", e instanceof Error ? e.message : e);
    return false;
  }
}
