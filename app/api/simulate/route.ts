import { db, Contact, Staff } from "@/lib/db";
import { env, twilioConfigured } from "@/lib/config";
import { json, withAuth } from "@/lib/http";
import { receiveInbound } from "@/lib/messaging";
import { canWrite } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Demo helper: pretend the parent texted back. Runs the same translation path as a real reply.
export const POST = withAuth(async (req, me) => {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!body.contactId || !text) return json({ error: "Type the parent's reply first." }, 400);
  const { data } = await db().from("contacts").select("*").eq("id", body.contactId).maybeSingle();
  const contact = data as Contact | null;
  if (!contact || !canWrite(me, contact)) return json({ error: "Family not found." }, 404);
  // Once real texting is on, fake replies are only allowed on demo data, so nobody can make up a parent's reply.
  if (twilioConfigured() && !(contact as Contact & { demo?: boolean }).demo) {
    return json({ error: "Simulated replies only work on demo data now that real texting is on." }, 403);
  }
  let to = env.twilioFrom || null;
  if (contact.staff_id) {
    const { data: s } = await db().from("staff").select("phone_number").eq("id", contact.staff_id).maybeSingle();
    to = (s as Pick<Staff, "phone_number"> | null)?.phone_number || to;
  }
  await receiveInbound({ from: contact.phone, to, body: text, simulated: true, contact });
  return json({ ok: true });
});
