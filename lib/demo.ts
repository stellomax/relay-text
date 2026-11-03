// Demo data for sales demos: 20 teachers, ~220 parents in many languages, groups, and 60 days of
// two-way conversations that grow over time. Every row this creates is marked demo = true, and
// wipeDemo() removes exactly those rows, so real accounts and conversations are never touched.
// Phone numbers use the 555-01xx range, which is reserved for fiction and never reaches a real phone.
import { randomUUID } from "crypto";
import { db } from "./db";
import { env } from "./config";

const DAY = 86400000;
const TZ_HOURS = -7; // school hours are laid out in Mountain Time

// ---------- deterministic randomness, so a reload looks the same ----------
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = rng(20261102);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const between = (a: number, b: number) => a + rand() * (b - a);
const chance = (p: number) => rand() < p;
function poisson(l: number) {
  let k = 0;
  let p = 1;
  const L = Math.exp(-l);
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}
function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// ---------- the cast ----------
type Tier = "champion" | "regular" | "light" | "new" | "none";
const TEACHERS: { first: string; last: string; title: string; subject: string; tier: Tier; eld?: boolean }[] = [
  { first: "Emily", last: "Carter", title: "Ms.", subject: "science", tier: "champion" },
  { first: "Sofia", last: "Ramirez", title: "Ms.", subject: "English language development", tier: "champion", eld: true },
  { first: "Marcus", last: "Johnson", title: "Mr.", subject: "math", tier: "champion" },
  { first: "Priya", last: "Shah", title: "Ms.", subject: "English language development", tier: "champion", eld: true },
  { first: "Daniel", last: "Kim", title: "Mr.", subject: "English", tier: "regular" },
  { first: "Rachel", last: "Nguyen", title: "Ms.", subject: "math", tier: "regular" },
  { first: "Hannah", last: "Brooks", title: "Ms.", subject: "science", tier: "regular" },
  { first: "Omar", last: "Haddad", title: "Mr.", subject: "social studies", tier: "regular" },
  { first: "Natalie", last: "Flores", title: "Ms.", subject: "English", tier: "regular" },
  { first: "Jasmine", last: "Reed", title: "Ms.", subject: "special education", tier: "regular" },
  { first: "Carlos", last: "Vega", title: "Mr.", subject: "Spanish", tier: "regular" },
  { first: "Kevin", last: "OBrien", title: "Mr.", subject: "math", tier: "regular" },
  { first: "Grace", last: "Patel", title: "Ms.", subject: "art", tier: "light" },
  { first: "Tyler", last: "Morgan", title: "Mr.", subject: "PE", tier: "light" },
  { first: "Lauren", last: "Mitchell", title: "Ms.", subject: "music", tier: "light" },
  { first: "Brian", last: "Walsh", title: "Mr.", subject: "social studies", tier: "light" },
  { first: "Olivia", last: "Bennett", title: "Ms.", subject: "reading", tier: "new" },
  { first: "Jacob", last: "Turner", title: "Mr.", subject: "science", tier: "new" },
  { first: "Megan", last: "Price", title: "Ms.", subject: "English", tier: "none" },
  { first: "Andre", last: "Thompson", title: "Mr.", subject: "technology", tier: "none" },
];
const DISPLAY_LAST: Record<string, string> = { OBrien: "O’Brien" };

// Conversation starts per teacher per school day, at full speed (activity ramps up over the month).
const RATE: Record<Tier, number> = { champion: 4.2, regular: 2.0, light: 0.55, new: 2.2, none: 0 };
// Days ago each tier started texting (new teachers joined in the last few weeks).
const SPAN = 60; // days of history
const START: Record<Tier, [number, number]> = { champion: [59, 56], regular: [57, 42], light: [50, 24], new: [20, 9], none: [0, 0] };

