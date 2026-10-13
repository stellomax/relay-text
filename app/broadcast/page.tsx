"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import type { Contact } from "@/lib/db";

type List = { id: string; name: string; contact_ids: string[] };
type Summary = { sent: number; simulated: number; failed: number; skipped: number; errors: { contact: string; error: string }[] };

export default function BroadcastPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [listId, setListId] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Summary | null>(null);

  useEffect(() => {
    Promise.all([api("/api/contacts"), api("/api/lists")])
      .then(([c, l]) => {
        setContacts(c.contacts);
        setLists(l.lists);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const l = lists.find((x) => x.id === listId);
    if (l) setPicked(l.contact_ids);
  }, [listId, lists]);

  useEffect(() => setPreviews(null), [text, picked]);

  const recipients = useMemo(() => contacts.filter((c) => picked.includes(c.id)), [contacts, picked]);
  const active = recipients.filter((c) => !c.opted_out);
  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    active.forEach((c) => counts.set(c.language, (counts.get(c.language) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [active]);

  function toggle(id: string) {
    setListId("");
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function preview() {
    setPreviewing(true);
    setError("");
    try {
      const d = await api("/api/translate", { body: { text, languages: languages.map(([l]) => l) } });
      setPreviews(d.previews);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function send() {
    if (!confirm(`Send this to ${active.length} ${active.length === 1 ? "family" : "families"} as separate private texts?`)) return;
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/send", { body: { text, contactIds: picked, listId: listId || null } });
      setResult(d.summary);
      setText("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Broadcast</h1>
          <p className="muted">
            Write once in English. Each family gets their own private text in their language, and replies land in their
            own thread.
          </p>
        </div>
      </div>

      {result && (
        <div className="alert success">
          <strong>Done.</strong>{" "}
          {result.sent > 0 && `${result.sent} sent. `}
          {result.simulated > 0 && `${result.simulated} sent in demo mode. `}
          {result.skipped > 0 && `${result.skipped} skipped (opted out). `}
          {result.failed > 0 && `${result.failed} failed: ${result.errors.map((e) => `${e.contact} (${e.error})`).join("; ")}`}
          <a href="/" className="push-right">
            Go to inbox →
          </a>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}

      <div className="broadcast-grid">
        <div className="card stack">
          <h2>1. Who</h2>
          <label>
            Saved list
            <select value={listId} onChange={(e) => setListId(e.target.value)}>
              <option value="">Pick families by hand</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.contact_ids.length})
                </option>
              ))}
            </select>
          </label>
          <div className="field-label">
            {picked.length} selected
            <button type="button" className="link-btn" onClick={() => { setListId(""); setPicked(contacts.map((c) => c.id)); }}>
              Select all
            </button>
            <button type="button" className="link-btn" onClick={() => { setListId(""); setPicked([]); }}>
              Clear
            </button>
          </div>
          <div className="pick-list">
            {contacts.map((c) => (
              <label key={c.id} className={`pick ${picked.includes(c.id) ? "on" : ""} ${c.opted_out ? "disabled" : ""}`}>
                <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
                <span>
                  <strong>{c.parent_name}</strong>
                  <span className="muted small-text">
                    {languageName(c.language)}
                    {c.opted_out ? " · opted out" : ""}
                  </span>
                </span>
              </label>
            ))}
            {contacts.length === 0 && <p className="muted">Add families first.</p>}
          </div>
        </div>

        <div className="card stack">
          <h2>2. Message</h2>
          <textarea
            rows={6}
            placeholder="e.g. Reminder: parent-teacher conferences are this Thursday from 4 to 7 pm in the library."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="muted small-text">
            {languages.length
              ? `Goes out in ${languages.length} ${languages.length === 1 ? "language" : "languages"}: ${languages
                  .map(([l, n]) => `${languageName(l)} (${n})`)
                  .join(", ")}`
              : "Pick at least one family."}
          </div>
          <div className="row">
            <button className="btn ghost" onClick={preview} disabled={!text.trim() || !languages.length || previewing}>
              {previewing ? "Translating…" : "Preview translations"}
            </button>
            <button className="btn primary push-right" onClick={send} disabled={busy || !text.trim() || !active.length}>
              {busy ? "Sending…" : `Send to ${active.length} ${active.length === 1 ? "family" : "families"}`}
            </button>
          </div>
          {previews && (
            <div className="previews">
              {languages.map(([l]) => (
                <div key={l} className="preview">
                  <span className="alt-label">{languageName(l)}</span>
                  <span dir="auto">{previews[l]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
