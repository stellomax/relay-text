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
  teachers: number;
  parents: number;
};
type Form = { id?: string; name: string; district: string; area_code: string; signup_code: string; active: boolean };
const EMPTY: Form = { name: "", district: "", area_code: "", signup_code: "", active: true };

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
    return `Join ${s.name} on Relay: go to ${signupUrl} and enter sign-up code ${s.signup_code}.`;
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
              has no teachers; to stop new sign-ups, turn its code off instead.
            </p>
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
              <button className="ios-row danger" onClick={() => remove()}>
                Delete School
              </button>
            </div>
          )}
          {error && <p className="sheet-error">{error}</p>}
        </Sheet>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
