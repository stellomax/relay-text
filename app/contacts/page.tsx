"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { LANGUAGES, languageName } from "@/lib/languages";
import { prettyPhone } from "@/lib/phone";
import type { Contact } from "@/lib/db";

type Form = { id?: string; parent_name: string; child_name: string; phone: string; language: string; opted_out?: boolean };
const EMPTY: Form = { parent_name: "", child_name: "", phone: "", language: "es" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await api<{ contacts: Contact[] }>("/api/contacts");
      setContacts(d.contacts);
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/contacts", { method: form.id ? "PATCH" : "POST", body: form });
      setForm(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Contact) {
    if (!confirm(`Delete ${c.parent_name} and their whole conversation? This can't be undone.`)) return;
    try {
      await api(`/api/contacts?id=${c.id}`, { method: "DELETE" });
      setForm(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Families</h1>
          <p className="muted">Each family gets texts in their own language. No app needed on their phone.</p>
        </div>
        <button className="btn primary" onClick={() => { setError(""); setForm({ ...EMPTY }); }}>
          Add family
        </button>
      </div>

      {error && !form && <div className="alert error">{error}</div>}

      {form && (
        <form className="card form-grid" onSubmit={save}>
          <h2 className="span-2">{form.id ? "Edit family" : "Add a family"}</h2>
          <label>
            Parent / guardian name
            <input value={form.parent_name} onChange={set("parent_name")} required autoFocus />
          </label>
          <label>
            Student name
            <input value={form.child_name} onChange={set("child_name")} placeholder="Optional" />
          </label>
          <label>
            Mobile number
            <input value={form.phone} onChange={set("phone")} placeholder="(303) 555-1234" inputMode="tel" required />
          </label>
          <label>
            Home language
            <select value={form.language} onChange={set("language")}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} — {l.native}
                </option>
              ))}
            </select>
          </label>
          {form.id && (
            <label className="check span-2">
              <input
                type="checkbox"
                checked={!!form.opted_out}
                onChange={(e) => setForm((f) => (f ? { ...f, opted_out: e.target.checked } : f))}
              />
              Opted out of texts (they replied STOP)
            </label>
          )}
          {error && <div className="alert error span-2">{error}</div>}
          <div className="row span-2">
            <button className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            {form.id && (
              <button
                type="button"
                className="btn danger push-right"
                onClick={() => remove(contacts.find((c) => c.id === form.id)!)}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}

      <div className="card table-card">
        {contacts.length === 0 ? (
          <div className="empty small">
            <p>No families yet. Add one to start texting.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Parent / guardian</th>
                <th>Student</th>
                <th>Mobile</th>
                <th>Language</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.parent_name}
                    {c.opted_out && <span className="tag warn">Opted out</span>}
                  </td>
                  <td>{c.child_name || <span className="muted">—</span>}</td>
                  <td className="nowrap">{prettyPhone(c.phone)}</td>
                  <td>{languageName(c.language)}</td>
                  <td className="right">
                    <button
                      className="link-btn"
                      onClick={() => {
                        setError("");
                        setForm({
                          id: c.id,
                          parent_name: c.parent_name,
                          child_name: c.child_name || "",
                          phone: c.phone,
                          language: c.language,
                          opted_out: c.opted_out,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
