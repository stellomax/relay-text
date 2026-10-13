import { db } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { receiveInbound } from "@/lib/messaging";

export const dynamic = "force-dynamic";

// Demo helper: pretend the parent texted back. Runs the same translation path as a real reply.
export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!body.contactId || !text) return json({ error: "Type the parent's reply first." }, 400);
  const { data: contact, error } = await db().from("contacts").select("phone").eq("id", body.contactId).single();
  if (error || !contact) return json({ error: "Contact not found." }, 404);
  await receiveInbound({ from: contact.phone, body: text, simulated: true });
  return json({ ok: true });
});
