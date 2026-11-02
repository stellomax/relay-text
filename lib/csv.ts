// Small CSV reader for parent lists exported from Excel, Google Sheets or a student information system.

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] || "";
  const delim = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length
    ? "\t"
    : (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c));
}

export type ColumnMap = {
  parent: number[]; // one column, or first + last name
  students: number[][]; // each student: one column, or first + last name
  phone: number;
  language: number;
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

// Work out which column is which from the header row.
export function mapColumns(header: string[]): ColumnMap | { missing: string[] } {
  const h = header.map(norm);
  const find = (test: (s: string) => boolean, skip: number[] = []) => h.findIndex((s, i) => !skip.includes(i) && test(s));
  const isFirst = (s: string) => /first|given/.test(s);
  const isLast = (s: string) => /last|surname|family/.test(s);
  const isStudent = (s: string) => /student|child|kid|son|daughter|pupil/.test(s);
  const isParent = (s: string) => /parent|guardian|contact|mother|father|caregiver/.test(s) && !/phone|mobile|cell|lang|email/.test(s);

  const phone = find((s) => /phone|mobile|cell|number|tel/.test(s) && !/student/.test(s));
  const language = find((s) => /lang|idioma/.test(s));
  const used = [phone, language];

  let parent: number[] = [];
  const pFirst = find((s) => isParent(s) && isFirst(s), used);
  const pLast = find((s) => isParent(s) && isLast(s), used);
  if (pFirst >= 0 && pLast >= 0) parent = [pFirst, pLast];
  else {
    const p = find((s) => isParent(s) && !isStudent(s), used);
    if (p >= 0) parent = [p];
    else {
      const plain = find((s) => s === "name" || s === "fullname", used);
      if (plain >= 0) parent = [plain];
    }
  }
  used.push(...parent);

  const students: number[][] = [];
  const sCols = h.map((s, i) => (isStudent(s) && !used.includes(i) ? i : -1)).filter((i) => i >= 0);
  const firsts = sCols.filter((i) => isFirst(h[i]));
  const lasts = sCols.filter((i) => isLast(h[i]));
  if (firsts.length && firsts.length === lasts.length) firsts.forEach((f, k) => students.push([f, lasts[k]]));
  else sCols.forEach((i) => students.push([i]));

  const missing: string[] = [];
  if (!parent.length) missing.push("Parent name");
  if (phone < 0) missing.push("Phone");
  if (language < 0) missing.push("Language");
  if (missing.length) return { missing };
  return { parent, students, phone, language };
}

export const SAMPLE_CSV =
  "Parent Name,Student Name,Phone,Language\n" +
  "Maria Lopez,Sofia Lopez,(303) 555-0101,Spanish\n" +
  "Nguyen Van An,\"Linh Nguyen, Bao Nguyen\",(303) 555-0102,Vietnamese\n" +
  "Amina Hassan,Yusuf Hassan,303-555-0103,Somali\n";
