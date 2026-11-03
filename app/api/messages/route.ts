import { db } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { canRead, canWrite, staffInMySchool } from "@/lib/staff";

export const dynamic = "force-dynamic";

// One family's thread (oldest first). Opening your own thread marks replies as read.
export const GET = withAuth(async (req, me) => {
  const contactId = new URL(req.url).searchParams.get("contactId");
  if (!contactId) return json({ error: "contactId is required" }, 400);
  const supa = db();
  const { data: contact } = await supa.from("contacts").select("id, staff_id").eq("id", contactId).maybeSingle();
  if (!contact || !canRead(me, contact) || !(await staffInMySchool(me, contact.staff_id))) {
    return json({ error: "Conversation not found." }, 404);
  }

  const { data, error } = await supa
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);
  if (canWrite(me, contact) && (data || []).some((m) => m.direction === "inbound" && !m.is_read)) {
    await supa.from("messages").update({ is_read: true }).eq("contact_id", contactId).eq("is_read", false);
  }
  return json({ messages: data || [], readOnly: !canWrite(me, contact) });
});
