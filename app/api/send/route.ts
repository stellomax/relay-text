import { db, Contact } from "@/lib/db";
import { baseUrlFromRequest } from "@/lib/config";
import { json, withAuth } from "@/lib/http";
import { sendToContacts } from "@/lib/messaging";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Send one English message to one parent, several parents, or a saved list (fans out).
export const POST = withAuth(async (req, session) => {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!text) return json({ error: "Write a message first." }, 400);
  if (text.length > 1000) return json({ error: "Keep messages under 1,000 characters." }, 400);

  const ids = new Set<string>(Array.isArray(body.contactIds) ? body.contactIds : []);
  const listId: string | null = body.listId || null;
  if (listId) {
    const { data, error } = await db().from("list_members").select("contact_id").eq("list_id", listId);
    if (error) throw new Error(error.message);
    (data || []).forEach((m) => ids.add(m.contact_id));
  }
  if (!ids.size) return json({ error: "Choose at least one recipient." }, 400);

  const { data: contacts, error } = await db().from("contacts").select("*").in("id", Array.from(ids));
  if (error) throw new Error(error.message);

  const summary = await sendToContacts((contacts || []) as Contact[], text, {
    statusCallback: `${baseUrlFromRequest(req)}/api/sms/status`,
    listId,
    sentBy: session.email,
  });
  return json({ summary });
});
