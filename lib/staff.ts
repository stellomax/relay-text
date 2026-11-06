import { db, Staff, Contact } from "./db";

// These emails are always admins. More can be added with the ADMIN_EMAILS variable in Vercel (comma-separated).
const BUILT_IN_ADMINS = ["hamilton33@gmail.com"];

export function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS || "").split(",");
  return [...BUILT_IN_ADMINS, ...extra].map((e) => e.trim().toLowerCase()).filter(Boolean);
}

// Super admins can also create and manage schools and their sign-up codes.
// Built-in admins are super admins; add more with SUPER_ADMIN_EMAILS in Vercel (comma-separated).
export function isSuperAdmin(email: string): boolean {
  const list = [...BUILT_IN_ADMINS, ...(process.env.SUPER_ADMIN_EMAILS || "").split(",")]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

// Which schools someone may manage. Super admins see every school (undefined = no limit).
// Admins oversee their school district: every school in the district of their own school
// (worked out once per request by loadDistrictScope). Teachers are limited to their own school.
// An empty list means "no school" (only rows without a school).
export const NO_SCHOOL_ID = "00000000-0000-0000-0000-000000000000";
export function schoolLimit(me: Staff): string[] | undefined {
  if (isSuperAdmin(me.email)) return undefined;
  if (me.role === "admin" && me.scope_school_ids) return me.scope_school_ids;
  return me.school_id ? [me.school_id] : [];
}
export function inMySchool(me: Staff, schoolId: string | null | undefined): boolean {
  const lim = schoolLimit(me);
  if (lim === undefined) return true;
  return lim.length ? !!schoolId && lim.includes(schoolId) : !schoolId;
}
// Limit a Supabase query on a table with a school_id column to the schools someone may see.
export function limitToMySchools<T extends { in: Function; is: Function }>(q: T, me: Staff): T {
  const lim = schoolLimit(me);
  if (lim === undefined) return q;
  return lim.length ? q.in("school_id", lim) : q.is("school_id", null);
}

// For a signed-in admin: find their school's district and every school in it.
// Before the districts table exists (schema.sql not run), they keep just their own school.
export async function loadDistrictScope(me: Staff): Promise<Staff> {
  if (me.role !== "admin" || isSuperAdmin(me.email) || !me.school_id) return me;
  const supa = db();
  const { data: mine, error } = await supa.from("schools").select("id, district, district_id").eq("id", me.school_id).maybeSingle();
  if (error || !mine) return me;
  me.district_name = (mine.district || "").trim() || null;
  if (!mine.district_id) {
    me.scope_school_ids = [me.school_id];
    return me;
  }
  me.district_id = mine.district_id;
  const [{ data: list }, { data: d }] = await Promise.all([
    supa.from("schools").select("id").eq("district_id", mine.district_id),
    supa.from("districts").select("name").eq("id", mine.district_id).maybeSingle(),
  ]);
  const ids = (list || []).map((r: { id: string }) => r.id);
  if (!ids.includes(me.school_id)) ids.push(me.school_id);
  me.scope_school_ids = ids;
  if (d?.name) me.district_name = d.name;
  return me;
}

// Is this teacher in one of the admin's schools? (Always true for super admins.)
export async function staffInMySchool(me: Staff, staffId: string | null): Promise<boolean> {
  if (!staffId) return isSuperAdmin(me.email); // the shared main number: super admins only (it mixes every school)
  if (schoolLimit(me) === undefined || staffId === me.id) return true;
  const s = await staffById(staffId);
  return !!s && inMySchool(me, s.school_id);
}

export function isBuiltInAdmin(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function staffByEmail(email: string): Promise<Staff | null> {
  const { data, error } = await db().from("staff").select("*").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Staff) || null;
}

export async function staffById(id: string): Promise<Staff | null> {
  const { data } = await db().from("staff").select("*").eq("id", id).maybeSingle();
  return (data as Staff) || null;
}

// Short, unambiguous code for a teacher's parent sign-up link (relaytext.io/join?t=CODE).
export function newJoinCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function tempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function cleanAreaCode(v: unknown): string | null {
  const d = String(v || "").replace(/\D/g, "");
  return /^[2-9]\d{2}$/.test(d) ? d : null;
}

// What a request is looking at: a teacher's own inbox, another teacher's (admins only), or the shared main number.
export type Scope = { staffId: string | null; readOnly: boolean };

export function resolveScope(req: Request, me: Staff): Scope {
  const as = new URL(req.url).searchParams.get("as");
  if (!as || as === me.id || me.role !== "admin") return { staffId: me.id, readOnly: false };
  if (as === "unassigned") return isSuperAdmin(me.email) ? { staffId: null, readOnly: false } : { staffId: me.id, readOnly: false };
  return { staffId: as, readOnly: true };
}

export function canRead(me: Staff, contact: Pick<Contact, "staff_id">): boolean {
  if (contact.staff_id === null) return me.role === "admin" && isSuperAdmin(me.email);
  return me.role === "admin" || contact.staff_id === me.id;
}

// Teachers write only to their own families. Admins also handle the shared main number; other teachers' threads are view-only.
export function canWrite(me: Staff, contact: Pick<Contact, "staff_id">): boolean {
  return contact.staff_id === me.id || (me.role === "admin" && contact.staff_id === null && isSuperAdmin(me.email));
}

// Apply a scope to a Supabase query on a table with a staff_id column.
export function scoped<T extends { eq: Function; is: Function }>(q: T, scope: Scope): T {
  return scope.staffId ? q.eq("staff_id", scope.staffId) : q.is("staff_id", null);
}

// Sign someone out everywhere: every existing session cookie for them stops working. Returns the new version.
export async function endAllSessions(staff: Pick<Staff, "id" | "session_version">): Promise<number> {
  const next = (staff.session_version ?? 0) + 1;
  const { error } = await db().from("staff").update({ session_version: next }).eq("id", staff.id);
  if (error) {
    console.error("end sessions", error.message); // column missing until schema.sql is run
    return staff.session_version ?? 0;
  }
  return next;
}