// Parents by language: [language, count, parent names, student first names]
const FAMILIES: [string, number, string[], string[]][] = [
  ["es", 34,
    ["Maria Lopez", "José Hernández", "Guadalupe Martínez", "Juan Garcia", "Rosa Gonzalez", "Luis Rodríguez", "Ana Pérez", "Carlos Sánchez", "Verónica Ramírez", "Miguel Torres", "Lucía Flores", "Jorge Rivera", "Patricia Gómez", "Ricardo Díaz", "Elena Cruz", "Fernando Morales", "Claudia Reyes", "Alejandro Ortiz", "Silvia Gutiérrez", "Eduardo Chávez", "Leticia Ramos", "Arturo Mendoza", "Gabriela Castillo", "Raúl Vargas", "Adriana Romero", "Héctor Jiménez", "Mónica Herrera", "Sergio Medina", "Teresa Aguilar", "Oscar Vázquez", "Yolanda Castro", "Javier Ruiz"],
    ["Sofía", "Mateo", "Valentina", "Santiago", "Camila", "Diego", "Isabella", "Emiliano", "Ximena", "Leonardo", "Daniela", "Adrián", "Lucía", "Gael", "Mariana", "Iker", "Renata", "Andrés", "Ana", "Joaquín"]],
  ["vi", 9, ["Nguyen Thi Lan", "Tran Van Minh", "Le Thi Hoa", "Pham Van Duc", "Hoang Thi Mai", "Vu Van Hung", "Dang Thi Thu", "Bui Van Long"], ["Linh", "Bao", "Anh", "Khoa", "Vy", "Minh", "Thao", "Duy"]],
  ["ar", 8, ["Ahmed Hassan", "Fatima Ali", "Mohammed Saleh", "Layla Haddad", "Omar Khalil", "Mariam Youssef", "Khaled Mansour", "Noor Ibrahim"], ["Yusuf", "Amira", "Zaid", "Lina", "Adam", "Huda", "Karim", "Salma"]],
  ["so", 6, ["Amina Hassan", "Abdi Warsame", "Hodan Ali", "Mohamed Farah", "Fadumo Yusuf", "Ahmed Abdi", "Sahra Omar"], ["Yusuf", "Hamza", "Ayaan", "Ifrah", "Khalid", "Deeqa", "Nasra"]],
  ["uk", 5, ["Olena Kovalenko", "Andriy Shevchenko", "Iryna Bondarenko", "Oksana Melnyk", "Taras Petrenko"], ["Dmytro", "Sofiia", "Maksym", "Anna", "Artem"]],
  ["ht", 4, ["Jean Baptiste", "Marie Joseph", "Pierre Louis", "Nadège Charles", "Wilner Pierre"], ["Marie", "Jean", "Daphney", "Kervens", "Lovely"]],
  ["fa-AF", 4, ["Ahmad Rahimi", "Zahra Ahmadi", "Mohammad Karimi", "Fatima Noori", "Abdul Hakimi"], ["Zahra", "Mustafa", "Mariam", "Ali", "Hasina"]],
  ["zh-CN", 3, ["Li Wei", "Wang Fang", "Zhang Min", "Chen Jing", "Liu Yang"], ["Jason", "Emily", "Kevin", "Grace", "Lucas"]],
  ["sw", 2, ["Neema Mwangi", "Baraka Otieno", "Grace Uwimana", "Joseph Mugisha"], ["Faith", "David", "Esther", "Emmanuel"]],
  ["my", 5, ["Thu Zar", "Kyaw Win", "Aye Aye Mon", "Htet Aung"], ["Hnin Wai", "Ko Ko", "Su Mon", "Zaw Min"]],
];

