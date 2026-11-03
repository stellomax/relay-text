import { db, Contact, Staff } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { canWrite, resolveScope, scoped, staffInMySchool } from "@/lib/staff";

export const dynamic = "force-dynamic";

async function duplicate(staffId: string | null, phone: string, exceptId?: string) {
  let q = db().from("contacts").select("id").eq("phone", phone);
  q = staffId ? q.eq("staff_id", staffId) : q.is("staff_id", null);
  const { data } = await q;
  return (data || []).some((r) => r.id !== exceptId);
}

async function load(id: string): Promise<Contact | null> {
  const { data } = await db().from("contacts").select("*").eq("id", id).maybeSingle();
  return (data as Contact) || null;
}

export const GET = withAuth(async (req, me) => {
  const scope = resolveScope(req, me);
  if (scope.readOnly && !(await staffInMySchool(me, scope.staffId))) return json({ contacts: [] });
  const { data, error } = await scoped(db().from("contacts").select("*"), scope).order("parent_name");
  if (error) throw new Error(error.message);
  return json({ contacts: data || [] });
});

// Teachers can't add numbers: everyone texts parents from the Parents list, which admins keep.
export const POST = withAuth(async () =>
  json({ error: "New parents are added by an admin on the Parents list. Choose a parent from the list to text them." }, 403)
);

// Conversation details come from the Parents list (edited by admins there). The one change here: admins can move a conversation.
export const PATCH = withAuth(async (req, me) => {
  const body = await req.json().catch(() => ({}));
  if (body.action === "move") return move(me, body);
  return json({ error: "Parent details are edited by an admin on the Parents list." }, 403);
});

// Admins: move a family (and their whole conversation) to a teacher, or back to the main number.
async function move(me: Staff, body: Record<string, unknown>) {
  if (me.role !== "admin") return json({ error: "Only admins can move families between teachers." }, 403);
  const existing = body.id ? await load(String(body.id)) : null;
  if (!existing || !(await staffInMySchool(me, existing.staff_id))) return json({ error: "Family not found." }, 404);
  const target = body.staff_id ? String(body.staff_id) : null;
  if (target === existing.staff_id) return json({ contact: existing });
  if (target) {
    const { data: t } = await db().from("staff").select("id, status").eq("id", target).maybeSingle();
    if (!t || t.status !== "active") return json({ error: "That teacher's account isn't active." }, 400);
    if (!(await staffInMySchool(me, target))) return json({ error: "You can only move families to teachers in your school." }, 403);
  }
  if (await duplicate(target, existing.phone, existing.id)) {
    return json({ error: "That teacher already has a family with this phone number." }, 400);
  }
  const { data, error } = await db().from("contacts").update({ staff_id: target }).eq("id", existing.id).select("*").single();
  if (error) return json({ error: error.message }, 400);
  await db().from("messages").update({ staff_id: target }).eq("contact_id", existing.id);
  return json({ contact: data });
}

export const DELETE = withAuth(async (req, me) => {
  const id = new URL(req.url).searchParams.get("id");
  const existing = id ? await load(id) : null;
  if (!existing || !canWrite(me, existing)) return json({ error: "Family not found." }, 404);
  const { error } = await db().from("contacts").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
