import { baseUrlFromRequest } from "@/lib/config";
import { receiveInbound } from "@/lib/messaging";
import { twiml, validTwilioSignature } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// Twilio calls this when a parent texts any Relay Text number. The "To" number tells us which teacher it's for.
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
    await receiveInbound({ from: params.From, to: params.To || null, body: params.Body || "", twilioSid: params.MessageSid });
  } catch (e) {
    console.error("Failed to store incoming SMS", e);
    return new Response("Error", { status: 500 });
  }
  return twiml();
}
