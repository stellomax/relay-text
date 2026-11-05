"use client";

import { useCallback, useEffect, useState } from "react";
import Sheet from "@/components/Sheet";
import { ChevronRight, Plus } from "@/components/icons";
import AdminHeader, { AdminTitle } from "@/components/AdminHeader";
import { api } from "@/lib/client";

type School = {
  id: string;
  name: string;
  district: string | null;
  area_code: string | null;
  signup_code: string | null;
  active: boolean;
  retention_months?: number;
  teachers: number;
  parents: number;
};
type Form = { id?: string; name: string; district: string; area_code: string; signup_code: string; active: boolean; retention_months: number };
const EMPTY: Form = { name: "", district: "", area_code: "", signup_code: "", active: true, retention_months: 24 };
const RETENTION = [
  { v: 12, label: "1 year" },
  { v: 24, label: "2 years (default)" },
  { v: 36, label: "3 years" },
  { v: 60, label: "5 years" },
  { v: 0, label: "Until the contract ends" },
];

// Super admins: create schools and manage each school's reusable sign-up code.
export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [signupUrl, setSignupUrl] = useState("relaytext.io/signup");
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [search, setSearch] = useState("");
  const [wipe, setWipe] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ schools: School[]; signupUrl: string; viewerIsSuper: boolean }>("/api/admin/schools");
      setSchools(d.schools);
      setSignupUrl(d.signupUrl);
      setIsSuper(!!d.viewerIsSuper);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function flash(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 2000);
  }

  function inviteText(s: School) {
    return `Below are your sign up details for Relay, an easy to use texting platform that provides real-time translation- perfect for communicating with multi-lingual parents. Your personal number will never be exposed.\n\nSign up at ${signupUrl} with code ${s.signup_code}.`;
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/schools", { method: form.id ? "PATCH" : "POST", body: form });
      setForm(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function newCode() {
    if (!form?.id) return;
    if (!confirm("Generate a new code? The current code stops working right away.")) return;
    try {
      const r = await api("/api/admin/schools", { method: "PATCH", body: { id: form.id, action: "new_code" } });
      setForm({ ...form, signup_code: r.code, active: true });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(target?: { id?: string; name: string }) {
    const t = target || form;
    if (!t?.id || !confirm(`Delete ${t.name}? This can't be undone.`)) return;
    try {
      await api(`/api/admin/schools?id=${t.id}`, { method: "DELETE" });
      setForm(null);
      flash(`Deleted ${t.name}`);
      await load();
    } catch (e: any) {
      if (target) alert(e.message);
      else setError(e.message);
    }
  }

  const edit = (s: School) =>
    setForm({
      id: s.id,
      name: s.name,
      district: s.district || "",
      area_code: s.area_code || "",
      signup_code: s.signup_code || "",
      active: s.active,
      retention_months: typeof s.retention_months === "number" ? s.retention_months : 24,
    });

  const q = search.trim().toLowerCase();
  const shown = (schools || []).filter((s) => !q || [s.name, s.district || "", s.signup_code || "", s.area_code || ""].join(" ").toLowerCase().includes(q));

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="settings-body admin-wide">
        <AdminTitle
          title="Manage Schools"
          sub={schools ? `${schools.length} ${schools.length === 1 ? "school" : "schools"} · each has a sign-up code teachers use to join` : undefined}
        />
        {error && !form && <p className="sheet-error">{error}</p>}
        {!schools && !error && <p className="ios-footnote top">Loading…</p>}
        {schools && (
          <>
            <div className="admin-toolbar">
              <input
                className="admin-search"
                placeholder="Search school, district or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search schools"
              />
              {isSuper && (
                <span className="toolbar-actions">
                  <button className="pill-btn add-pill" onClick={() => setForm({ ...EMPTY })}>
                    <Plus size={16} /> Add School
                  </button>
                </span>
              )}
            </div>

            <div className="table-wrap">
              <table className="staff-table schools-table">
                <thead>
                  <tr>
                    <th><span className="th-plain">School</span></th>
                    <th><span className="th-plain">Sign-up code</span></th>
                    <th><span className="th-plain">Area code</span></th>
                    <th className="num"><span className="th-plain">Teachers</span></th>
                    <th className="num"><span className="th-plain">Parents</span></th>
                    <th><span className="th-plain">Status</span></th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s.id} className={s.active ? "" : "off"} onClick={() => isSuper && edit(s)}>
                      <td>
                        <span className="cell-name">{s.name}</span>
                        {s.district && <span className="cell-sub">{s.district}</span>}
                      </td>
                      <td>
                        <span className={`code-cell ${s.active && s.signup_code ? "" : "code-off"}`}>{s.signup_code || "—"}</span>
                      </td>
                      <td>{s.area_code || <span className="muted">—</span>}</td>
                      <td className="num">
                        <a href={`/admin/teachers?school=${s.id}`} onClick={(e) => e.stopPropagation()}>
                          {s.teachers}
                        </a>
                      </td>
                      <td className="num">{s.parents}</td>
                      <td>
                        <span className={`status-pill ${s.active ? "active" : "disabled"}`}>{s.active ? "Code on" : "Code off"}</span>
                      </td>
                      <td className="cell-edit" onClick={(e) => e.stopPropagation()}>
                        {isSuper && (
                          <>
                            <button className="link-btn row-link" onClick={() => edit(s)}>
                              Edit
                            </button>
                            <button className="link-btn row-link danger-text" onClick={() => remove(s)}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={7}>{q ? "No schools match." : "No schools yet. Click Add School to create one."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="ios-footnote table-foot">
              Teachers who sign up at {signupUrl} with a school’s code join that school automatically. A school can only be deleted when it
              has no teachers; to stop new sign-ups, turn its code off instead. To erase everything for a school (its request, or the end of its
              contract), open it and choose Delete All School Data.
            </p>
            {isSuper && <DemoData schools={schools} onChange={load} />}
          </>
        )}
      </div>

      {form && (
        <Sheet
          title={form.id ? form.name || "School" : "New School"}
          onCancel={() => {
            setForm(null);
            setError("");
          }}
          action={{ label: form.id ? "Save" : "Add", onClick: save, busy, disabled: !form.name.trim() }}
        >
          <div className="ios-group">
            <label className="ios-row">
              <span className="ios-row-label">name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Elk Elementary" autoFocus={!form.id} />
            </label>
            <label className="ios-row">
              <span className="ios-row-label">district</span>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Optional" />
            </label>
            <label className="ios-row">
              <span className="ios-row-label">area code</span>
              <input
                inputMode="numeric"
                maxLength={3}
                value={form.area_code}
                onChange={(e) => setForm({ ...form, area_code: e.target.value.replace(/\D/g, "") })}
                placeholder="For teachers' numbers, e.g. 303"
              />
            </label>
          </div>

          <p className="ios-section">Message history</p>
          <div className="ios-group">
            <label className="ios-row">
              <span className="ios-row-label">keep for</span>
              <select value={form.retention_months} onChange={(e) => setForm({ ...form, retention_months: Number(e.target.value) })}>
                {RETENTION.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="ios-footnote">
            Older messages are deleted automatically each night. Parents who replied STOP stay blocked. Match this to the school’s contract or
            records schedule.
          </p>

          <p className="ios-section">Sign-up code</p>
          <div className="ios-group">
            <label className="ios-row">
              <span className="ios-row-label">code</span>
              <input
                className="code-field"
                inputMode="numeric"
                maxLength={5}
                value={form.signup_code}
                onChange={(e) => setForm({ ...form, signup_code: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                placeholder={form.id ? "None" : "Leave blank to generate"}
              />
            </label>
            {form.id && (
              <label className="ios-row switch-row">
                <span>
                  Code works
                  <span className="ios-row-hint">Turn off to stop new sign-ups with this code. Existing teachers aren’t affected.</span>
                </span>
                <input type="checkbox" className="ios-switch" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              </label>
            )}
            {form.id && (
              <button className="ios-row action-row" onClick={newCode}>
                Generate New Code
              </button>
            )}
            {form.id && form.signup_code && (
              <button
                className="ios-row action-row"
                onClick={() => {
                  const s = schools?.find((x) => x.id === form.id);
                  if (s) navigator.clipboard?.writeText(inviteText({ ...s, signup_code: form.signup_code }));
                  flash("Invite message copied");
                }}
              >
                Copy Invite Message
              </button>
            )}
          </div>
          <p className="ios-footnote">
            Anyone with this code can create a teacher account at this school, so share it only with staff.
          </p>

          {form.id && (
            <div className="ios-group">
              <a className="ios-row nav-row" href={`/admin/teachers?school=${form.id}`}>
                View Teachers
                <ChevronRight size={13} className="row-chev" />
              </a>
              <button className="ios-row danger" onClick={() => setWipe({ id: form.id!, name: form.name })}>
                Delete All School Data…
              </button>
              <button className="ios-row danger" onClick={() => remove()}>
                Delete School
              </button>
            </div>
          )}
          {error && <p className="sheet-error">{error}</p>}
        </Sheet>
      )}
      {wipe && (
        <DeleteSchoolData
          school={wipe}
          onClose={(deleted) => {
            setWipe(null);
            if (deleted) {
              setForm(null);
              load();
            }
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

type Summary = {
  school: string;
  teachers: number;
  parents: number;
  conversations: number;
  messages: number;
  groups: number;
  keptAccounts: string[];
  schoolDeleted?: boolean;
  deletedAt?: string;
};

const n = (x: number, one: string, many = `${one}s`) => `${x.toLocaleString()} ${x === 1 ? one : many}`;

// Super admins: permanently delete everything Relay holds for one school (a school's request, or its contract ended).
// Needs a preview, a checkbox and the school's name typed exactly; the server checks the name again.
function DeleteSchoolData({ school, onClose }: { school: { id: string; name: string }; onClose: (deleted: boolean) => void }) {
  const [preview, setPreview] = useState<Summary | null>(null);
  const [done, setDone] = useState<Summary | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<{ preview: Summary }>(`/api/admin/schools/data?id=${school.id}`)
      .then((d) => setPreview(d.preview))
      .catch((e) => setErr(e.message));
  }, [school.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose(!!done);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, done, onClose]);

  const nameOk = typed.trim() === school.name.trim();
  const ready = !!preview && understood && nameOk && !busy;

  async function run() {
    if (!ready) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ deleted: Summary }>("/api/admin/schools/data", { method: "POST", body: { id: school.id, confirmName: typed } });
      setDone(r.deleted);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const confirmation = done
    ? `On ${new Date(done.deletedAt || Date.now()).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}, Relay permanently deleted all student and family information it held for ${done.school}: ${n(done.parents, "parent")} on the Parents list, ${n(done.conversations, "conversation")} (${n(done.messages, "message")}), ${n(done.groups, "group")} and ${n(done.teachers, "staff account")}. Backup copies kept by our database provider and delivery logs kept by our texting provider expire on those providers' own schedules.`
    : "";

  const counts = (s: Summary) => (
    <ul className="wipe-list">
      <li>{n(s.parents, "parent")} on the Parents list</li>
      <li>
        {n(s.conversations, "conversation")} and {n(s.messages, "message")}
      </li>
      <li>{n(s.teachers, "teacher account")}, with their logins and Relay phone numbers</li>
      <li>{n(s.groups, "group")}, plus unused sign-up codes</li>
    </ul>
  );

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose(!!done)}>
      <div className="sheet wipe-sheet" role="alertdialog" aria-modal="true" aria-label={`Delete all data for ${school.name}`}>
        <div className="sheet-bar">
          <button className="bar-btn" onClick={() => onClose(!!done)} disabled={busy}>
            {done ? "Done" : "Cancel"}
          </button>
          <div className="sheet-title">{done ? "Data Deleted" : "Delete All School Data"}</div>
          <span className="bar-btn" />
        </div>
        <div className="sheet-body">
          {done ? (
            <>
              <p className="wipe-ok">All of {done.school}’s data has been permanently deleted.</p>
              {counts(done)}
              {done.keptAccounts.length > 0 && (
                <p className="ios-footnote">
                  Kept: {done.keptAccounts.join(", ")} (super admin account{done.keptAccounts.length === 1 ? "" : "s"}), so the school itself was not
                  removed. Move {done.keptAccounts.length === 1 ? "it" : "them"} to another school, then delete the school if you like.
                </p>
              )}
              <p className="ios-section">Written confirmation for the school or district</p>
              <div className="wipe-confirm-text">{confirmation}</div>
              <button
                className="pill-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(confirmation);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy confirmation"}
              </button>
            </>
          ) : (
            <>
              <div className="wipe-warn">
                <b>This permanently deletes everything Relay holds for {school.name}.</b> It can’t be undone, and there is no way to get the data
                back.
              </div>
              {!preview && !err && <p className="ios-footnote">Counting what will be deleted…</p>}
              {preview && (
                <>
                  <p className="wipe-lead">This will delete:</p>
                  {counts(preview)}
                  {preview.keptAccounts.length > 0 && (
                    <p className="ios-footnote">
                      Not deleted: {preview.keptAccounts.join(", ")} (super admin). Only their conversations with this school’s parents are removed.
                    </p>
                  )}
                  <label className="wipe-check">
                    <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} disabled={busy} />
                    <span>I understand this permanently deletes this school’s parents, conversations and teacher accounts, and can’t be undone.</span>
                  </label>
                  <label className="wipe-type">
                    <span>
                      Type <b>{school.name}</b> to confirm
                    </span>
                    <input
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder={school.name}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                      onKeyDown={(e) => e.key === "Enter" && run()}
                    />
                  </label>
                  <button className="wipe-btn" disabled={!ready} onClick={run}>
                    {busy ? "Deleting… (up to a minute)" : "Permanently Delete All Data"}
                  </button>
                </>
              )}
            </>
          )}
          {err && <p className="sheet-error">{err}</p>}
        </div>
      </div>
    </div>
  );
}

// Super admins: load a full set of sample teachers, parents and conversations for sales demos, and remove it before going live.
function DemoData({ schools, onChange }: { schools: School[]; onChange: () => void }) {
  const [status, setStatus] = useState<{ ready: boolean; teachers: number | null; parents: number | null; conversations: number | null } | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [busy, setBusy] = useState<"" | "load" | "wipe">("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    try {
      setStatus(await api("/api/admin/demo"));
    } catch (e: any) {
      setErr(e.message);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!schoolId && schools.length) setSchoolId((schools.find((s) => s.name === "Sagewood MS") || schools[0]).id);
  }, [schools, schoolId]);

  async function run(action: "load" | "wipe") {
    const school = schools.find((s) => s.id === schoolId)?.name || "this school";
    const ask =
      action === "load"
        ? `Load demo data into ${school}? This adds 20 sample teachers, about 220 parents and 60 days of conversations. Any demo data already loaded is replaced. Real accounts and conversations are not changed.`
        : "Remove all demo data? Only the sample teachers, parents, groups and conversations are deleted. Real accounts and conversations are not changed.";
    if (!confirm(ask)) return;
    setBusy(action);
    setErr("");
    setMsg("");
    try {
      const r: any = await api("/api/admin/demo", { method: "POST", body: { action, schoolId } });
      if (action === "load") {
        const l = r.loaded;
        setMsg(`Loaded into ${l.school}: ${l.teachers} teachers, ${l.parents} parents, ${l.groups} groups, ${l.conversations} conversations and ${l.messages} messages.${l.skippedTeachers ? ` ${l.skippedTeachers} teacher email(s) already belonged to a real account and were skipped.` : ""}`);
      } else {
        setMsg("Demo data removed.");
      }
      await refresh();
      onChange();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  const loaded = !!status?.teachers;
  return (
    <section className="demo-card">
      <h2>Demo data</h2>
      {status && !status.ready ? (
        <p className="ios-footnote">To use demo data, run the one-time demo SQL in Supabase first (it adds a “demo” flag to four tables).</p>
      ) : (
        <>
          <p className="demo-sub">
            {loaded
              ? `Loaded: ${status!.teachers} sample teachers, ${status!.parents} parents and ${status!.conversations} conversations.`
              : "Fill a school with 20 sample teachers, about 220 parents in many languages, groups, and 60 days of two-way conversations that grow over time. Every sample row is marked, so removing it never touches real data."}
          </p>
          <div className="demo-actions">
            <label>
              School
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="pill-btn" disabled={!!busy || !schoolId} onClick={() => run("load")}>
              {busy === "load" ? "Loading… (up to a minute)" : loaded ? "Reload demo data" : "Load demo data"}
            </button>
            {loaded && (
              <button className="pill-btn danger-pill" disabled={!!busy} onClick={() => run("wipe")}>
                {busy === "wipe" ? "Removing…" : "Remove demo data"}
              </button>
            )}
          </div>
        </>
      )}
      {msg && <p className="demo-ok">{msg}</p>}
      {err && <p className="sheet-error">{err}</p>}
    </section>
  );
}
