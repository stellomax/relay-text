import { db, Staff, Contact } from "./db";

// These emails are always admins. More can be added with the ADMIN_EMAILS variable in Vercel (comma-separated).
const BUILT_IN_ADMINS = ["hamilton33@gmail.com"];

export function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS || "").split(",");
  return [...BUILT_IN_ADMINS, ...extra].map((e) => e.trim().toLowerCase()).filter(Boolean);
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
  if (as === "unassigned") return { staffId: null, readOnly: false };
  return { staffId: as, readOnly: true };
}

export function canRead(me: Staff, contact: Pick<Contact, "staff_id">): boolean {
  return me.role === "admin" || contact.staff_id === me.id;
}

// Teachers write only to their own families. Admins also handle the shared main number; other teachers' threads are view-only.
export function canWrite(me: Staff, contact: Pick<Contact, "staff_id">): boolean {
  return contact.staff_id === me.id || (me.role === "admin" && contact.staff_id === null);
}

// Apply a scope to a Supabase query on a table with a staff_id column.
export function scoped<T extends { eq: Function; is: Function }>(q: T, scope: Scope): T {
  return scope.staffId ? q.eq("staff_id", scope.staffId) : q.is("staff_id", null);
}
