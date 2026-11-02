"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sheet from "@/components/Sheet";
import LanguageSelect from "@/components/LanguageSelect";
import { Check, ChevronLeft, Plus, Upload } from "@/components/icons";
import { api } from "@/lib/client";
import { languageName, parseLanguage, rememberLanguages, type Language } from "@/lib/languages";
import { formatPhoneInput, prettyPhone, toE164 } from "@/lib/phone";
import { mapColumns, parseCsv, SAMPLE_CSV } from "@/lib/csv";
import type { Parent } from "@/lib/parents";

type School = { id: string; name: string };
type SortKey = "name" | "students" | "language" | "school" | "status";

const status = (p: Parent) => (p.opted_out ? "out" : !p.consent_at ? "consent" : "ok");
const STATUS_LABEL = { ok: "Can text", consent: "Needs consent", out: "Opted out" } as const;

// Admin: the school's Parents list. Upload a spreadsheet, or add, edit and delete parents one at a time.
export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [mySchool, setMySchool] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Parent | Partial<Parent> | null>(null);
  const [importing, setImporting] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [toast, setToast] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ok" | "consent" | "out">("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ parents: Parent[]; schools?: School[]; mySchoolId: string | null; canManage: boolean }>("/api/parents");
      if (!d.canManage) {
        window.location.href = "/inbox";
        return;
      }
      setParents(d.parents);
      setSchools(d.schools || []);
      setMySchool(d.mySchoolId);
      setError("");
      return d.parents;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load().then((list) => {
      const p = new URLSearchParams(window.location.search);
      const edit = p.get("edit");
      if (edit && list) {
        const hit = list.find((x) => x.id === edit);
        if (hit) setEditing(hit);
      } else if (p.get("add")) {
        setEditing({ phone: p.get("phone") || "", language: p.get("language") || "es" });
      } else if (p.get("upload")) setImporting(true);
      const st = p.get("status");
      if (st === "ok" || st === "consent" || st === "out") setStatusFilter(st);
      if (p.toString()) window.history.replaceState({}, "", "/admin/parents");
    });
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const schoolName = (id: string | null) => (id ? schools.find((s) => s.id === id)?.name || "—" : "No school");
  const showSchool = schools.length > 1 || parents.some((p) => p.school_id !== (parents[0]?.school_id ?? null));

  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const rows = useMemo(() => {
    const val = (p: Parent): string => {
      switch (sort.key) {
        case "students":
          return (p.students[0] || "~").toLowerCase();
        case "language":
          return languageName(p.language).toLowerCase();
        case "school":
          return schoolName(p.school_id).toLowerCase();
        case "status":
          return status(p);
        default:
          return p.parent_name.toLowerCase();
      }
    };
    return parents
      .filter((p) => !schoolFilter || (schoolFilter === "none" ? !p.school_id : p.school_id === schoolFilter))
      .filter((p) => !statusFilter || status(p) === statusFilter)
      .filter(
        (p) =>
          !q ||
          p.parent_name.toLowerCase().includes(q) ||
          p.students.some((s) => s.toLowerCase().includes(q)) ||
          languageName(p.language).toLowerCase().includes(q) ||
          (digits.length >= 3 && p.phone.includes(digits))
      )
      .sort((a, b) => val(a).localeCompare(val(b), undefined, { numeric: true }) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parents, schoolFilter, statusFilter, q, digits, sort, schools]);

  const allOn = rows.length > 0 && rows.every((p) => selected.has(p.id));
  const toggleAll = () => {
    const n = new Set(selected);
    rows.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id)));
    setSelected(n);
  };
  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  async function remove(ids: string[], label: string) {
    if (!ids.length) return;
    if (!confirm(`Delete ${label} from the Parents list? Teachers won't be able to text ${ids.length === 1 ? "them" : "them"} anymore. Past conversations stay in Messages.`)) return;
    try {
      const r = await api<{ deleted: number }>("/api/parents", { method: "DELETE", body: { ids } });
      setSelected(new Set());
      setEditing(null);
      flash(`Deleted ${r.deleted} ${r.deleted === 1 ? "parent" : "parents"}`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const selectedIds = [...selected].filter((id) => parents.some((p) => p.id === id));
  const counts = { ok: 0, consent: 0, out: 0 };
  parents.forEach((p) => counts[status(p)]++);

  const COLS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Parent" },
    { key: "students", label: "Student(s)" },
    { key: "language", label: "Language" },
    ...(showSchool ? [{ key: "school" as SortKey, label: "School" }] : []),
    { key: "status", label: "Status" },
  ];

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/admin">
          <ChevronLeft /> Home
        </a>
        <div className="settings-title">Parents</div>
        <span />
      </header>

      <div className="settings-body admin-wide">
        {error && <p className="sheet-error">{error}</p>}
        {!loaded && <p className="ios-footnote top">Loading…</p>}

        {loaded && parents.length === 0 && !error && (
          <div className="empty-card">
            <p className="empty-card-title">Add your parents</p>
            <p>
              Teachers text parents from this list, so it’s the first thing to set up. The quickest way is to upload a spreadsheet
              with each parent’s name, student, mobile number and language.
            </p>
            <div className="empty-card-actions">
              <button className="pill-btn big-pill" onClick={() => setImporting(true)}>
                <Upload size={18} /> Upload a Spreadsheet (CSV)
              </button>
              <button className="pill-btn ghost big-pill" onClick={() => setEditing({ language: "es", school_id: mySchool })}>
                <Plus size={18} /> Add One Parent
              </button>
            </div>
          </div>
        )}

        {loaded && parents.length > 0 && (
          <>
            <div className="admin-toolbar">
              <input
                className="admin-search"
                placeholder="Search parent, student, language or number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search parents"
              />
              {schools.length > 1 && (
                <select className="admin-select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} aria-label="Filter by school">
                  <option value="">All schools</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="none">No school</option>
                </select>
              )}
              <span className="toolbar-actions">
                <button className="pill-btn ghost add-pill" onClick={() => setImporting(true)}>
                  <Upload size={16} /> Upload CSV
                </button>
                <button
                  className="pill-btn add-pill"
                  onClick={() => setEditing({ language: "es", school_id: schoolFilter && schoolFilter !== "none" ? schoolFilter : mySchool })}
                >
                  <Plus size={16} /> Add Parent
                </button>
              </span>
            </div>

            {statusFilter && (
              <div className="select-bar">
                <span>Showing only: {STATUS_LABEL[statusFilter]}</span>
                {statusFilter === "consent" && <span className="muted">Open each parent and check the consent box.</span>}
                <button className="link-btn" style={{ marginLeft: "auto" }} onClick={() => setStatusFilter("")}>
                  Show everyone
                </button>
              </div>
            )}
            {selectedIds.length > 0 && (
              <div className="select-bar">
                <span>
                  {selectedIds.length} selected
                </span>
                <button className="link-btn" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
                <button className="pill-btn danger-pill" onClick={() => remove(selectedIds, `${selectedIds.length} ${selectedIds.length === 1 ? "parent" : "parents"}`)}>
                  Delete Selected
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table className="staff-table parents-table">
                <thead>
                  <tr>
                    <th className="cell-check">
                      <button onClick={toggleAll} aria-label={allOn ? "Unselect all" : "Select all"}>
                        <span className={`box ${allOn ? "on" : ""}`}>{allOn && <Check size={12} />}</span>
                      </button>
                    </th>
                    {COLS.map((c, i) => [
                      i === 2 && (
                        <th key="mobile">
                          <span className="th-plain">Mobile</span>
                        </th>
                      ),
                      <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                        <button onClick={() => toggleSort(c.key)}>
                          {c.label}
                          <span className="sort-ind" aria-hidden>
                            {sort.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : ""}
                          </span>
                        </button>
                      </th>,
                    ])}
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const st = status(p);
                    const on = selected.has(p.id);
                    return (
                      <tr key={p.id} className={on ? "picked" : ""} onClick={() => setEditing(p)}>
                        <td className="cell-check" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggle(p.id)} aria-label={`Select ${p.parent_name}`}>
                            <span className={`box ${on ? "on" : ""}`}>{on && <Check size={12} />}</span>
                          </button>
                        </td>
                        <td className="col-name">{p.parent_name}</td>
                        <td>{p.students.length ? p.students.join(", ") : <span className="muted">—</span>}</td>
                        <td className="nowrap">{prettyPhone(p.phone)}</td>
                        <td className="nowrap">{languageName(p.language)}</td>
                        {showSchool && <td>{schoolName(p.school_id)}</td>}
                        <td>
                          <span className={`status-pill p-${st}`}>{STATUS_LABEL[st]}</span>
                        </td>
                        <td className="cell-edit" onClick={(e) => e.stopPropagation()}>
                          <button className="link-btn row-link" onClick={() => setEditing(p)}>
                            Edit
                          </button>
                          <button className="link-btn row-link danger-text" onClick={() => remove([p.id], p.parent_name)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={COLS.length + 3}>No parents match.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="ios-footnote table-foot">
              {parents.length.toLocaleString()} {parents.length === 1 ? "parent" : "parents"} · {counts.ok.toLocaleString()} can be texted
              {counts.consent > 0 && ` · ${counts.consent} need consent`}
              {counts.out > 0 && ` · ${counts.out} opted out`}. Teachers see their own school’s parents when they write a message, and
              can’t add numbers themselves.
            </p>
          </>
        )}
      </div>

      {editing && (
        <ParentSheet
          parent={editing}
          schools={schools}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            flash(msg);
            await load();
          }}
          onDelete={(p) => remove([p.id], p.parent_name)}
        />
      )}
      {importing && (
        <ImportSheet
          schools={schools}
          defaultSchool={schoolFilter && schoolFilter !== "none" ? schoolFilter : mySchool || schools[0]?.id || ""}
          onClose={async (changed) => {
            setImporting(false);
            if (changed) await load();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// Add or edit one parent.
function ParentSheet({
  parent,
  schools,
  onClose,
  onSaved,
  onDelete,
}: {
  parent: Parent | Partial<Parent>;
  schools: School[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onDelete: (p: Parent) => void;
}) {
  const isNew = !parent.id;
  const [f, setF] = useState({
    parent_name: parent.parent_name || "",
    students: (parent.students || []).join(", "),
    phone: parent.phone ? (parent.phone.startsWith("+1") ? prettyPhone(parent.phone) : formatPhoneInput(parent.phone)) : "",
    language: parent.language || "es",
    school_id: parent.school_id || "",
    consent: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsConsent = isNew || !parent.consent_at;
  const ready = f.parent_name.trim() && f.phone.trim() && (!isNew || f.consent);

  async function save() {
    if (!toE164(f.phone)) {
      setError("That mobile number doesn’t look right. Enter a 10-digit number, like (303) 555-1234.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { ...f, school_id: schools.length ? f.school_id || null : undefined };
      if (isNew) await api("/api/parents", { body });
      else await api("/api/parents", { method: "PATCH", body: { id: parent.id, ...body } });
      onSaved(isNew ? `Added ${f.parent_name.trim()}` : "Saved");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Sheet title={isNew ? "Add Parent" : "Edit Parent"} onCancel={onClose} action={{ label: "Save", onClick: save, busy, disabled: !ready }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) save();
        }}
      >
        <div className="ios-group">
          <label className="ios-row">
            <span className="ios-row-label wide">Parent name</span>
            <input autoFocus={isNew} value={f.parent_name} onChange={(e) => setF({ ...f, parent_name: e.target.value })} placeholder="e.g. Maria Lopez" />
          </label>
          <label className="ios-row">
            <span className="ios-row-label wide">Student(s)</span>
            <input value={f.students} onChange={(e) => setF({ ...f, students: e.target.value })} placeholder="e.g. Sofia Lopez" />
          </label>
          <label className="ios-row">
            <span className="ios-row-label wide">Mobile</span>
            <input
              inputMode="tel"
              autoComplete="off"
              placeholder="(303) 555-1234"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: formatPhoneInput(e.target.value, f.phone) })}
            />
          </label>
          <label className="ios-row">
            <span className="ios-row-label wide">Language</span>
            <LanguageSelect value={f.language} onChange={(code) => setF({ ...f, language: code })} />
          </label>
          {schools.length > 0 && (
            <label className="ios-row">
              <span className="ios-row-label wide">School</span>
              <select value={f.school_id} onChange={(e) => setF({ ...f, school_id: e.target.value })}>
                <option value="">No school</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="ios-footnote">More than one student? Separate names with commas. Texts go out in the language chosen here.</p>
        {needsConsent && (
          <label className="consent-row">
            <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
            <span>
              This parent gave their mobile number to the school and agreed to receive text messages about their child.
              <span className="ios-row-hint">{isNew ? "Required." : "Required before teachers can text them."} Your name and the date are saved as the record.</span>
            </span>
          </label>
        )}
        {!isNew && parent.consent_at && (
          <p className="ios-footnote">
            Agreed to texts {new Date(parent.consent_at).toLocaleDateString()}
            {parent.opted_out && " · Opted out: they replied STOP, so no one can text them until they reply START."}
          </p>
        )}
        <button type="submit" hidden aria-hidden="true" />
      </form>
      {error && <p className="sheet-error">{error}</p>}
      <button className="ios-button big" disabled={!ready || busy} onClick={save}>
        {busy ? "Saving…" : isNew ? "Add Parent" : "Save Changes"}
      </button>
      {!isNew && (
        <div className="ios-group" style={{ marginTop: 18 }}>
          <button className="ios-row danger" onClick={() => onDelete(parent as Parent)}>
            Delete Parent
          </button>
        </div>
      )}
    </Sheet>
  );
}

type Row = { row: number; parent_name: string; students: string[]; phone: string; phoneE164: string | null; languageRaw: string; language: string | null; problem: string };

// Upload a CSV: choose the file → check what was found → add.
function ImportSheet({ schools, defaultSchool, onClose }: { schools: School[]; defaultSchool: string; onClose: (changed: boolean) => void }) {
  const [school, setSchool] = useState(defaultSchool);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; updated: number; problems: { row: number; error: string }[] } | null>(null);
  const [langs, setLangs] = useState<Language[]>([]);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((d) => {
        setLangs(d.languages || []);
        rememberLanguages(d.languages || []);
      })
      .catch(() => {});
  }, []);

  async function read(file: File) {
    setError("");
    setRows(null);
    setFileName(file.name);
    if (/\.(xlsx?|numbers)$/i.test(file.name)) {
      setError("That's a spreadsheet file, not a CSV. In Excel choose File → Save As → CSV; in Google Sheets choose File → Download → CSV. Then upload that file.");
      return;
    }
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) {
      setError("The file looks empty. It needs a header row and at least one parent.");
      return;
    }
    const map = mapColumns(table[0]);
    if ("missing" in map) {
      setError(`Couldn't find these columns: ${map.missing.join(", ")}. The first row should be headings like: Parent Name, Student Name, Phone, Language.`);
      return;
    }
    const cell = (r: string[], i: number) => (r[i] || "").trim();
    const out: Row[] = table.slice(1).map((r, k) => {
      const parent_name = map.parent.map((i) => cell(r, i)).filter(Boolean).join(" ");
      const students = map.students
        .flatMap((cols) => {
          const v = cols.map((i) => cell(r, i)).filter(Boolean).join(" ");
          return cols.length === 1 ? v.split(/[;,\n]|\s+&\s+/) : [v];
        })
        .map((s) => s.trim())
        .filter(Boolean);
      const phone = cell(r, map.phone);
      const phoneE164 = toE164(phone);
      const languageRaw = cell(r, map.language);
      const language = parseLanguage(languageRaw, langs);
      const problem = !parent_name
        ? "No parent name"
        : !phone
          ? "No phone number"
          : !phoneE164
            ? `Phone “${phone}” isn’t a valid mobile number`
            : !languageRaw
              ? "No language"
              : !language
                ? `Language “${languageRaw}” not recognized`
                : "";
      return { row: k + 2, parent_name, students, phone, phoneE164, languageRaw, language, problem };
    });
    setRows(out);
  }

  const good = (rows || []).filter((r) => !r.problem);
  const bad = (rows || []).filter((r) => r.problem);

  async function upload() {
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/parents", {
        body: {
          action: "import",
          consent: true,
          school_id: schools.length ? school || null : undefined,
          rows: good.map((r) => ({ row: r.row, parent_name: r.parent_name, students: r.students, phone: r.phoneE164, language: r.language })),
        },
      });
      setDone(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function sample() {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "relay-parents-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    return (
      <Sheet title="Upload Complete" cancelLabel="" onCancel={() => onClose(true)}>
        <div className="fam-result">
          <div className="gm-done" aria-hidden>
            <Check size={30} />
          </div>
          <p className="fam-result-big">
            {done.added} added{done.updated ? ` · ${done.updated} updated` : ""}
          </p>
          <p className="ios-footnote center-text">
            {done.updated ? "Parents whose number was already on the list were updated with the new details. " : ""}
            Teachers can text them now.
          </p>
          {done.problems.length > 0 && (
            <ul className="fam-errors">
              {done.problems.map((p, i) => (
                <li key={i}>{p.row ? `Row ${p.row}: ${p.error}` : p.error}</li>
              ))}
            </ul>
          )}
          <button className="ios-button big" onClick={() => onClose(true)}>
            Done
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Upload Parents" onCancel={() => onClose(false)}>
      {!rows && (
        <>
          <p className="ios-footnote top">
            Upload a CSV file with one parent per row and these columns: <strong>Parent Name</strong>, <strong>Student Name</strong>,{" "}
            <strong>Phone</strong>, <strong>Language</strong>. Column order doesn’t matter.{" "}
            <button className="link-btn" onClick={sample}>
              Download a sample file
            </button>
          </p>
          {schools.length > 0 && (
            <div className="ios-group">
              <label className="ios-row">
                <span className="ios-row-label wide">School</span>
                <select value={school} onChange={(e) => setSchool(e.target.value)}>
                  <option value="">No school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <label className="drop-zone">
            <Upload size={30} />
            <span className="drop-title">{fileName || "Choose a CSV file"}</span>
            <span className="drop-sub">From Excel or Google Sheets: save or download as CSV</span>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) read(file);
                e.target.value = "";
              }}
            />
          </label>
          <p className="ios-footnote">
            Languages can be names (Spanish, Vietnamese) or codes (es, vi). If a phone number is already on the list, that parent is updated
            instead of added twice.
          </p>
        </>
      )}

      {rows && (
        <>
          <div className="import-summary">
            <div className="import-stat ok">
              <strong>{good.length}</strong> ready to add
            </div>
            {bad.length > 0 && (
              <div className="import-stat bad">
                <strong>{bad.length}</strong> {bad.length === 1 ? "row needs" : "rows need"} fixing
              </div>
            )}
          </div>
          {bad.length > 0 && (
            <>
              <p className="ios-section">Skipped — fix these in your file and upload again</p>
              <ul className="import-problems">
                {bad.slice(0, 50).map((r) => (
                  <li key={r.row}>
                    <span className="muted">Row {r.row}</span> {r.parent_name || "(no name)"}: {r.problem}
                  </li>
                ))}
                {bad.length > 50 && <li className="muted">…and {bad.length - 50} more</li>}
              </ul>
            </>
          )}
          {good.length > 0 && (
            <>
              <p className="ios-section">First few parents</p>
              <div className="table-wrap">
                <table className="staff-table preview-table">
                  <thead>
                    <tr>
                      <th><span className="th-plain">Parent</span></th>
                      <th><span className="th-plain">Student(s)</span></th>
                      <th><span className="th-plain">Mobile</span></th>
                      <th><span className="th-plain">Language</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {good.slice(0, 6).map((r) => (
                      <tr key={r.row}>
                        <td>{r.parent_name}</td>
                        <td>{r.students.join(", ") || <span className="muted">—</span>}</td>
                        <td className="nowrap">{prettyPhone(r.phoneE164!)}</td>
                        <td>{languageName(r.language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="consent-row" style={{ marginTop: 16 }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  These parents gave their mobile numbers to the school and agreed to receive text messages about their children.
                  <span className="ios-row-hint">Required. Your name and the date are saved as the record.</span>
                </span>
              </label>
            </>
          )}
          {error && <p className="sheet-error">{error}</p>}
          <div className="compose-foot">
            <button className="ios-button big" disabled={!good.length || !consent || busy} onClick={upload}>
              {busy ? "Adding…" : `Add ${good.length} ${good.length === 1 ? "Parent" : "Parents"}`}
            </button>
            <button className="link-btn center-block" onClick={() => setRows(null)}>
              Choose a different file
            </button>
          </div>
        </>
      )}
      {!rows && error && <p className="sheet-error">{error}</p>}
    </Sheet>
  );
}
