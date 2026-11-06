import { allRows, db, Staff } from "@/lib/db";
import { json, withAdmin, withAuth } from "@/lib/http";
import { withAudit } from "@/lib/audit";
import { canSeeParent, cleanParent, findParentByPhone, parentsQuery, schoolKey, syncConversations, type Parent } from "@/lib/parents";
import { inMySchool, limitToMySchools, schoolLimit } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Parents list. Everyone signed in can read their school's list (to choose recipients);
// only admins can add, edit, upload or delete.
export const GET = withAuth(async (req, me) => {
  const school = new URL(req.url).searchParams.get("school");
  let data: Parent[] = [];
  let error: { message: string } | null = null as { message: string } | null;
  try {
    data = await allRows<Parent>((a, b) => parentsQuery(me, school).order("parent_name").order("id").range(a, b));
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) };
  }
  if (error) {
    if (/parents/.test(error.message) && /exist|relation|schema cache/i.test(error.message)) {
      return json({ error: "The Parents list needs a database update: run the latest supabase/schema.sql in Supabase." }, 500);
    }
    throw new Error(error.message);
  }
  let schools: { id: string; name: string; district?: string | null }[] | undefined;
  if (me.role === "admin") {
    const { data: s } = await db().from("schools").select("id, name, district").order("name");
    const lim = schoolLimit(me);
    schools = (s || []).filter((x) => lim === undefined || lim.includes(x.id)); // admins: the schools in their district
  }
  return json({ parents: data || [], schools, mySchoolId: me.school_id || null, canManage: me.role === "admin", viewerIsSuper: me.role === "admin" && schoolLimit(me) === undefined });
});

async function schoolFor(me: Staff, raw: unknown): Promise<string | null> {
  if (raw === undefined) return me.school_id || null;
  const id = raw ? String(raw) : null;
  // Admins: a school in their district (their own school if the one asked for isn't).
  if (schoolLimit(me) !== undefined) return inMySchool(me, id) ? id : me.school_id || null;
  if (!id) return null;
  const { data } = await db().from("schools").select("id").eq("id", id).maybeSingle();
  if (!data) throw new Error("That school wasn't found.");
  return id;
}

const consentNote = (me: Staff, how: string) => `confirmed by ${me.email} (${how})`;

// Add one parent, or upload a whole list ({ action: "import", rows: [...] }).
export const POST = withAdmin(withAudit(addParents, (b) =>
  b.action === "import"
    ? { action: "parents.import", targetType: "parent", detail: { rows: Array.isArray(b.rows) ? b.rows.length : 0 } }
    : { action: "parents.add", targetType: "parent", targetLabel: String(b.parent_name || "") || null },
));

async function addParents(req: Request, me: Staff): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  if (body.action === "import") return importRows(me, body);
  const c = cleanParent(body);
  if ("error" in c) return json({ error: c.error }, 400);
  if (body.consent !== true) {
    return json({ error: "Please confirm this parent gave their number to the school and agreed to receive texts." }, 400);
  }
  const school_id = await schoolFor(me, body.school_id);
  if (await findParentByPhone(school_id, c.row.phone)) {
    return json({ error: "A parent with this phone number is already on the list." }, 400);
  }
  const { data, error } = await db()
    .from("parents")
    .insert({ ...c.row, school_id, created_by: me.id, consent_at: new Date().toISOString(), consent_source: consentNote(me, "added by hand") })
    .select("*")
    .single();
  if (error) return json({ error: /duplicate/.test(error.message) ? "A parent with this phone number is already on the list." : error.message }, 400);
  return json({ parent: data });
}

