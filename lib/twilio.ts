import { createHmac, timingSafeEqual } from "crypto";
import { env, twilioConfigured } from "./config";

const API = () => `https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}`;
const auth = () => "Basic " + Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString("base64");

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