// ---------- the conversations (English; translated per family) ----------
type Turn = { who: "T" | "P"; text: string };
const SCRIPTS: { turns: Turn[]; weight: number }[] = [
  { weight: 6, turns: [
    { who: "T", text: "Hi! This is {tname}, {child}'s {subject} teacher. {child} did a great job in class today and I wanted you to know!" },
    { who: "P", text: "Thank you so much for telling me! That makes me very happy." },
    { who: "T", text: "You're welcome! Have a good evening." }] },
  { weight: 5, turns: [
    { who: "T", text: "Hi, this is {tname}. {child} has two missing {subject} assignments this week. Could you please check with {child} tonight?" },
    { who: "P", text: "Thank you for telling me. I will talk to {child} tonight." },
    { who: "T", text: "Thank you! {child} can turn them in until Friday." }] },
  { weight: 4, turns: [
    { who: "T", text: "Hello, this is {tname}. {child} was absent today. Is everything okay?" },
    { who: "P", text: "Yes, {child} had a doctor appointment. {child} will be back tomorrow." },
    { who: "T", text: "Thank you for letting me know. I hope everything is okay!" }] },
  { weight: 4, turns: [
    { who: "T", text: "Hi, this is {tname}. Parent-teacher conferences are next Thursday from 4 to 7 pm. Would you like to meet with me?" },
    { who: "P", text: "Yes, I can come at 5:30." },
    { who: "T", text: "Perfect, see you Thursday at 5:30! I'm in room 114." },
    { who: "P", text: "Thank you, see you then." }] },
  { weight: 4, turns: [
    { who: "T", text: "{child} is working hard in {subject}. We have free tutoring on Tuesdays and Thursdays after school until 4:15. Can {child} join?" },
    { who: "P", text: "Yes, that would be very good. How does {child} get home after?" },
    { who: "T", text: "The late bus leaves at 4:30 and stops near your street." },
    { who: "P", text: "Thank you! {child} will go on Tuesday." }] },
  { weight: 3, turns: [
    { who: "T", text: "Hi, I wanted to let you know {child} had a hard time focusing in class today. Is there anything I should know?" },
    { who: "P", text: "Thank you for telling me. We moved to a new apartment this week and {child} is very tired. I will talk with {child}." },
    { who: "T", text: "Thank you for sharing. I will check in with {child} tomorrow." }] },
  { weight: 3, turns: [
    { who: "T", text: "Great news: {child}'s grade in {subject} went up from a C to a B this month!" },
    { who: "P", text: "Wow, thank you! We are very proud of {child}." }] },
  { weight: 3, turns: [
    { who: "T", text: "Could you please send a calculator with {child} this week? If that is hard, I can lend one from class." },
    { who: "P", text: "We don't have one right now. Can {child} borrow one?" },
    { who: "T", text: "Of course. I will give {child} one tomorrow." },
    { who: "P", text: "Thank you very much, teacher." }] },
  { weight: 4, turns: [
    { who: "P", text: "Hello teacher, {child} is sick today and will not come to school." },
    { who: "T", text: "Thank you for letting me know. I hope {child} feels better soon! I will send the homework home." }] },
  { weight: 3, turns: [
    { who: "P", text: "Hi, when is the next test?" },
    { who: "T", text: "The next {subject} test is on Wednesday. {child} can use the study guide I sent home." },
    { who: "P", text: "Thank you." }] },
  { weight: 2, turns: [
    { who: "P", text: "Thank you for helping {child}. {child} says your class is their favorite." },
    { who: "T", text: "That is so kind! {child} is a joy to have in class." }] },
  { weight: 3, turns: [
    { who: "T", text: "{child} has been late to first period three times this week. Is there anything I can help with?" },
    { who: "P", text: "Sorry. My work starts early. I will try to bring {child} on time." },
    { who: "T", text: "Thank you. {child} can also eat breakfast at school, which starts at 7:30." },
    { who: "P", text: "That is very helpful, thank you." }] },
  { weight: 3, turns: [
    { who: "T", text: "Our {subject} project is due next Monday. {child} has a great start! Please remind {child} to finish the poster." },
    { who: "P", text: "OK, we will buy poster paper this weekend." }] },
  { weight: 3, turns: [
    { who: "T", text: "{child} read 300 minutes this month! Please keep reading together at home." },
    { who: "P", text: "Thank you! We read every night before bed." }] },
  { weight: 2, turns: [
    { who: "T", text: "The nurse needs an updated emergency contact form for {child}. I will send it home today." },
    { who: "P", text: "OK, I will fill it out tonight." }] },
  { weight: 3, turns: [
    { who: "T", text: "{child} helped a new student in class today. I'm so proud of {child}!" },
    { who: "P", text: "❤️ Thank you for telling me! That made my day." }] },
  { weight: 3, turns: [
    { who: "P", text: "Can I talk with you about {child}'s grades?" },
    { who: "T", text: "Of course! I'm free tomorrow after 3:15. I can call you, or you can come to the school." },
    { who: "P", text: "I will come to the school at 3:30." },
    { who: "T", text: "Great, see you then. I'll meet you at the front office." }] },
  { weight: 3, turns: [
    { who: "T", text: "{child} has a {subject} test on Friday. Please help {child} study the vocabulary words tonight." },
    { who: "P", text: "OK, we will study together." }] },
  { weight: 2, turns: [
    { who: "T", text: "Hi! Reminder: the photo day is this Friday. Please send back the signed permission form." },
    { who: "P", text: "Thank you, I will sign it tonight." }] },
  { weight: 2, turns: [
    { who: "T", text: "{child} forgot their jacket in my classroom today. I'll keep it safe at my desk." },
    { who: "P", text: "Thank you! {child} will get it tomorrow." }] },
  { weight: 2, turns: [
    { who: "P", text: "Good morning. Is there school on Monday?" },
    { who: "T", text: "Yes, there is school on Monday. The day off is the following Friday." },
    { who: "P", text: "OK, thank you!" }] },
  { weight: 2, turns: [
    { who: "T", text: "We are looking for parent volunteers for the cultural night on the 20th. Would you like to share food or music from your culture?" },
    { who: "P", text: "Yes! I can bring food. Thank you for inviting us." },
    { who: "T", text: "Wonderful! I'll send more details next week." }] },
  { weight: 2, turns: [
    { who: "T", text: "{child} is reading much more fluently than at the start of the year. Their hard work is paying off!" },
    { who: "P", text: "Thank you, teacher. We practice every day." }] },
];
const BROADCASTS = [
  "Reminder: there is no school this Friday because of teacher training. See you Monday!",
  "Our class is collecting canned food for the food drive this week. Thank you for any help!",
  "Report cards go home today. Please sign and return the envelope by Wednesday.",
  "Early release this Wednesday at 1:00 pm. Buses leave at 1:15.",
  "Thank you for a great week! Please check that your child's library books are returned on Monday.",
  "Field trip forms are due this Thursday. The trip is free, and lunch is provided.",
];
const SHORT_REPLIES = ["Thank you!", "OK, thank you.", "Got it, thank you!", "Thank you for the reminder.", "OK 👍"];

