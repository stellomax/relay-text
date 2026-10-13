import { baseUrlFromRequest } from "@/lib/config";
import { receiveInbound } from "@/lib/messaging";
import { twiml, validTwilioSignature } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// Twilio calls this when a parent texts the school number.
// In Twilio: Phone Numbers → your number → Messaging → "A message comes in" → Webhook → this URL (HTTP POST).
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const url = `${baseUrlFromRequest(req)}/api/sms/incoming`;
  if (!validTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) {
    console.warn("Rejected incoming SMS: bad Twilio signature for", url);
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    await receiveInbound({ from: params.From, body: params.Body || "", twilioSid: params.MessageSid });
  } catch (e) {
    console.error("Failed to store incoming SMS", e);
    return new Response("Error", { status: 500 }); // Twilio will log the failure
  }
  return twiml();
}
