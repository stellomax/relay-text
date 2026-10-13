import { createHmac, timingSafeEqual } from "crypto";
import { env, twilioConfigured } from "./config";

// Send one SMS through Twilio's REST API.
export async function sendSms(to: string, body: string, statusCallback?: string) {
  if (!twilioConfigured()) throw new Error("Twilio is not configured.");
  const form = new URLSearchParams({ To: to, Body: body });
  if (env.twilioMessagingService) form.set("MessagingServiceSid", env.twilioMessagingService);
  else form.set("From", env.twilioFrom);
  if (statusCallback) form.set("StatusCallback", statusCallback);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(`Twilio error${data?.code ? ` ${data.code}` : ""}: ${msg}`);
  }
  return { sid: data.sid as string, status: (data.status as string) || "queued" };
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
