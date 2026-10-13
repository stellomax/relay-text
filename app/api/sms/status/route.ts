import { baseUrlFromRequest } from "@/lib/config";
import { db } from "@/lib/db";
import { validTwilioSignature } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// Twilio calls this as a sent text moves through queued → sent → delivered (or failed).
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const url = `${baseUrlFromRequest(req)}/api/sms/status`;
  if (!validTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) {
    return new Response("Invalid signature", { status: 403 });
  }

  if (params.MessageSid && params.MessageStatus) {
    const update: Record<string, string> = { status: params.MessageStatus };
    if (params.ErrorCode) update.error = `Twilio error ${params.ErrorCode}`;
    await db().from("messages").update(update).eq("twilio_sid", params.MessageSid);
  }
  return new Response(null, { status: 204 });
}
