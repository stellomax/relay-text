"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import type { Contact } from "@/lib/db";

type List = { id: string; name: string; contact_ids: string[] };
type Edit = { id?: string; name: string; contact_ids: string[] };

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [l, c] = await Promise.all([api("/api/lists"), api("/api/contacts")]);
      setLists(l.lists);
      setContacts(c.contacts);
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setEdit((e) =>
      e ? { ...e, contact_ids: e.contact_ids.includes(id) ? e.contact_ids.filter((x) => x !== id) : [...e.contact_ids, id] } : e
    );
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/lists", { method: edit.id ? "PATCH" : "POST", body: edit });
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this list? The families and their conversations stay.")) return;
    await api(`/api/lists?id=${id}`, { method: "DELETE" }).catch((e) => setError(e.message));
    setEdit(null);
    load();
  }

  const name = (id: string) => contacts.find((c) => c.id === id)?.parent_name;

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Saved lists</h1>
          <p className="muted">
            A list is just a shortcut for picking families. Broadcasts still go out as separate private texts. Nobody
            sees anyone else.
          </p>
        </div>
        <button className="btn primary" onClick={() => setEdit({ name: "", contact_ids: [] })}>
          New list
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {edit && (
        <form className="card stack" onSubmit={save}>
          <h2>{edit.id ? "Edit list" : "New list"}</h2>
          <label>
            List name
            <input
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="e.g. 3rd grade ESL families"
              required
              autoFocus
            />
          </label>
          <div>
            <div className="field-label">
              Families ({edit.contact_ids.length} selected)
              <button type="button" className="link-btn" onClick={() => setEdit({ ...edit, contact_ids: contacts.map((c) => c.id) })}>
                Select all
              </button>
              <button type="button" className="link-btn" onClick={() => setEdit({ ...edit, contact_ids: [] })}>
                Clear
              </button>
            </div>
            <div className="pick-grid">
              {contacts.map((c) => (
                <label key={c.id} className={`pick ${edit.contact_ids.includes(c.id) ? "on" : ""}`}>
                  <input type="checkbox" checked={edit.contact_ids.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>
                    <strong>{c.parent_name}</strong>
                    <span className="muted small-text">
                      {c.child_name ? `${c.child_name} · ` : ""}
                      {languageName(c.language)}
                    </span>
                  </span>
                </label>
              ))}
              {contacts.length === 0 && <p className="muted">Add families first.</p>}
            </div>
          </div>
          <div className="row">
            <button className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save list"}
            </button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
            {edit.id && (
              <button type="button" className="btn danger push-right" onClick={() => remove(edit.id!)}>
                Delete list
              </button>
            )}
          </div>
        </form>
      )}

      <div className="list-cards">
        {lists.map((l) => (
          <div key={l.id} className="card list-card">
            <div className="list-card-head">
              <h3>{l.name}</h3>
              <button className="link-btn" onClick={() => setEdit({ id: l.id, name: l.name, contact_ids: l.contact_ids })}>
                Edit
              </button>
            </div>
            <p className="muted small-text">
              {l.contact_ids.length} {l.contact_ids.length === 1 ? "family" : "families"}
            </p>
            <p className="small-text">{l.contact_ids.map(name).filter(Boolean).slice(0, 6).join(", ")}{l.contact_ids.length > 6 ? "…" : ""}</p>
          </div>
        ))}
        {lists.length === 0 && !edit && (
          <div className="card empty small">
            <p>No lists yet. Make one to broadcast to a group of families in one click.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