// ---------- helpers ----------
type Plan = {
  staffIdx: number;
  parentIdx: number;
  turns: { who: "T" | "P"; en: string; at: number }[];
};

function localMinutesToUtc(daysAgo: number, minutes: number, now: number) {
  const localNow = now + TZ_HOURS * 3600e3;
  const localMidnight = Math.floor(localNow / DAY) * DAY - daysAgo * DAY;
  return localMidnight + minutes * 60e3 - TZ_HOURS * 3600e3;
}
function isWeekend(daysAgo: number, now: number) {
  const d = new Date(localMinutesToUtc(daysAgo, 12 * 60, now) + TZ_HOURS * 3600e3).getUTCDay();
  return d === 0 || d === 6;
}
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

// Google Translate in batches (up to 100 texts per request).
async function translateMany(texts: string[], target: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!texts.length) return out;
  if (target.split("-")[0] === "en") {
    for (const t of texts) out.set(t, t);
    return out;
  }
  if (!env.googleKey) throw new Error("Google Translate is not configured.");
  const go = async (chunk: string[], tgt: string): Promise<string[]> => {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.googleKey!)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: chunk, target: tgt, source: "en", format: "text" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && tgt.includes("-")) return go(chunk, tgt.split("-")[0]);
    if (!res.ok) throw new Error(`Google Translate error: ${data?.error?.message || res.status}`);
    return (data?.data?.translations || []).map((r: { translatedText: string }) =>
      r.translatedText.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    );
  };
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100);
    const res = await go(chunk, target);
    chunk.forEach((t, j) => out.set(t, res[j] ?? t));
  }
  return out;
}

