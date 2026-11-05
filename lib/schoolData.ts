import { allRows, db, type Staff } from "./db";
import { unassignNumber } from "./numbers";
import { authClient, findAuthUserId } from "./supabaseAuth";
import { isBuiltInAdmin, isSuperAdmin } from "./staff";

// Delete everything Relay holds for one school, e.g. when a school or district asks or its contract ends
// (see /student-data). Super admins (and the person running it) keep their accounts; only their
// conversations with this school's parents are removed.

const CHUNK = 200;
const chunks = <T,>(a: T[]) => Array.from({ length: Math.ceil(a.length / CHUNK) }, (_, i) => a.slice(i * CHUNK, (i + 1) * CHUNK));

type Plan = {
  school: { id: string; name: string };
  removeStaff: Staff[];
  keepStaff: Staff[];
  parentIds: string[];
  contactIds: string[];
  messages: number;
  groups: number;
};

async function plan(schoolId: string, me: Staff): Promise<Plan> {
  const supa = db();
  const { data: school } = await supa.from("schools").select("id, name").eq("id", schoolId).maybeSingle();
  if (!school) throw new Error("School not found.");

  const { data: staffRows, error: sErr } = await supa.from("staff").select("*").eq("school_id", schoolId);
  if (sErr) throw new Error(sErr.message);
  const staff = (staffRows || []) as Staff[];
  const keep = (s: Staff) => s.id === me.id || isSuperAdmin(s.email) || isBuiltInAdmin(s.email);
  const removeStaff = staff.filter((s) => !keep(s));
  const keepStaff = staff.filter(keep);

  const parents = await allRows<{ id: string; phone: string }>((a, b) =>
    supa.from("parents").select("id, phone").eq("school_id", schoolId).order("id").range(a, b),
  );
  const parentIds = parents.map((p) => p.id);
  const phones = [...new Set(parents.map((p) => p.phone))];

  // Conversations to delete: every conversation of a teacher being removed, plus any conversation
  // (main number, or a kept admin's) with one of this school's parents.
  const ids = new Set<string>();
  const add = (rows: { id: string }[] | null) => (rows || []).forEach((r) => ids.add(r.id));
  for (const part of chunks(removeStaff.map((s) => s.id))) {
    const rows = await allRows<{ id: string }>((a, b) => supa.from("contacts").select("id").in("staff_id", part).order("id").range(a, b));
    add(rows);
  }
  for (const part of chunks(parentIds)) {
    const rows = await allRows<{ id: string }>((a, b) => supa.from("contacts").select("id").in("parent_id", part).order("id").range(a, b));
    add(rows);
  }
  // Main-number conversations that never got linked to the list (e.g. "Unknown +1…") but are this school's parents.
  for (const part of chunks(phones)) {
    const rows = await allRows<{ id: string }>((a, b) =>
      supa.from("contacts").select("id").is("staff_id", null).in("phone", part).order("id").range(a, b),
    );
    add(rows);
  }
  const contactIds = [...ids];

  let messages = 0;
  for (const part of chunks(contactIds)) {
    const { count } = await supa.from("messages").select("id", { count: "exact", head: true }).in("contact_id", part);
    messages += count ?? 0;
  }
  let groups = 0;
  for (const part of chunks(removeStaff.map((s) => s.id))) {
    const { count } = await supa.from("parent_groups").select("id", { count: "exact", head: true }).in("staff_id", part);
    groups += count ?? 0;
  }

  return { school, removeStaff, keepStaff, parentIds, contactIds, messages, groups };
}

export type SchoolDataSummary = {
  school: string;
  teachers: number;
  parents: number;
  conversations: number;
  messages: number;
  groups: number;
  keptAccounts: string[];
};

const summarize = (p: Plan): SchoolDataSummary => ({
  school: p.school.name,
  teachers: p.removeStaff.length,
  parents: p.parentIds.length,
  conversations: p.contactIds.length,
  messages: p.messages,
  groups: p.groups,
  keptAccounts: p.keepStaff.map((s) => s.email),
});

// What would be deleted (shown before the person confirms).
export async function previewSchoolData(schoolId: string, me: Staff) {
  return summarize(await plan(schoolId, me));
}

// Permanently delete it. Returns what was deleted and whether the school itself was removed.
export async function deleteSchoolData(schoolId: string, me: Staff) {
  const p = await plan(schoolId, me);
  const supa = db();
  const fail = (step: string, e: { message: string } | null) => {
    if (e) throw new Error(`${step}: ${e.message}`);
  };

  // 1. Conversations (their messages are deleted with them).
  for (const part of chunks(p.contactIds)) fail("conversations", (await supa.from("contacts").delete().in("id", part)).error);

  // 2. The school's Parents list (group memberships go with it).
  fail("parents", (await supa.from("parents").delete().eq("school_id", schoolId)).error);

  // 3. Teachers: give up their Twilio numbers, delete their logins and accounts (their groups go with them).
  for (const s of p.removeStaff) {
    await unassignNumber(s).catch((e) => console.error("release number", s.email, e));
    fail("teachers", (await supa.from("staff").delete().eq("id", s.id)).error);
    const uid = s.user_id || (await findAuthUserId(s.email).catch(() => null));
    if (uid) await authClient().auth.admin.deleteUser(uid).catch((e: unknown) => console.error("delete login", s.email, e));
  }

  // 4. Unused sign-up codes for this school.
  fail("sign-up codes", (await supa.from("invites").delete().eq("school_id", schoolId)).error);

  // 5. The school itself, unless a kept admin account still belongs to it.
  let schoolDeleted = false;
  if (!p.keepStaff.length) {
    fail("school", (await supa.from("schools").delete().eq("id", schoolId)).error);
    schoolDeleted = true;
  }

  const summary = summarize(p);
  console.log("School data deleted", JSON.stringify({ ...summary, by: me.email, at: new Date().toISOString(), schoolDeleted }));
  return { ...summary, schoolDeleted, deletedAt: new Date().toISOString() };
}
