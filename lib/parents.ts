import { db, Contact, Staff } from "./db";
import { toE164 } from "./phone";
import { inMySchool, limitToMySchools, schoolLimit } from "./staff";
import { isLanguageCode } from "./languages";

// One parent in the school's Parents list. Admins add, edit and delete them; everyone else chooses from the list.
export type Parent = {
  id: string;
  parent_name: string;
  students: string[];
  phone: string;
  language: string;
  school_id: string | null;
  opted_out: boolean;
  consent_at: string | null;
  consent_source: string | null;
  created_at: string;
  updated_at?: string;
};

const NO_SCHOOL = "00000000-0000-0000-0000-000000000000";

// Teachers see their own school's parents. Admins see their district's schools, and super admins
// every school; both can narrow it to one school (or "none" for parents without a school).
export function parentsQuery(me: Staff, schoolFilter?: string | null) {
  let q = db().from("parents").select("*");
  if (me.role !== "admin") {
    q = me.school_id ? q.eq("school_id", me.school_id) : q.is("school_id", null);
  } else if (schoolLimit(me) !== undefined) {
    q = schoolFilter && schoolFilter !== "none" && inMySchool(me, schoolFilter) ? q.eq("school_id", schoolFilter) : limitToMySchools(q, me);
  } else if (schoolFilter === "none") {
    q = q.is("school_id", null);
  } else if (schoolFilter) {
    q = q.eq("school_id", schoolFilter);
  }
  return q;
}

export function canSeeParent(me: Staff, p: Pick<Parent, "school_id">): boolean {
  return me.role === "admin" ? inMySchool(me, p.school_id) : (p.school_id || null) === (me.school_id || null);
}

// Student names arrive as a list or as text separated by commas, semicolons or "and".
export function cleanStudents(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(/[;,\n]|\s+&\s+|\s+and\s+/i);
  const out: string[] = [];
  for (const s of list) {
    const t = s.trim().replace(/\s+/g, " ").slice(0, 80);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 10);
}

export function cleanParent(body: Record<string, unknown>):
  | { error: string }
  | { row: { parent_name: string; students: string[]; phone: string; language: string } } {
  const parent_name = String(body.parent_name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const phone = toE164(String(body.phone ?? ""));
  const language = String(body.language ?? "").trim();
  if (!parent_name) return { error: "Parent name is required." };
  if (!phone) return { error: "Enter a valid mobile number, like (303) 555-1234." };
  if (!isLanguageCode(language)) return { error: "Choose a language." };
  return { row: { parent_name, students: cleanStudents(body.students), phone, language } };
}

export const studentsText = (p: Pick<Parent, "students">) => (p.students || []).join(", ") || null;

export async function findParentByPhone(schoolId: string | null, phone: string): Promise<Parent | null> {
  let q = db().from("parents").select("*").eq("phone", phone);
  q = schoolId ? q.eq("school_id", schoolId) : q.is("school_id", null);
  const { data } = await q.maybeSingle();
  return (data as Parent) || null;
}

// Keep every conversation with this parent in step with the Parents list.
export async function syncConversations(p: Parent) {
  const fields = { parent_name: p.parent_name, child_name: studentsText(p), language: p.language, opted_out: p.opted_out };
  const { error } = await db().from("contacts").update({ ...fields, phone: p.phone }).eq("parent_id", p.id);
  // A teacher may already have a separate conversation with the new number; then keep the old number there.
  if (error) await db().from("contacts").update(fields).eq("parent_id", p.id);
}

// The conversation between a teacher (or admin) and a parent from the list. Created the first time they text.
export async function conversationFor(staffId: string, p: Parent): Promise<Contact> {
  const supa = db();
  const fields = {
    parent_id: p.id,
    parent_name: p.parent_name,
    child_name: studentsText(p),
    language: p.language,
    opted_out: p.opted_out,
    consent_at: p.consent_at,
    consent_source: p.consent_source,
  };
  const { data: existing } = await supa.from("contacts").select("*").eq("staff_id", staffId).eq("phone", p.phone).maybeSingle();
  if (existing) {
    const c = existing as Contact & { parent_id?: string | null };
    if (c.parent_id !== p.id || c.parent_name !== p.parent_name || c.language !== p.language || (!c.consent_at && p.consent_at)) {
      const { data } = await supa
        .from("contacts")
        .update({ ...fields, consent_at: c.consent_at || p.consent_at, consent_source: c.consent_source || p.consent_source })
        .eq("id", c.id)
        .select("*")
        .single();
      return (data as Contact) || c;
    }
    return c;
  }
  const { data, error } = await supa
    .from("contacts")
    .insert({ ...fields, phone: p.phone, staff_id: staffId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export const schoolKey = (id: string | null | undefined) => id || NO_SCHOOL;
