import { allRows, db, Staff } from "@/lib/db";
import { json, withAdmin } from "@/lib/http";
import { isSuperAdmin, NO_SCHOOL_ID, schoolLimit } from "@/lib/staff";
import { TOPICS, toneOf, topicOf } from "@/lib/topics";
import { segmentsOf } from "@/lib/segments";
import { env } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY = 86400000;
const WEEKS = 9;
const DAYS = 60; // daily chart

// Everything the admin dashboard shows, for one school (?school=<id>) or every school in view (?school=all).
// Admins oversee their school district: "all" means every school in their district, and they start there.
// Super admins start on their own school (all schools if they have none) and can pick any school.
export const GET = withAdmin(async (req, me) => {
  const supa = db();
  const asked = new URL(req.url).searchParams.get("school");
  const { data: schoolRows } = await supa.from("schools").select("id, name, district").order("name");
  const lim = schoolLimit(me);
  // Admins (not super admins) only ever see the schools in their district.
  const schools = ((schoolRows || []) as { id: string; name: string; district?: string | null }[]).filter((s) => lim === undefined || lim.includes(s.id));
  const pickable = (id: string | null) => !!id && schools.some((s) => s.id === id);
  // Super admins can also pick a whole district (?school=d:<district name>).
  const askedDistrict = lim === undefined && asked?.startsWith("d:") ? asked.slice(2) : null;
  const districtIds = askedDistrict
    ? schools.filter((s) => ((s.district || "").trim() || "No district") === askedDistrict).map((s) => s.id)
    : null;
  // The schools shown: a list of ids, or null for every school (super admins only).
  const scopeIds: string[] | null =
    lim !== undefined
      ? pickable(asked) ? [asked!] : lim.length ? lim : [NO_SCHOOL_ID]
      : districtIds ? (districtIds.length ? districtIds : [NO_SCHOOL_ID])
      : asked === "all" ? null : pickable(asked) ? [asked!] : me.school_id ? [me.school_id] : null;
  const schoolId = scopeIds && scopeIds.length === 1 ? scopeIds[0] : null; // one school picked

  // Teachers in scope
  let staffQ = supa.from("staff").select("id, name, school, school_id, role, status, last_seen_at, phone_number, phone_placeholder");
  if (scopeIds) staffQ = staffQ.in("school_id", scopeIds);
  const { data: staffRows, error: staffErr } = await staffQ;
  if (staffErr) throw new Error(staffErr.message);
  const staff = (staffRows || []) as Pick<Staff, "id" | "name" | "school" | "school_id" | "role" | "status" | "last_seen_at" | "phone_number" | "phone_placeholder">[];
  const staffIds = staff.map((s) => s.id);
  const staffSet = new Set(staffIds);
  // Limit a query to these teachers. With many teachers (a whole district) the id list would make the
  // request too long, so those rows are fetched unfiltered and trimmed by inScope() afterwards.
  const BIG = 150;
  const byStaff = <Q extends { in: Function }>(q: Q): Q => (scopeIds && staffIds.length <= BIG ? q.in("staff_id", staffIds) : q);
  const inScope = (staffId: string | null) => !scopeIds || (!!staffId && staffSet.has(staffId));

  // Parents in scope
  let parentErr = null as { message: string } | null;
  const parentRows = await allRows<{ id: string; language: string; opted_out: boolean; consent_at: string | null }>((a, b) => {
    let q = supa.from("parents").select("id, language, opted_out, consent_at").order("id").range(a, b);
    if (scopeIds) q = q.in("school_id", scopeIds);
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
  if (!scopeIds || staffIds.length) {
    const data = await allRows<typeof msgs[number] & { sent_by: string | null }>((a, b) => {
      let q = supa
        .from("messages")
        .select("id, staff_id, direction, created_at, contact_id, sent_by")
        .gte("created_at", since.toISOString())
        .order("id")
        .range(a, b);
      q = byStaff(q);
      return q;
    });
    // The automatic sign-up confirmation isn't a message a teacher sent.
    msgs = ((data || []) as (typeof msgs[number] & { sent_by: string | null })[]).filter((m) => m.sent_by !== "opt-in confirmation" && inScope(m.staff_id));
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
      q = byStaff(q);
      return q;
    });
    for (const c of convos) {
      if (!inScope(c.staff_id)) continue;
      if (c.staff_id) convoCount.set(c.staff_id, (convoCount.get(c.staff_id) || 0) + 1);
      if (c.parent_id) parentOf.set(c.id, c.parent_id);
    }
  }

  // Headline rates for the last 30 days, and the 30 days before that for the trend arrows.
  // Outreach: parents on the list a teacher texted. Engagement: of those, how many texted back.
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
  // Engagement = contacted parents who responded (replied in the same period)
  const counts = (b: ReturnType<typeof period>) => ({
    contacted: b.contacted.size,
    engaged: [...b.engaged].filter((id) => b.contacted.has(id)).length,
    teachers: b.teachers.size,
  });

  // What texts were about in the last 30 days (one topic per message) and the tone of parents' replies
  const topicCount = new Map<string, number>();
  let tagged = 0;
  const tone = { positive: 0, neutral: 0, concern: 0 };
  if (!scopeIds || staffIds.length) {
    const rows = await allRows<{ staff_id: string | null; contact_id: string; direction: string; body_en: string | null; sent_by: string | null }>((a, b) => {
      let q = supa
        .from("messages")
        .select("id, staff_id, contact_id, direction, body_en, sent_by")
        .gte("created_at", new Date(d30).toISOString())
        .order("id")
        .range(a, b);
      q = byStaff(q);
      return q;
    });
    for (const m of rows) {
      if (!m.body_en || m.sent_by === "opt-in confirmation" || !inScope(m.staff_id)) continue;
      const k = topicOf(m.body_en);
      if (k) {
        tagged++;
        topicCount.set(k, (topicCount.get(k) || 0) + 1);
      }
      if (m.direction === "inbound") tone[toneOf(m.body_en)]++;
    }
  }
  const topics = {
    messages: tagged,
    list: TOPICS.map((t) => ({ key: t.key, label: t.label, count: topicCount.get(t.key) || 0 })).sort((a, b) => b.count - a.count),
    tone,
  };

  // Texting status: real Twilio numbers in use, and segments sent this month and year (Mountain Time).
  // Counts only texts that really went out through Twilio (not demo or simulated ones). Each segment is billed.
  const startOf = (kind: "day" | "month" | "year") => {
    const local = new Date(Date.now() + TZ);
    const y = local.getUTCFullYear();
    const m = kind === "year" ? 0 : local.getUTCMonth();
    const d = kind === "day" ? local.getUTCDate() : 1;
    return Date.UTC(y, m, d) - TZ;
  };
  const yearStart = startOf("year");
  const monthStart = startOf("month");
  const dayStart = startOf("day");
  const seg = { today: 0, mtd: 0, ytd: 0, textsYtd: 0 };
  if (!scopeIds || staffIds.length) {
    const sentRows = await allRows<{ staff_id: string | null; created_at: string; body_en: string | null; body_translated: string | null }>((a, b) => {
      let q = supa
        .from("messages")
        .select("id, staff_id, created_at, body_en, body_translated")
        .eq("direction", "outbound")
        .not("twilio_sid", "is", null)
        .gte("created_at", new Date(yearStart).toISOString())
        .order("id")
        .range(a, b);
      q = byStaff(q);
      return q;
    });
    for (const m of sentRows) {
      if (!inScope(m.staff_id)) continue;
      const n = segmentsOf(m.body_translated || m.body_en);
      const t = new Date(m.created_at).getTime();
      seg.ytd += n;
      seg.textsYtd++;
      if (t >= monthStart) seg.mtd += n;
      if (t >= dayStart) seg.today += n;
    }
  }
  const realNumbers = staff.filter((s) => s.status !== "pending" && s.phone_number && !s.phone_placeholder).length;
  const mainNumber = !scopeIds && !!env.twilioFrom; // the shared main number counts when every school is shown
  const numbers = { teachers: realNumbers, main: mainNumber ? 1 : 0, inUse: realNumbers + (mainNumber ? 1 : 0), placeholders: staff.filter((s) => s.status === "active" && s.phone_placeholder).length };

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
    school: schoolId && !districtIds ? schools.find((s) => s.id === schoolId) || null : null,
    schoolId: schoolId && !districtIds ? schoolId : askedDistrict ? `d:${askedDistrict}` : "all",
    schools,
    // The district an admin oversees (shown at the top right); null for super admins.
    district: lim !== undefined ? { id: me.district_id || null, name: me.district_name || null } : null,
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
    texting: { numbers, segments: seg },
    rates: { current: counts(cur), previous: prev.any ? counts(prev) : null },
    topics,
  });
});
