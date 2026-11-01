import { db, Contact } from "@/lib/db";
import { baseUrlFromRequest } from "@/lib/config";
import { json, withAuth } from "@/lib/http";
import { sendToContacts } from "@/lib/messaging";
import { canWrite } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Send one English message to one or more of your families (each gets a separate private text from your number).
export const POST = withAuth(async (req, me) => {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!text) return json({ error: "Write a message first." }, 400);
  if (text.length > 1000) return json({ error: "Keep messages under 1,000 characters." }, 400);

  const ids: string[] = Array.isArray(body.contactIds) ? body.contactIds.map(String) : [];
  if (!ids.length) return json({ error: "Choose at least one recipient." }, 400);
  if (ids.length > 500) return json({ error: "You can message up to 500 families at a time." }, 400);

  const { data, error } = await db().from("contacts").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  const contacts = ((data || []) as Contact[]).filter((c) => canWrite(me, c));
  if (!contacts.length) return json({ error: "You can only text families in your own inbox." }, 403);

  const summary = await sendToContacts(contacts, text, {
    statusCallback: `${baseUrlFromRequest(req)}/api/sms/status`,
    sentBy: me.email,
  });
  return json({ summary });
});
