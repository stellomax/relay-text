"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api, timeLabel } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { prettyPhone } from "@/lib/phone";
import type { Contact, Message } from "@/lib/db";

type Conversation = { contact: Contact; last: Partial<Message> | null; unread: number };

const STATUS_LABEL: Record<string, string> = {
  queued: "Sending…",
  accepted: "Sending…",
  sending: "Sending…",
  sent: "Sent",
  delivered: "Delivered",
  undelivered: "Not delivered",
  failed: "Failed",
  simulated: "Demo",
  received: "",
};

export default function Inbox() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const [simText, setSimText] = useState("");
  const [simBusy, setSimBusy] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const selected = convos.find((c) => c.contact.id === selectedId)?.contact || null;

  const loadConvos = useCallback(async () => {
    try {
      const d = await api<{ conversations: Conversation[] }>("/api/conversations");
      setConvos(d.conversations);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const d = await api<{ messages: Message[] }>(`/api/messages?contactId=${id}`);
    setMessages(d.messages);
  }, []);

  useEffect(() => {
    loadConvos();
    const t = setInterval(loadConvos, 5000);
    return () => clearInterval(t);
  }, [loadConvos]);

  useEffect(() => {
    if (!selectedId) return;
    setMessages([]);
    lastCount.current = 0;
    loadThread(selectedId).catch(() => {});
    const t = setInterval(() => loadThread(selectedId).catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      threadEnd.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => setPreview(null), [draft, selectedId]);

  async function send() {
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const d = await api("/api/send", { body: { text: draft, contactIds: [selected.id] } });
      if (d.summary.failed) setError(d.summary.errors[0]?.error || "Message failed.");
      if (d.summary.skipped) setError("This family has opted out (they replied STOP).");
      setDraft("");
      await Promise.all([loadThread(selected.id), loadConvos()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function showPreview() {
    if (!selected || !draft.trim()) return;
    try {
      const d = await api("/api/translate", { body: { text: draft, languages: [selected.language] } });
      setPreview(d.previews[selected.language]);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function simulate() {
    if (!selected || !simText.trim()) return;
    setSimBusy(true);
    try {
      await api("/api/simulate", { body: { contactId: selected.id, text: simText } });
      setSimText("");
      setSimOpen(false);
      await Promise.all([loadThread(selected.id), loadConvos()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSimBusy(false);
    }
  }

  const filtered = convos.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.contact.parent_name, c.contact.child_name || "", c.contact.phone].join(" ").toLowerCase().includes(q);
  });

  return (
    <Shell wide>
      <div className={`inbox ${selectedId ? "has-thread" : ""}`}>
        <aside className="convo-list">
          <div className="convo-head">
            <input
              className="search"
              placeholder="Search families"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loaded && convos.length === 0 && (
            <div className="empty small">
              <p>No families yet.</p>
              <a className="btn primary" href="/contacts">
                Add a family
              </a>
            </div>
          )}
          <ul>
            {filtered.map(({ contact, last, unread }) => (
              <li key={contact.id}>
                <button
                  className={`convo ${selectedId === contact.id ? "selected" : ""} ${unread ? "unread" : ""}`}
                  onClick={() => setSelectedId(contact.id)}
                >
                  <span className="avatar" aria-hidden>
                    {contact.parent_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="convo-body">
                    <span className="convo-top">
                      <span className="convo-name">{contact.parent_name}</span>
                      <span className="convo-time">{last?.created_at ? timeLabel(last.created_at) : ""}</span>
                    </span>
                    <span className="convo-child">
                      {contact.child_name ? `${contact.child_name} · ` : ""}
                      {languageName(contact.language)}
                      {contact.opted_out ? " · opted out" : ""}
                    </span>
                    <span className="convo-snippet">
                      {last ? `${last.direction === "outbound" ? "You: " : ""}${last.body_en}` : "No messages yet"}
                    </span>
                  </span>
                  {unread > 0 && <span className="badge">{unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="thread">
          {!selected ? (
            <div className="empty">
              <h2>Pick a family to start</h2>
              <p className="muted">
                You write in English. They get a normal text in their language, and their replies come back in English.
              </p>
            </div>
          ) : (
            <>
              <div className="thread-head">
                <button className="back link-btn" onClick={() => setSelectedId(null)}>
                  ← Inbox
                </button>
                <div>
                  <div className="thread-name">{selected.parent_name}</div>
                  <div className="muted small-text">
                    {selected.child_name ? `Parent of ${selected.child_name} · ` : ""}
                    {prettyPhone(selected.phone)} · texts in <strong>{languageName(selected.language)}</strong>
                  </div>
                </div>
              </div>

              <div className="messages">
                {messages.length === 0 && <p className="muted center">No messages yet. Say hello below.</p>}
                {messages.map((m) => {
                  const out = m.direction === "outbound";
                  const showOriginal = m.body_translated && m.body_translated !== m.body_en;
                  return (
                    <div key={m.id} className={`bubble-row ${out ? "out" : "in"}`}>
                      <div className={`bubble ${out ? "out" : "in"}`}>
                        <div className="bubble-main">{m.body_en}</div>
                        {showOriginal && (
                          <div className="bubble-alt">
                            <span className="alt-label">
                              {out ? "They received" : "They wrote"} · {languageName(m.language)}
                            </span>
                            <span dir="auto">{m.body_translated}</span>
                          </div>
                        )}
                        {m.error && m.status === "failed" && <div className="bubble-error">{m.error}</div>}
                      </div>
                      <div className="bubble-meta">
                        {timeLabel(m.created_at)}
                        {out && m.status && STATUS_LABEL[m.status] !== "" ? ` · ${STATUS_LABEL[m.status] || m.status}` : ""}
                        {!out && m.simulated ? " · Demo reply" : ""}
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEnd} />
              </div>

              {error && <div className="alert error inline">{error}</div>}

              {simOpen && (
                <div className="sim-box">
                  <div className="sim-title">
                    Demo: type a reply as if you were {selected.parent_name} (any language)
                  </div>
                  <div className="composer">
                    <textarea
                      rows={2}
                      dir="auto"
                      placeholder="e.g. Gracias, estaremos allí el jueves."
                      value={simText}
                      onChange={(e) => setSimText(e.target.value)}
                    />
                    <button className="btn" disabled={simBusy || !simText.trim()} onClick={simulate}>
                      {simBusy ? "…" : "Receive"}
                    </button>
                  </div>
                </div>
              )}

              {preview && (
                <div className="preview">
                  <span className="alt-label">Preview in {languageName(selected.language)}</span>
                  <span dir="auto">{preview}</span>
                </div>
              )}

              <div className="composer">
                <textarea
                  rows={2}
                  placeholder={
                    selected.opted_out ? "This family opted out of texts." : `Write in English. Sent in ${languageName(selected.language)}.`
                  }
                  value={draft}
                  disabled={selected.opted_out}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <div className="composer-actions">
                  <button className="btn ghost" onClick={showPreview} disabled={!draft.trim()}>
                    Preview
                  </button>
                  <button className="btn primary" onClick={send} disabled={sending || !draft.trim() || selected.opted_out}>
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
              <div className="composer-foot">
                <button className="link-btn small-text" onClick={() => setSimOpen((v) => !v)}>
                  {simOpen ? "Hide demo reply" : "Simulate a reply from this parent"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
