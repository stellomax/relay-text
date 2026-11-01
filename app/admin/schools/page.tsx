"use client";

import { useCallback, useEffect, useState } from "react";
import Sheet from "@/components/Sheet";
import { ChevronLeft, ChevronRight, Plus } from "@/components/icons";
import { api } from "@/lib/client";

type School = {
  id: string;
  name: string;
  district: string | null;
  area_code: string | null;
  signup_code: string | null;
  active: boolean;
  teachers: number;
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

  const load = useCallback(async () => {
    try {
      const d = await api<{ schools: School[]; signupUrl: string }>("/api/admin/schools");
      setSchools(d.schools);
      setSignupUrl(d.signupUrl);
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
    return `Join ${s.name} on RelayText: go to ${signupUrl} and enter sign-up code ${s.signup_code}.`;
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

  async function remove() {
    if (!form?.id || !confirm(`Delete ${form.name}?`)) return;
    try {
      await api(`/api/admin/schools?id=${form.id}`, { method: "DELETE" });
      setForm(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/admin">
          <ChevronLeft /> Teachers
        </a>
        <div className="settings-title">Schools</div>
        <button className="icon-btn add-btn" onClick={() => setForm({ ...EMPTY })} aria-label="Add school" title="Add school">
          <Plus size={20} />
        </button>
      </header>

      <div className="settings-body">
        {error && !form && <p className="sheet-error">{error}</p>}
        {!schools && !error && <p className="ios-footnote top">Loading…</p>}
        {schools && (
          <>
            <p className="ios-footnote top">
              Each school has a reusable sign-up code. Teachers who sign up at {signupUrl} with a school’s code join that
              school automatically.
            </p>
            <p className="ios-section">Schools · {schools.length}</p>
            <div className="ios-group">
              {schools.map((s) => (
                <button
                  key={s.id}
                  className={`ios-row person-row ${s.active ? "" : "off"}`}
                  onClick={() =>
                    setForm({
                      id: s.id,
                      name: s.name,
                      district: s.district || "",
                      area_code: s.area_code || "",
                      signup_code: s.signup_code || "",
                      active: s.active,
                    })
                  }
                >
                  <span className={`invite-code ${s.active && s.signup_code ? "" : "code-off"}`}>{s.signup_code || "—"}</span>
                  <span className="person-main">
                    <span className="person-name">
                      {s.name}
                      {!s.active && <span className="tag-off">Code off</span>}
                    </span>
                    <span className="ios-row-hint">
                      {s.district ? `${s.district} · ` : ""}
                      {s.teachers} {s.teachers === 1 ? "teacher" : "teachers"}
                      {s.area_code ? ` · area ${s.area_code}` : ""}
                    </span>
                  </span>
                  <ChevronRight size={13} className="row-chev" />
                </button>
              ))}
              {schools.length === 0 && <div className="ios-row muted">No schools yet. Tap + to add one.</div>}
            </div>
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
              <a className="ios-row nav-row" href={`/admin?school=${form.id}`}>
                View Teachers
                <ChevronRight size={13} className="row-chev" />
              </a>
              <button className="ios-row danger" onClick={remove}>
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
