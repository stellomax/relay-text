import { allRows, db, Staff } from "@/lib/db";
import { json, withAdmin } from "@/lib/http";
import { isSuperAdmin } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY = 86400000;
const WEEKS = 9;
const DAYS = 60; // daily chart

// Everything the admin dashboard shows, for one school (?school=<id>) or every school (?school=all).
// Admins start on their own school; admins without a school start on all schools.
export const GET = withAdmin(async (req, me) => {
  const supa = db();
  const asked = new URL(req.url).searchParams.get("school");
  const { data: schoolRows } = await supa.from("schools").select("id, name").order("name");
  const schools = (schoolRows || []) as { id: string; name: string }[];
  const schoolId = asked === "all" ? null : asked && schools.some((s) => s.id === asked) ? asked : me.school_id || null;

  // Teachers in scope
  let staffQ = supa.from("staff").select("id, name, school, school_id, role, status, last_seen_at, phone_placeholder");
  if (schoolId) staffQ = staffQ.eq("school_id", schoolId);
  const { data: staffRows, error: staffErr } = await staffQ;
  if (staffErr) throw new Error(staffErr.message);
  const staff = (staffRows || []) as Pick<Staff, "id" | "name" | "school" | "school_id" | "role" | "status" | "last_seen_at" | "phone_placeholder">[];
  const staffIds = staff.map((s) => s.id);

  // Parents in scope
  let parentErr = null as { message: string } | null;
  const parentRows = await allRows<{ id: string; language: string; opted_out: boolean; consent_at: string | null }>((a, b) => {
    let q = supa.from("parents").select("id, language, opted_out, consent_at").order("id").range(a, b);
    if (schoolId) q = q.eq("school_id", schoolId);
    return q;
  }).catch((e) => {
    parentErr = { message: String(e?.message || e) };
    return [];
  });
  const parents = parentRows as { id: string; language: string; opted_out: boolean; consent_at: string | null }[];

  // Messages over the last 9 weeks (covers the 60-day chart), from teachers in scope
  const since = new Date(Date.now() - WEEKS * 7 * DAY);
  since.setHours(0, 0, 0, 0);
  let msgs: { staff_id: string | null; direction: string; created_at: string; contact_id: string }[] = [];
  if (!schoolId || staffIds.length) {
    const data = await allRows<typeof msgs[number] & { sent_by: string | null }>((a, b) => {
      let q = supa
        .from("messages")
        .select("id, staff_id, direction, created_at, contact_id, sent_by")
        .gte("created_at", since.toISOString())
        .order("id")
        .range(a, b);
      if (schoolId) q = q.in("staff_id", staffIds);
      return q;
    });
    // The automatic sign-up confirmation isn't a message a teacher sent.
    msgs = ((data || []) as (typeof msgs[number] & { sent_by: string | null })[]).filter((m) => m.sent_by !== "opt-in confirmation");
  }

  const unread = await supa
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", me.id)
    .eq("direction", "inbound")
    .eq("is_read", false);

  // Daily sent / replies for the last 60 days (oldest first), by Mountain Time days.
  const TZ = -7 * 3600000;
  const todayStart = Math.floor((Date.now() + TZ) / DAY) * DAY - TZ;
  const days = Array.from({ length: DAYS }, (_, i) => ({ start: new Date(todayStart - (DAYS - 1 - i) * DAY).toISOString(), sent: 0, replies: 0 }));
  for (const m of msgs) {
    const di = DAYS - 1 - Math.floor((todayStart + DAY - 1 - new Date(m.created_at).getTime()) / DAY);
    if (di >= 0 && di < DAYS) m.direction === "outbound" ? days[di].sent++ : days[di].replies++;
  }

  // Weekly sent / replies (oldest first)
  const weekStart = (i: number) => new Date(since.getTime() + i * 7 * DAY);
  const weeks = Array.from({ length: WEEKS }, (_, i) => ({ start: weekStart(i).toISOString(), sent: 0, replies: 0 }));
  const d30 = Date.now() - 30 * DAY;
  const perTeacher = new Map<string, { texts: number; received: number; contacts: Set<string> }>();
  const entry = (id: string) => {
    const e = perTeacher.get(id) || { texts: 0, received: 0, contacts: new Set<string>() };
    perTeacher.set(id, e);
    return e;
  };
  const reachedContacts = new Set<string>();
  let sent30 = 0;
  let replies30 = 0;
  for (const m of msgs) {
    const t = new Date(m.created_at).getTime();
    const w = Math.min(WEEKS - 1, Math.floor((t - since.getTime()) / (7 * DAY)));
    if (w >= 0) m.direction === "outbound" ? weeks[w].sent++ : weeks[w].replies++;
    if (t >= d30) {
      if (m.direction === "outbound") {
        sent30++;
        reachedContacts.add(m.contact_id);
        if (m.staff_id) {
          const e = entry(m.staff_id);
          e.texts++;
          e.contacts.add(m.contact_id);
        }
      } else {
        replies30++;
        if (m.staff_id) entry(m.staff_id).received++;
      }
    }
  }

  // Families reached in 30 days, counted by parent (one parent texted by two teachers counts once)
  let reachedParents = 0;
  if (reachedContacts.size) {
    const ids = [...reachedContacts];
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supa.from("contacts").select("id, parent_id, phone").in("id", ids.slice(i, i + 200));
      for (const c of data || []) seen.add(c.parent_id || c.phone);
    }
    reachedParents = seen.size;
  }

  // Languages
  const langCount = new Map<string, number>();
  for (const p of parents) langCount.set(p.language, (langCount.get(p.language) || 0) + 1);
  const languages = [...langCount.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count }));

  // Conversations in scope: total parents per teacher (all time), and which parent each conversation is with
  const convoCount = new Map<string, number>();
  const parentOf = new Map<string, string>();
  if (staffIds.length) {
    const convos = await allRows<{ id: string; staff_id: string | null; parent_id: string | null }>((a, b) => {
      let q = supa.from("contacts").select("id, staff_id, parent_id").not("staff_id", "is", null).order("id").range(a, b);
      if (schoolId) q = q.in("staff_id", staffIds);
      return q;
    });
    for (const c of convos) {
      if (c.staff_id) convoCount.set(c.staff_id, (convoCount.get(c.staff_id) || 0) + 1);
      if (c.parent_id) parentOf.set(c.id, c.parent_id);
    }
  }

  // Headline rates for the last 30 days, and the 30 days before that for the trend arrows.
  // Outreach: parents on the list a teacher texted. Engagement: parents on the list who texted back.
  // Involvement: active teachers who sent at least one text.
  const onList = new Set(parents.map((p) => p.id));
  const activeIds = new Set(staff.filter((s) => s.status === "active").map((s) => s.id));
  const d60 = Date.now() - 60 * DAY;
  const period = () => ({ contacted: new Set<string>(), engaged: new Set<string>(), teachers: new Set<string>(), any: false });
  const cur = period();
  const prev = period();
  for (const m of msgs) {
    const t = new Date(m.created_at).getTime();
    const bucket = t >= d30 ? cur : t >= d60 ? prev : null;
    if (!bucket) continue;
    bucket.any = true;
    const pid = parentOf.get(m.contact_id);
    const listed = pid && onList.has(pid);
    if (m.direction === "outbound") {
      if (listed) bucket.contacted.add(pid);
      if (m.staff_id && activeIds.has(m.staff_id)) bucket.teachers.add(m.staff_id);
    } else if (listed) bucket.engaged.add(pid);
  }
  const counts = (b: ReturnType<typeof period>) => ({ contacted: b.contacted.size, engaged: b.engaged.size, teachers: b.teachers.size });

  const active = staff.filter((s) => s.status === "active");
  const teachers = active
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      texts30: perTeacher.get(s.id)?.texts || 0,
      received30: perTeacher.get(s.id)?.received || 0,
      parentsTotal: convoCount.get(s.id) || 0,
      parents30: perTeacher.get(s.id)?.contacts.size || 0,
      last_seen_at: s.last_seen_at,
    }))
    .sort((a, b) => b.texts30 - a.texts30 || a.name.localeCompare(b.name));

  return json({
    name: me.name,
    isSuper: isSuperAdmin(me.email),
    school: schoolId ? schools.find((s) => s.id === schoolId) || null : null,
    schoolId: schoolId || "all",
    schools,
    unread: unread.count ?? 0,
    parentsReady: !parentErr,
    parents: {
      total: parents.length,
      canText: parents.filter((p) => !p.opted_out && p.consent_at).length,
      needsConsent: parents.filter((p) => !p.opted_out && !p.consent_at).length,
      optedOut: parents.filter((p) => p.opted_out).length,
      reached30: reachedParents,
    },
    languages,
    teachers: {
      total: active.length,
      pending: staff.filter((s) => s.status === "pending").length,
      texting30: teachers.filter((t) => t.texts30 > 0).length,
      list: teachers,
    },
    messages: { sent30, replies30, weeks, days },
    rates: { current: counts(cur), previous: prev.any ? counts(prev) : null },
  });
});
