import { db, Contact, Message, Staff } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { resolveScope, scoped } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Inbox: every family in this inbox with their latest message and unread count. Unread threads first.
// Admins can look at another teacher's inbox (?as=<staff id>) or the shared main number (?as=unassigned).
export const GET = withAuth(async (req, me) => {
  const supa = db();
  const scope = resolveScope(req, me);
  const [{ data: contacts, error: e1 }, { data: messages, error: e2 }] = await Promise.all([
    scoped(supa.from("contacts").select("*"), scope),
    scoped(
      supa
        .from("messages")
        .select("id, contact_id, direction, body_en, is_read, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5000),
      scope
    ),
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

  // For the admin inbox picker.
  let inboxes: { id: string; label: string; sub?: string }[] | undefined;
  if (me.role === "admin") {
    const { data: staff } = await supa.from("staff").select("id, name, school, status").order("name");
    inboxes = [
      { id: me.id, label: "My Messages" },
      ...((staff || []) as Pick<Staff, "id" | "name" | "school" | "status">[])
        .filter((s) => s.id !== me.id && s.status !== "pending")
        .map((s) => ({ id: s.id, label: s.name, sub: s.school || undefined })),
      { id: "unassigned", label: "Main number (no teacher)" },
    ];
  }

  return json({
    conversations: rows,
    scope: { staffId: scope.staffId, readOnly: scope.readOnly },
    inboxes,
  });
});
