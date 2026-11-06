import { allRows, db, type Contact, type Staff } from "./db";
import { languageName } from "./languages";

// Message history as CSV, for open-records requests (CORA), district reviews and handover at contract end.

const CHUNK = 200;

function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Stop spreadsheet apps treating a cell as a formula (CSV injection).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = [
  "Date and time (UTC)",
  "School",
  "Teacher",
  "Parent",
  "Student",
  "Parent phone",
  "Language",
  "Direction",
  "Message in English",
  "Message in parent's language",
  "Status",
  "Sent by",
  "Test message",
];

type Msg = {
  contact_id: string;
  direction: string;
  body_en: string;
  body_translated: string | null;
  language: string | null;
  status: string | null;
  sent_by: string | null;
  simulated: boolean;
  created_at: string;
};

export async function exportCsv(contacts: Contact[], from?: string | null, to?: string | null): Promise<{ csv: string; messages: number }> {
  const supa = db();
  const staffIds = [...new Set(contacts.map((c) => c.staff_id).filter(Boolean))] as string[];
  const staff = new Map<string, Pick<Staff, "name" | "school">>();
  for (let i = 0; i < staffIds.length; i += CHUNK) {
    const { data } = await supa.from("staff").select("id, name, school").in("id", staffIds.slice(i, i + CHUNK));
    (data || []).forEach((s) => staff.set(s.id as string, { name: s.name as string, school: s.school as string | null }));
  }
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const rows: string[] = [HEADER.map(cell).join(",")];
  let messages = 0;
  const ids = contacts.map((c) => c.id);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    const msgs = await allRows<Msg>((a, b) => {
      let q = supa
        .from("messages")
        .select("contact_id, direction, body_en, body_translated, language, status, sent_by, simulated, created_at")
        .in("contact_id", part);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      return q.order("created_at").range(a, b);
    });
    for (const m of msgs) {
      const c = byId.get(m.contact_id);
      if (!c) continue;
      const t = c.staff_id ? staff.get(c.staff_id) : undefined;
      rows.push(
        [
          m.created_at,
          t?.school || "",
          t?.name || "Main number",
          c.parent_name,
          c.child_name || "",
          c.phone,
          languageName(m.language || c.language),
          m.direction === "outbound" ? "Sent to parent" : "Received from parent",
          m.body_en,
          m.body_translated || "",
          m.status || "",
          m.sent_by || "",
          m.simulated ? "yes" : "",
        ]
          .map(cell)
          .join(","),
      );
      messages++;
    }
  }
  // A byte-order mark so Excel opens accented and non-Latin text correctly.
  return { csv: "﻿" + rows.join("\r\n") + "\r\n", messages };
}
