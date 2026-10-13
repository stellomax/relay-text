import { db } from "@/lib/db";
import { json, withAuth } from "@/lib/http";

export const dynamic = "force-dynamic";

// One parent's thread (oldest first). Opening it marks their replies as read.
export const GET = withAuth(async (req) => {
  const contactId = new URL(req.url).searchParams.get("contactId");
  if (!contactId) return json({ error: "contactId is required" }, 400);
  const supa = db();
  const { data, error } = await supa
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);
  if ((data || []).some((m) => m.direction === "inbound" && !m.is_read)) {
    await supa.from("messages").update({ is_read: true }).eq("contact_id", contactId).eq("is_read", false);
  }
  return json({ messages: data || [] });
});