// CSV upload: new phone numbers are added; numbers already on the list are updated.
async function importRows(me: Staff, body: Record<string, unknown>) {
  if (body.consent !== true) {
    return json({ error: "Please confirm these parents gave their numbers to the school and agreed to receive texts." }, 400);
  }
  const rows = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
  if (!rows.length) return json({ error: "The file has no parents to add." }, 400);
  if (rows.length > 5000) return json({ error: "Upload up to 5,000 parents at a time." }, 400);
  const school_id = await schoolFor(me, body.school_id);

  const problems: { row: number; error: string }[] = [];
  const byPhone = new Map<string, { parent_name: string; students: string[]; phone: string; language: string }>();
  rows.forEach((r, i) => {
    const c = cleanParent(r);
    if ("error" in c) problems.push({ row: Number(r.row) || i + 2, error: c.error });
    else {
      // The same number twice in one file: keep one entry and combine the students.
      const prev = byPhone.get(c.row.phone);
      if (!prev) {
        byPhone.set(c.row.phone, c.row);
      } else {
        for (const st of c.row.students) {
          if (!prev.students.some((x) => x.toLowerCase() === st.toLowerCase())) prev.students.push(st);
        }
      }
    }
  });

  const supa = db();
  const existing: Parent[] = [];
  const phones = [...byPhone.keys()];
  for (let i = 0; i < phones.length; i += 200) {
    let q = supa.from("parents").select("*").in("phone", phones.slice(i, i + 200));
    q = school_id ? q.eq("school_id", school_id) : q.is("school_id", null);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    existing.push(...((data || []) as Parent[]));
  }
  const have = new Map(existing.map((p) => [p.phone, p]));

  const now = new Date().toISOString();
  const consent_source = consentNote(me, "spreadsheet upload");
  const inserts = [];
  const updates: Parent[] = [];
  for (const row of byPhone.values()) {
    const old = have.get(row.phone);
    if (old) {
      // Already on the list: take the new name and language, and add any new students (a parent may appear
      // in several uploads, e.g. one per class, with a different child each time).
      const students = [...old.students];
      for (const st of row.students) if (!students.some((x) => x.toLowerCase() === st.toLowerCase())) students.push(st);
      updates.push({ ...old, ...row, students, consent_at: old.consent_at || now, consent_source: old.consent_source || consent_source });
    } else {
      inserts.push({ ...row, school_id, created_by: me.id, consent_at: now, consent_source });
    }
  }
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supa.from("parents").insert(inserts.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  for (const u of updates) {
    const { error } = await supa
      .from("parents")
      .update({ parent_name: u.parent_name, students: u.students, language: u.language, consent_at: u.consent_at, consent_source: u.consent_source, updated_at: now })
      .eq("id", u.id);
    if (error) problems.push({ row: 0, error: `${u.parent_name}: ${error.message}` });
    else await syncConversations(u);
  }
  return json({ added: inserts.length, updated: updates.length, problems, school: schoolKey(school_id) });
}

export const PATCH = withAdmin(withAudit(editParent, async (b) => {
  const { data: p } = await db().from("parents").select("parent_name, school_id").eq("id", String(b.id || "")).maybeSingle();
  return p ? { action: "parents.edit", targetType: "parent", targetId: String(b.id), targetLabel: p.parent_name, schoolId: p.school_id } : null;
}));

async function editParent(req: Request, me: Staff): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { data: found } = await db().from("parents").select("*").eq("id", String(body.id || "")).maybeSingle();
  const existing = found as Parent | null;
  if (!existing || !canSeeParent(me, existing)) return json({ error: "Parent not found." }, 404);
  const c = cleanParent(body);
  if ("error" in c) return json({ error: c.error }, 400);
  const school_id = body.school_id === undefined ? existing.school_id : await schoolFor(me, body.school_id);
  const dupe = await findParentByPhone(school_id, c.row.phone);
  if (dupe && dupe.id !== existing.id) return json({ error: "Another parent on the list already has this phone number." }, 400);
  const update: Record<string, unknown> = { ...c.row, school_id, updated_at: new Date().toISOString() };
  if (body.consent === true && !existing.consent_at) {
    update.consent_at = new Date().toISOString();
    update.consent_source = consentNote(me, "parent gave number to school");
  }
  const { data, error } = await db().from("parents").update(update).eq("id", existing.id).select("*").single();
  if (error) return json({ error: error.message }, 400);
  await syncConversations(data as Parent);
  return json({ parent: data });
}

// Delete one or more parents ({ ids: [...] }). Past conversations stay in Messages.
export const DELETE = withAdmin(withAudit(deleteParents, (b) => ({
  action: "parents.delete",
  targetType: "parent",
  detail: { requested: Array.isArray(b.ids) ? b.ids.length : 0 },
})));

async function deleteParents(req: Request, me: Staff): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const ids: string[] = (Array.isArray(body.ids) ? body.ids : []).map(String).filter(Boolean).slice(0, 10000);
  if (!ids.length) return json({ error: "Choose at least one parent." }, 400);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 200) {
    let q = db().from("parents").delete({ count: "exact" }).in("id", ids.slice(i, i + 200));
    q = limitToMySchools(q, me); // admins: only their district's parents
    const { error, count } = await q;
    if (error) throw new Error(error.message);
    deleted += count || 0;
  }
  return json({ ok: true, deleted });
}
