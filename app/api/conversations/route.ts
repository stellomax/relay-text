import { db, Contact, Message } from "@/lib/db";
import { json, withAuth } from "@/lib/http";

export const dynamic = "force-dynamic";

// Inbox: every contact with their latest message and unread count. Unread threads first.
export const GET = withAuth(async () => {
  const supa = db();
  const [{ data: contacts, error: e1 }, { data: messages, error: e2 }] = await Promise.all([
    supa.from("contacts").select("*"),
    supa
      .from("messages")
      .select("id, contact_id, direction, body_en, is_read, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (e1 || e2) throw new Error((e1 || e2)!.message);

  const last = new Map<string, Partial<Message>>();
  const unread = new Map<string, number>();
  for (const m of (messages || []) as Message[]) {
    if (!last.has(m.contact_id)) last.set(m.contact_id, m);
    if (m.direction === "inbound" && !m.is_read) unread.set(m.contact_id, (unread.get(m.contact_id) || 0) + 1);
  }

  const rows = ((contacts || []) as Contact[]).map((c) => ({
    contact: c,
    last: last.get(c.id) || null,
    unread: unread.get(c.id) || 0,
  }));
  rows.sort((a, b) => {
    if (!!b.unread !== !!a.unread) return b.unread ? 1 : -1;
    const ta = a.last?.created_at || "";
    const tb = b.last?.created_at || "";
    if (ta !== tb) return tb.localeCompare(ta);
    return a.contact.parent_name.localeCompare(b.contact.parent_name);
  });
  return json({ conversations: rows });
});
