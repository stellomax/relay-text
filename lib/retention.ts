import { allRows, db } from "./db";
import { logAudit } from "./audit";

// Delete messages older than each school's retention period (schools.retention_months, default 24; 0 = keep).
// Conversations left with no messages are removed, except for parents who replied STOP: for them we keep only
// the phone number and the opt-out (no name), so Relay never texts them again.

export const DEFAULT_RETENTION_MONTHS = 24;
const CHUNK = 200;

function cutoff(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

async function purge(contactIds: string[], before: string) {
  const supa = db();
  let messages = 0;
  let conversations = 0;
  let optOutsKept = 0;
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    const part = contactIds.slice(i, i + CHUNK);
    const del = await supa.from("messages").delete({ count: "exact" }).in("contact_id", part).lt("created_at", before);
    if (del.error) throw new Error(del.error.message);
    messages += del.count ?? 0;
  }
  // Conversations that are now empty and older than the cutoff.
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    const part = contactIds.slice(i, i + CHUNK);
    const { data: old } = await supa.from("contacts").select("id, opted_out").in("id", part).lt("created_at", before);
    const ids = (old || []).map((c) => c.id as string);
    if (!ids.length) continue;
    const { data: still } = await supa.from("messages").select("contact_id").in("contact_id", ids);
    const busy = new Set((still || []).map((m) => m.contact_id as string));
    const empty = (old || []).filter((c) => !busy.has(c.id as string));
    const drop = empty.filter((c) => !c.opted_out).map((c) => c.id as string);
    const keep = empty.filter((c) => c.opted_out).map((c) => c.id as string);
    if (drop.length) {
      const r = await supa.from("contacts").delete({ count: "exact" }).in("id", drop);
      if (r.error) throw new Error(r.error.message);
      conversations += r.count ?? 0;
    }
    if (keep.length) {
      await supa.from("contacts").update({ parent_name: "Opted out (STOP)", child_name: null }).in("id", keep);
      optOutsKept += keep.length;
    }
  }
  return { messages, conversations, optOutsKept };
}

export async function runRetention() {
  const supa = db();
  const { data: schools, error } = await supa.from("schools").select("id, name, retention_months");
  if (error) throw new Error(error.message);
  const results: Record<string, unknown>[] = [];

  for (const s of schools || []) {
    const months = typeof s.retention_months === "number" ? s.retention_months : DEFAULT_RETENTION_MONTHS;
    if (!months || months <= 0) continue;
    const before = cutoff(months);
    const { data: staff } = await supa.from("staff").select("id").eq("school_id", s.id);
    const staffIds = (staff || []).map((x) => x.id as string);
    const ids = new Set<string>();
    for (let i = 0; i < staffIds.length; i += CHUNK) {
      const rows = await allRows<{ id: string }>((a, b) => supa.from("contacts").select("id").in("staff_id", staffIds.slice(i, i + CHUNK)).order("id").range(a, b));
      rows.forEach((r) => ids.add(r.id));
    }
    if (!ids.size) continue;
    const r = await purge([...ids], before);
    if (r.messages || r.conversations) results.push({ school: s.name, months, ...r });
  }

  // Main number conversations (no teacher): the default period.
  const mainIds = (await allRows<{ id: string }>((a, b) => supa.from("contacts").select("id").is("staff_id", null).order("id").range(a, b))).map((r) => r.id);
  if (mainIds.length) {
    const r = await purge(mainIds, cutoff(DEFAULT_RETENTION_MONTHS));
    if (r.messages || r.conversations) results.push({ school: "Main number", months: DEFAULT_RETENTION_MONTHS, ...r });
  }

  if (results.length) {
    await logAudit(
      { id: null as unknown as string, email: "system (daily clean-up)", school_id: null },
      { action: "retention.cleanup", targetType: "school", schoolId: null, detail: { results } },
    );
  }
  return results;
}