async function insertChunks(table: string, rows: Record<string, unknown>[], size = 500) {
  const supa = db();
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await supa.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

// ---------- public ----------
export async function wipeDemo() {
  const supa = db();
  const steps: [string, string][] = [
    ["contacts", "demo"], // messages go with their conversations
    ["parent_groups", "demo"], // group members go with their groups
    ["parents", "demo"],
    ["staff", "demo"],
  ];
  const counts: Record<string, number> = {};
  for (const [table, col] of steps) {
    const { error, count } = await supa.from(table).delete({ count: "exact" }).eq(col, true);
    if (error) {
      if (/demo/.test(error.message)) throw new Error("The demo column is missing. Run the one-time demo SQL in Supabase first.");
      throw new Error(`${table}: ${error.message}`);
    }
    counts[table] = count ?? 0;
  }
  return counts;
}

export async function loadDemo(schoolId: string) {
  rand = rng(20261102);
  const supa = db();
  const now = Date.now();
  await wipeDemo();

  const { data: school } = await supa.from("schools").select("id, name, area_code").eq("id", schoolId).maybeSingle();
  if (!school) throw new Error("School not found.");

  // Teachers (skip anyone whose email already belongs to a real account)
  const emails = TEACHERS.map((t) => `${t.first.toLowerCase()}@stellomark.com`);
  const { data: taken } = await supa.from("staff").select("email").in("email", emails);
  const takenSet = new Set((taken || []).map((r) => r.email));
  const { data: usedNums } = await supa.from("staff").select("phone_number").like("phone_number", "+1303555%");
  const usedNumSet = new Set((usedNums || []).map((r) => r.phone_number));
  const freeNums: string[] = [];
  for (let n = 199; n >= 100 && freeNums.length < TEACHERS.length; n--) {
    const p = `+1303555${String(n).padStart(4, "0")}`;
    if (!usedNumSet.has(p)) freeNums.push(p);
  }
  const teachers = TEACHERS.filter((t) => !takenSet.has(`${t.first.toLowerCase()}@stellomark.com`)).map((t, i) => {
    const start = Math.round(between(START[t.tier][1], START[t.tier][0]));
    const seen =
      t.tier === "champion" ? now - between(0.5, 6) * 3600e3
      : t.tier === "regular" ? now - between(6, 40) * 3600e3
      : t.tier === "light" ? now - between(2, 8) * DAY
      : t.tier === "new" ? now - between(2, 20) * 3600e3
      : chance(0.5) ? null : now - between(14, 30) * DAY;
    return {
      ...t,
      id: randomUUID(),
      start,
      tname: `${t.title} ${DISPLAY_LAST[t.last] || t.last}`,
      row: {
        email: `${t.first.toLowerCase()}@stellomark.com`,
        name: `${t.first} ${DISPLAY_LAST[t.last] || t.last}`,
        school: school.name,
        school_id: school.id,
        role: "teacher",
        status: "active",
        phone_number: freeNums[i] || null,
        phone_placeholder: true,
        last_seen_at: seen ? new Date(seen).toISOString() : null,
        created_at: new Date(now - (start + 4) * DAY).toISOString(),
        demo: true,
      } as Record<string, unknown>,
    };
  });
  for (const t of teachers) t.row.id = t.id;
  await insertChunks("staff", teachers.map((t) => t.row));

  // Parents
  const { data: existing } = await supa.from("parents").select("phone").eq("school_id", school.id);
  const usedPhones = new Set((existing || []).map((r) => r.phone));
  const phonePool: string[] = [];
  for (const ac of ["970", "719", "720"]) for (let n = 100; n <= 199; n++) {
    const p = `+1${ac}555${String(n).padStart(4, "0")}`;
    if (!usedPhones.has(p)) phonePool.push(p);
  }
  const parents: { id: string; name: string; child: string; lang: string; phone: string; resp: number; ok: boolean; row: Record<string, unknown> }[] = [];
  let pi = 0;
  for (const [lang, count, names, kids] of FAMILIES) {
    for (let k = 0; k < count && pi < phonePool.length; k++, pi++) {
      // The first round uses the listed names; after that, mix first and last names so they don't repeat.
      const first = (n: string) => n.split(" ").slice(0, -1).join(" ");
      const last = (n: string) => n.split(" ").slice(-1)[0];
      const name = k < names.length ? names[k] : `${first(pick(names))} ${last(pick(names))}`;
      const child = pick(kids);
      const second = chance(0.18) ? pick(kids.filter((c) => c !== child)) : null;
      const r = rand();
      const resp = r < 0.3 ? 0.85 : r < 0.65 ? 0.55 : r < 0.88 ? 0.25 : 0.05;
      const status = rand();
      const optedOut = status < 0.02;
      const needsConsent = !optedOut && status < 0.06;
      const created = now - between(SPAN + 5, SPAN + 30) * DAY;
      const id = randomUUID();
      parents.push({
        id,
        name,
        child,
        lang,
        phone: phonePool[pi],
        resp,
        ok: !optedOut && !needsConsent,
        row: {
          id,
          parent_name: name,
          students: second ? [child, second] : [child],
          phone: phonePool[pi],
          language: lang,
          school_id: school.id,
          opted_out: optedOut,
          consent_at: needsConsent ? null : new Date(created).toISOString(),
          consent_source: needsConsent ? null : "school enrollment form",
          created_at: new Date(created).toISOString(),
          updated_at: new Date(created).toISOString(),
          demo: true,
        },
      });
    }
  }
  await insertChunks("parents", parents.map((p) => p.row));
  const textable = parents.map((p, i) => ({ p, i })).filter((x) => x.p.ok);

  // Rosters and groups
  const rosters = teachers.map((t) => {
    const size = t.eld ? 22 : Math.round(between(12, 20));
    const pool = t.eld ? textable.filter((x) => x.p.lang !== "en") : textable;
    return shuffle(pool).slice(0, size).map((x) => x.i);
  });
  const groupRows: Record<string, unknown>[] = [];
  const memberRows: Record<string, unknown>[] = [];
  const teacherGroups: number[][][] = teachers.map(() => []);
  teachers.forEach((t, ti) => {
    if (t.tier === "none") return;
    const names = t.eld ? ["Newcomer families", "ELD Level 2"] : shuffle(["Period 1", "Period 2", "Period 3", "Period 4", "Period 6", "Advisory"]).slice(0, t.tier === "light" ? 1 : 2);
    const roster = shuffle(rosters[ti]);
    names.forEach((name, gi) => {
      const gid = randomUUID();
      const members = roster.slice(gi * 6, gi * 6 + Math.round(between(6, 10)));
      teacherGroups[ti].push(members);
      groupRows.push({ id: gid, staff_id: t.id, name, created_at: new Date(now - (SPAN + 2) * DAY).toISOString(), demo: true });
      for (const m of members) memberRows.push({ group_id: gid, parent_id: parents[m].id });
    });
  });
  await insertChunks("parent_groups", groupRows);
  await insertChunks("parent_group_members", memberRows);

  // Plan SPAN days of conversations
  const plans: Plan[] = [];
  const weighted: number[] = [];
  SCRIPTS.forEach((s, i) => {
    for (let k = 0; k < s.weight; k++) weighted.push(i);
  });
  const nowLocalMin = Math.floor(((now + TZ_HOURS * 3600e3) % DAY) / 60e3);
  for (let d = SPAN - 1; d >= 0; d--) {
    const weekend = isWeekend(d, now);
    const ramp = 0.3 + 0.9 * ((SPAN - 1 - d) / (SPAN - 1)); // engagement grows steadily over the period
    teachers.forEach((t, ti) => {
      if (t.tier === "none" || d > t.start || !rosters[ti].length) return;
      const n = poisson(RATE[t.tier] * ramp * (weekend ? 0.12 : 1) * between(0.7, 1.3));
      for (let k = 0; k < n; k++) {
        const pIdx = pick(rosters[ti]);
        const par = parents[pIdx];
        const script = SCRIPTS[pick(weighted)];
        const v = { tname: t.tname, child: par.child, subject: t.subject };
        const parentFirst = script.turns[0].who === "P";
        let at = parentFirst
          ? (chance(0.5) ? between(6.5 * 60, 7.9 * 60) : between(18 * 60, 21 * 60))
          : between(7.7 * 60, 16.4 * 60);
        const turns: Plan["turns"] = [];
        for (let j = 0; j < script.turns.length; j++) {
          const tu = script.turns[j];
          if (j > 0) {
            if (tu.who === "P" && !chance(par.resp)) break;
            at += tu.who === "P" ? between(8, 200) : between(4, 75);
          }
          if (d === 0 && at > nowLocalMin - 5) break;
          turns.push({ who: tu.who, en: fill(tu.text, v), at: localMinutesToUtc(d, at, now) });
        }
        if (turns.length) plans.push({ staffIdx: ti, parentIdx: pIdx, turns });
      }
      // About one group message a week from teachers with groups
      if (!weekend && teacherGroups[ti].length && chance(t.tier === "light" ? 0.08 : 0.2)) {
        const members = pick(teacherGroups[ti]);
        const text = pick(BROADCASTS);
        const at = between(14.8 * 60, 15.6 * 60);
        if (!(d === 0 && at > nowLocalMin - 5)) {
          for (const m of members) {
            const turns: Plan["turns"] = [{ who: "T", en: text, at: localMinutesToUtc(d, at, now) }];
            if (chance(parents[m].resp * 0.4)) {
              const rAt = at + between(10, 240);
              if (!(d === 0 && rAt > nowLocalMin - 5)) turns.push({ who: "P", en: pick(SHORT_REPLIES), at: localMinutesToUtc(d, rAt, now) });
            }
            plans.push({ staffIdx: ti, parentIdx: m, turns });
          }
        }
      }
    });
  }

  // Translate every line into its family's language (one batch per language)
  const byLang = new Map<string, Set<string>>();
  for (const pl of plans) {
    const lang = parents[pl.parentIdx].lang;
    if (!byLang.has(lang)) byLang.set(lang, new Set());
    for (const tu of pl.turns) byLang.get(lang)!.add(tu.en);
  }
  const tr = new Map<string, Map<string, string>>();
  await Promise.all([...byLang.entries()].map(async ([lang, set]) => tr.set(lang, await translateMany([...set], lang))));

  // Conversations (one per teacher + parent) and messages
  const contactIds = new Map<string, string>();
  const contactRows: Record<string, unknown>[] = [];
  const msgRows: Record<string, unknown>[] = [];
  plans.sort((a, b) => a.turns[0].at - b.turns[0].at);
  for (const pl of plans) {
    const t = teachers[pl.staffIdx];
    const par = parents[pl.parentIdx];
    const key = `${t.id}|${par.id}`;
    let cid = contactIds.get(key) || "";
    if (!cid) {
      cid = randomUUID();
      contactIds.set(key, cid);
      contactRows.push({
        id: cid,
        parent_name: par.name,
        child_name: par.child,
        phone: par.phone,
        language: par.lang,
        opted_out: false,
        consent_at: par.row.consent_at,
        consent_source: par.row.consent_source,
        staff_id: t.id,
        parent_id: par.id,
        created_at: new Date(pl.turns[0].at - 60e3).toISOString(),
        demo: true,
      });
    }
    const map = tr.get(par.lang)!;
    for (const tu of pl.turns) {
      const other = map.get(tu.en) ?? tu.en;
      const recent = now - tu.at < 30 * 3600e3;
      msgRows.push(
        tu.who === "T"
          ? { contact_id: cid, staff_id: t.id, direction: "outbound", body_en: tu.en, body_translated: other, language: par.lang, status: "delivered", is_read: true, simulated: false, from_number: t.row.phone_number, to_number: par.phone, created_at: new Date(tu.at).toISOString() }
          : { contact_id: cid, staff_id: t.id, direction: "inbound", body_en: tu.en, body_translated: other, language: par.lang, status: "received", is_read: !(recent && chance(0.7)), simulated: false, from_number: par.phone, to_number: t.row.phone_number, created_at: new Date(tu.at).toISOString() }
      );
    }
  }
  await insertChunks("contacts", contactRows);
  await insertChunks("messages", msgRows);

  return {
    school: school.name,
    teachers: teachers.length,
    skippedTeachers: TEACHERS.length - teachers.length,
    parents: parents.length,
    groups: groupRows.length,
    conversations: contactRows.length,
    messages: msgRows.length,
  };
}
