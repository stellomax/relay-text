// Turn a spreadsheet (our template, or a raw export from a student information system) into parents to add.
// Handles one row per parent, and one row per student with "Guardian 1 …" / "Guardian 2 …" columns.

import { parseLanguage, type Language } from "./languages";
import { toE164 } from "./phone";

export type RoleKind = "ignore" | "name" | "first" | "last" | "phone" | "language" | "student" | "studentFirst" | "studentLast" | "school";
// g: which parent (1, 2, …). 0 on a language column means "the family's language" (applies to every parent in the row).
// p: priority among columns of the same kind (lower wins), e.g. a cell phone before a home phone.
export type Role = { kind: RoleKind; g: number; p: number };

const IGNORE: Role = { kind: "ignore", g: 0, p: 0 };

const norm = (h: string) =>
  h
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9#]+/g, " ")
    .trim();

const PARENTISH = /\b(parent|guardian|contact|mother|father|mom|dad|caregiver|caretaker|adult|household|family|responsible)\b|^(g|p)\s*\d\b/;
const STUDENTISH = /\b(student|child|children|kid|pupil|son|daughter|learner|scholar)\b/;

// Guess what each column is from its heading.
export function guessRoles(header: string[]): Role[] {
  const hs = header.map((h) => norm(h || ""));
  const hasDigitGroups = hs.some((h) => PARENTISH.test(h) && /\d/.test(h));

  const roles: Role[] = hs.map((h) => {
    if (!h) return IGNORE;
    const num = (h.match(/(?:^|\s)#?\s*(\d)(?:\s|$)/) || [])[1];
    let g = num ? Number(num) : 1;
    if (!num && !hasDigitGroups) {
      if (/\b(father|dad)\b/.test(h)) g = 2;
    }
    if (/emergency|doctor|physician|dentist|pick ?up|\bfax\b/.test(h)) return IGNORE; // not a parent to text
    const student = STUDENTISH.test(h);
    const parent = PARENTISH.test(h);

    if (/e ?mail|address|street|city|zip|postal|\bstate\b|birth|dob|\bage\b|gender|grade|\bid\b|number id|\bssn\b|relationship|relation|\btype\b|ethnic|race|homeroom|teacher|counselor|\bnotes?\b|comment/.test(h)) {
      // a "language" or "phone" heading can contain one of these words ("Phone Type", "Language Type"): only ignore if it's
      // not clearly one of our fields.
      if (!/phone|mobile|cell|lang/.test(h) || /\btype\b|relationship/.test(h)) return IGNORE;
    }
    if (/lang|idioma/.test(h)) {
      // "Language of correspondence" / "Preferred language" beat "Home language" / "Native language".
      const p = /correspond|prefer|contact|communicat|parent|guardian|written|spoken/.test(h) ? 0 : /home|native|first|primary/.test(h) ? 1 : 2;
      // Only a numbered column ("Guardian 2 Language") belongs to one parent; otherwise it's the family's language.
      return { kind: "language", g: num && !student ? g : 0, p };
    }
    if (/phone|mobile|cell|\btel\b|telephone|\bsms\b|\btext\b|number/.test(h)) {
      if (student && !parent) return IGNORE; // the student's own phone
      if (/\b(work|business|office|employer|fax|pager)\b/.test(h)) return { kind: "phone", g, p: 3 };
      const p = /mobile|cell|sms|text/.test(h) ? 0 : /home|house|landline/.test(h) ? 2 : 1;
      return { kind: "phone", g, p };
    }
    if (/\b(school|building|campus|site)\b/.test(h)) return /code|\bno\b|#/.test(h) ? IGNORE : { kind: "school", g: 0, p: 0 };
    const first = /\b(first|given|fname)\b/.test(h);
    const last = /\b(last|surname|family name|lname)\b/.test(h) || (/\bfamily\b/.test(h) && /name/.test(h) && !parent);
    if (student && !parent) return { kind: first ? "studentFirst" : last ? "studentLast" : "student", g: 0, p: 0 };
    if (parent) {
      if (/\b(middle|nick|preferred name|suffix|title|prefix)\b/.test(h)) return IGNORE;
      return { kind: first ? "first" : last ? "last" : "name", g, p: 0 };
    }
    if (first || last || /^(full )?name$/.test(h)) return { kind: first ? "first" : last ? "last" : "name", g: 0, p: -1 }; // decided below
    return IGNORE;
  });

  // Plain "Name" / "First Name" / "Last Name" (no parent or student word): if the file names its parents elsewhere,
  // these belong to the student (one row per student). Otherwise they're the parent's (one row per parent, like our template).
  const parentNamed = roles.some((r) => (r.kind === "name" || r.kind === "first" || r.kind === "last") && r.p === 0);
  const studentNamed = roles.some((r) => r.kind === "student" || r.kind === "studentFirst" || r.kind === "studentLast");
  return roles.map((r) => {
    if (r.p !== -1) return r;
    if (parentNamed && !studentNamed) return { kind: r.kind === "first" ? "studentFirst" : r.kind === "last" ? "studentLast" : "student", g: 0, p: 0 };
    if (parentNamed) return IGNORE;
    return { ...r, g: 1, p: 0 };
  });
}

// The header row: the first row (of the first ten) that looks like headings, so title rows above it are skipped.
export function findHeaderRow(table: string[][]): number {
  for (let i = 0; i < Math.min(10, table.length); i++) {
    const roles = guessRoles(table[i]);
    if (roles.some((r) => r.kind === "phone") && roles.filter((r) => r.kind !== "ignore").length >= 2) return i;
  }
  return 0;
}

// What's still needed before the file can be read.
export function missingFields(roles: Role[]): string[] {
  const out: string[] = [];
  const hasPhone = roles.some((r) => r.kind === "phone");
  const hasName = roles.some((r) => r.kind === "name" || r.kind === "first" || r.kind === "last");
  const hasStudent = roles.some((r) => r.kind === "student" || r.kind === "studentFirst" || r.kind === "studentLast");
  if (!hasPhone) out.push("Parent mobile number");
  if (!hasName && !hasStudent) out.push("Parent name (or student name)");
  return out;
}

export const hasLanguageColumn = (roles: Role[]) => roles.some((r) => r.kind === "language");

// "Lopez, Maria" → "Maria Lopez" (one comma, as SIS exports often write names)
function nameOrder(s: string): string {
  const m = s.match(/^\s*([^,]+),\s*([^,]+)\s*$/);
  return m ? `${m[2].trim()} ${m[1].trim()}` : s.trim();
}

export type ImportRow = {
  row: number; // the row number in the spreadsheet
  parent_name: string;
  students: string[];
  phone: string;
  phoneE164: string | null;
  languageRaw: string;
  language: string | null; // null: not recognized (see unknownLanguages)
  defaultedLanguage: boolean; // the language was blank, so English was used
  school: string;
  problem: string;
};

export function buildRows(
  table: string[][],
  headerRow: number,
  roles: Role[],
  opts: { langs?: Language[]; langMap?: Record<string, string> } = {},
): ImportRow[] {
  const cell = (r: string[], i: number) => (r[i] || "").trim();
  const byPriority = (a: number, b: number) => roles[a].p - roles[b].p;
  const cols = (kind: RoleKind, g?: number) =>
    roles.map((r, i) => (r.kind === kind && (g == null || r.g === g) ? i : -1)).filter((i) => i >= 0).sort(byPriority);
  const groups = [...new Set(roles.filter((r) => ["name", "first", "last", "phone", "language"].includes(r.kind) && r.g > 0).map((r) => r.g))].sort();
  if (!groups.length) groups.push(1);
  const firstOf = (r: string[], list: number[]) => list.map((i) => cell(r, i)).find(Boolean) || "";
  const lang = (raw: string): string | null => {
    const key = raw.trim().toLowerCase();
    if (opts.langMap && key in opts.langMap) return opts.langMap[key] || null;
    return parseLanguage(raw, opts.langs || []);
  };

  const familyLang = cols("language", 0);
  const school = cols("school");
  const sFirst = cols("studentFirst");
  const sLast = cols("studentLast");
  const sName = cols("student");

  const out: ImportRow[] = [];
  table.slice(headerRow + 1).forEach((r, k) => {
    if (!r.some((c) => (c || "").trim())) return; // blank row
    const rowNum = headerRow + k + 2;
    const students: string[] = [];
    sFirst.forEach((f, j) => {
      const v = [cell(r, f), sLast[j] != null ? cell(r, sLast[j]) : ""].filter(Boolean).join(" ");
      if (v) students.push(v);
    });
    if (!sFirst.length && sLast.length) sLast.forEach((l) => cell(r, l) && students.push(cell(r, l)));
    for (const i of sName) {
      const v = cell(r, i);
      if (!v) continue;
      // A file with Parent 1 / Parent 2 columns has one student per row, often written "Lopez, Sofia".
      // Otherwise (one row per parent) a cell can list several: "Linh Nguyen, Bao Nguyen" or "Linh; Bao".
      if (groups.length > 1 || /^\s*\S+\s*,\s*\S+\s*$/.test(v)) students.push(nameOrder(v));
      else students.push(...v.split(/[;\n,]|\s+&\s+/).map((s) => s.trim()).filter(Boolean));
    }
    const fam = firstOf(r, familyLang);
    const schoolRaw = firstOf(r, school);

    groups.forEach((g) => {
      const full = firstOf(r, cols("name", g));
      const fl = [firstOf(r, cols("first", g)), firstOf(r, cols("last", g))].filter(Boolean).join(" ");
      let parent_name = full ? nameOrder(full) : fl;
      const phone = firstOf(r, cols("phone", g));
      if (!parent_name && !phone) return; // this parent column group is empty on this row
      if (g > 1 && !phone) return; // a second parent with no number: nothing to text
      if (!parent_name && students.length) parent_name = `Parent of ${students[0]}`;
      const languageRaw = firstOf(r, cols("language", g)) || fam;
      const language = languageRaw ? lang(languageRaw) : "en";
      const phoneE164 = phone ? toE164(phone) : null;
      const problem = !parent_name
        ? "No parent name"
        : !phone
          ? "No phone number"
          : !phoneE164
            ? `Phone “${phone}” isn’t a valid mobile number`
            : !language
              ? `Language “${languageRaw}” not recognized`
              : "";
      out.push({ row: rowNum, parent_name, students: [...new Set(students)], phone, phoneE164, languageRaw, language, defaultedLanguage: !languageRaw, school: schoolRaw, problem });
    });
  });
  return out;
}

// Language values we couldn't read, most common first, so the admin can say what each one is (once, not per row).
export function unknownLanguages(rows: ImportRow[]): { raw: string; count: number }[] {
  const m = new Map<string, { raw: string; count: number }>();
  for (const r of rows) {
    if (r.language || !r.languageRaw) continue;
    const key = r.languageRaw.trim().toLowerCase();
    const e = m.get(key) || { raw: r.languageRaw.trim(), count: 0 };
    e.count++;
    m.set(key, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

// Match a School column value to one of the schools in Relay ("Sagewood Middle School" ↔ "Sagewood MS").
const schoolKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\bmiddle school\b/g, "ms")
    .replace(/\bhigh school\b/g, "hs")
    .replace(/\belementary school\b/g, "elementary")
    .replace(/\belem\b|\bes\b/g, "elementary")
    .replace(/[^a-z0-9]/g, "");
export function matchSchool<T extends { id: string; name: string }>(raw: string, schools: T[]): T | null {
  const k = schoolKey(raw);
  if (!k) return null;
  return schools.find((s) => schoolKey(s.name) === k) || schools.find((s) => schoolKey(s.name).startsWith(k) || k.startsWith(schoolKey(s.name))) || null;
}

// Choices for the "which column is which?" step.
export const ROLE_CHOICES: { label: string; role: Role }[] = [
  { label: "Don’t use", role: IGNORE },
  { label: "Parent name", role: { kind: "name", g: 1, p: 0 } },
  { label: "Parent first name", role: { kind: "first", g: 1, p: 0 } },
  { label: "Parent last name", role: { kind: "last", g: 1, p: 0 } },
  { label: "Parent mobile", role: { kind: "phone", g: 1, p: 0 } },
  { label: "Parent language", role: { kind: "language", g: 1, p: 0 } },
  { label: "Parent 2 name", role: { kind: "name", g: 2, p: 0 } },
  { label: "Parent 2 first name", role: { kind: "first", g: 2, p: 0 } },
  { label: "Parent 2 last name", role: { kind: "last", g: 2, p: 0 } },
  { label: "Parent 2 mobile", role: { kind: "phone", g: 2, p: 0 } },
  { label: "Parent 2 language", role: { kind: "language", g: 2, p: 0 } },
  { label: "Family language (all parents)", role: { kind: "language", g: 0, p: 0 } },
  { label: "Student name", role: { kind: "student", g: 0, p: 0 } },
  { label: "Student first name", role: { kind: "studentFirst", g: 0, p: 0 } },
  { label: "Student last name", role: { kind: "studentLast", g: 0, p: 0 } },
  { label: "School", role: { kind: "school", g: 0, p: 0 } },
];

export const roleKey = (r: Role) => `${r.kind}:${r.kind === "ignore" || r.kind.startsWith("student") || r.kind === "school" ? 0 : r.g}`;
// A guessed role may be for parent 3, or have a priority; show the closest choice, and keep the guess unless it's changed.
export function roleLabel(r: Role): string {
  const exact = ROLE_CHOICES.find((c) => roleKey(c.role) === roleKey(r));
  if (exact) return exact.label;
  const base = ROLE_CHOICES.find((c) => c.role.kind === r.kind && c.role.g === 1);
  return base ? base.label.replace("Parent", `Parent ${r.g}`) : "Don’t use";
}

// Remembered column choices and language answers (this browser), so the next upload of the same export just works.
const MAP_KEY = "relay.import.columns";
const LANG_KEY = "relay.import.languages";
const sig = (header: string[]) => header.map(norm).join("|");
function store(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
export function savedRoles(header: string[]): Role[] | null {
  try {
    const all = JSON.parse(store()?.getItem(MAP_KEY) || "{}");
    const r = all[sig(header)];
    return Array.isArray(r) && r.length === header.length ? r : null;
  } catch {
    return null;
  }
}
export function saveRoles(header: string[], roles: Role[]) {
  try {
    const s = store();
    if (!s) return;
    const all = JSON.parse(s.getItem(MAP_KEY) || "{}");
    all[sig(header)] = roles;
    s.setItem(MAP_KEY, JSON.stringify(all));
  } catch {}
}
export function savedLanguages(): Record<string, string> {
  try {
    return JSON.parse(store()?.getItem(LANG_KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveLanguages(map: Record<string, string>) {
  try {
    store()?.setItem(LANG_KEY, JSON.stringify({ ...savedLanguages(), ...map }));
  } catch {}
}
export function saveLanguagesReset() {
  try {
    store()?.removeItem(LANG_KEY);
  } catch {}
}
