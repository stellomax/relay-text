import { allRows, db, type Contact } from "@/lib/db";
import { json, withAdmin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { exportCsv } from "@/lib/export";
import { canRead, inMySchool, staffInMySchool } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Admins: download message history as CSV.
//   ?contact=<id>            one conversation
//   ?school=<id>[&from&to]   every conversation of that school's teachers (school admins: their own school only)
export const GET = withAdmin(async (req, me) => {
  const url = new URL(req.url);
  const supa = db();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  let contacts: Contact[] = [];
  let label = "";
  let schoolId: string | null = null;

  const contactId = url.searchParams.get("contact");
  const school = url.searchParams.get("school");
  if (contactId) {
    const { data } = await supa.from("contacts").select("*").eq("id", contactId).maybeSingle();
    const c = data as Contact | null;
    if (!c || !canRead(me, c) || !(await staffInMySchool(me, c.staff_id))) return json({ error: "Conversation not found." }, 404);
    contacts = [c];
    label = c.parent_name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "conversation";
  } else if (school) {
    if (!inMySchool(me, school)) return json({ error: "School not found." }, 404);
    const { data: s } = await supa.from("schools").select("id, name").eq("id", school).maybeSingle();
    if (!s) return json({ error: "School not found." }, 404);
    schoolId = s.id as string;
    const { data: staff } = await supa.from("staff").select("id").eq("school_id", schoolId);
    const ids = (staff || []).map((x) => x.id as string);
    for (let i = 0; i < ids.length; i += 200) {
      contacts.push(
        ...(await allRows<Contact>((a, b) => supa.from("contacts").select("*").in("staff_id", ids.slice(i, i + 200)).order("id").range(a, b))),
      );
    }
    label = String(s.name).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "school";
  } else {
    return json({ error: "Choose a conversation or a school." }, 400);
  }

  const { csv, messages } = await exportCsv(contacts, from, to);
  await logAudit(me, {
    action: contactId ? "export.conversation" : "export.school",
    targetType: contactId ? "contact" : "school",
    targetId: contactId || schoolId,
    targetLabel: contactId ? contacts[0]?.parent_name : label.replace(/-/g, " "),
    schoolId: contactId ? undefined : schoolId,
    detail: { messages, conversations: contacts.length, from, to },
  });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="relay-messages-${label}-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
});
