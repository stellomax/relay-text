"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { ArrowUp, Alert, Bubble, ChevronLeft, ChevronRight, Ellipsis, Gear, Globe, Info, People, Plus, SignOut, Trash } from "./icons";
import { api } from "@/lib/client";
import { threadTime } from "@/lib/format";
import { languageName } from "@/lib/languages";
import { prettyPhone } from "@/lib/phone";
import type { Contact, Message } from "@/lib/db";

type Pending = Message & { pending?: boolean };

const GROUP_GAP_MS = 5 * 60 * 1000; // bubbles closer than this share a tail
const STAMP_GAP_MS = 60 * 60 * 1000; // a centered time label after an hour's gap
const FAILED = ["failed", "undelivered"];

export default function Thread({
  contact,
  backBadge,
  onBack,
  onChanged,
  onOpenInfo,
  onOpenDemo,
  refreshKey,
  readOnly = false,
  ownerLabel,
  isAdmin = false,
}: {
  contact: Contact;
  backBadge: number;
  onBack: () => void;
  onChanged: () => void;
  onOpenInfo: () => void;
  onOpenDemo: () => void;
  refreshKey: number;
  readOnly?: boolean;
  ownerLabel?: string;
  isAdmin?: boolean;
}) {
  const [messages, setMessages] = useState<Pending[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [showTranslations, setShowTranslations] = useState(true);
  const [openError, setOpenError] = useState<string | null>(null);
  const [sendError, setSendError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lastId = useRef<string>("");

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function deleteConversation() {
    setMenuOpen(false);
    if (!confirm(`Delete the conversation with ${contact.parent_name}? This removes the family and all messages, and can't be undone.`)) return;
    try {
      await api(`/api/contacts?id=${contact.id}`, { method: "DELETE" });
      onChanged();
      onBack();
    } catch (e: any) {
      setSendError(e.message);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  const load = useCallback(async () => {
    const d = await api<{ messages: Message[] }>(`/api/messages?contactId=${contact.id}`);
    setMessages((prev) => [...d.messages, ...prev.filter((m) => m.pending)]);
    setLoaded(true);
  }, [contact.id]);

  useEffect(() => {
    setMessages([]);
    setLoaded(false);
    setDraft("");
    setSendError("");
    lastId.current = "";
    load().catch(() => setLoaded(true));
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load().catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (refreshKey) load().catch(() => {});
  }, [refreshKey, load]);

  // Stick to the bottom when a new message arrives, like Messages.
  useLayoutEffect(() => {
    const last = messages[messages.length - 1];
    const id = last ? last.id : "";
    if (id !== lastId.current) {
      const first = lastId.current === "";
      lastId.current = id;
      const el = scroller.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: first ? "auto" : "smooth" });
    }
  }, [messages]);

  // Grow the text field with its content.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [draft]);

  async function send() {
    const text = draft.trim();
    if (!text || contact.opted_out) return;
    const temp: Pending = {
      id: `pending-${Date.now()}`,
      contact_id: contact.id,
      direction: "outbound",
      body_en: text,
      body_translated: null,
      language: contact.language,
      status: "sending",
      error: null,
      twilio_sid: null,
      is_read: true,
      simulated: false,
      sent_by: null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((m) => [...m, temp]);
    setDraft("");
    setSendError("");
    input.current?.focus();
    try {
      const d = await api("/api/send", { body: { text, contactIds: [contact.id] } });
      if (d.summary.skipped) setSendError("This family opted out of texts (they replied STOP).");
      const fresh = await api<{ messages: Message[] }>(`/api/messages?contactId=${contact.id}`);
      setMessages((prev) => [...fresh.messages, ...prev.filter((m) => m.pending && m.id !== temp.id)]);
      onChanged();
    } catch (e: any) {
      setMessages((m) => m.map((x) => (x.id === temp.id ? { ...x, status: "failed", error: e.message } : x)));
    }
  }

  // Which outbound message gets the "Delivered" line: the last one, as in Messages.
  const lastOutIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].direction === "outbound") return i;
    return -1;
  })();

  const lang = languageName(contact.language);
  const name = contact.parent_name.startsWith("Unknown ") ? prettyPhone(contact.phone) : contact.parent_name;

  return (
    <section className="thread">
      <header className="thread-bar">
        <button className="back-btn" onClick={onBack} aria-label="Back to conversations">
          <ChevronLeft />
          {backBadge > 0 && <span className="back-badge">{backBadge}</span>}
        </button>
        <button className="thread-who" onClick={onOpenInfo}>
          <Avatar name={contact.parent_name} size={44} />
          <span className="thread-name">
            {name}
            <ChevronRight size={11} className="who-chev" />
          </span>
          <span className="thread-lang">{lang}</span>
        </button>
        <div className="menu-wrap" ref={menuRef}>
          <button
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Ellipsis />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button role="menuitem" onClick={() => (setMenuOpen(false), onOpenInfo())}>
                Family Info <Info />
              </button>
              {!readOnly && (
                <button role="menuitem" onClick={() => (setMenuOpen(false), onOpenDemo())}>
                  Simulate Parent Reply <Bubble />
                </button>
              )}
              {!readOnly && (
                <button role="menuitem" className="danger" onClick={deleteConversation}>
                  Delete Conversation <Trash />
                </button>
              )}
              <div className="menu-sep" />
              <a role="menuitem" href="/setup">
                Settings <Gear size={20} />
              </a>
              {isAdmin && (
                <a role="menuitem" href="/admin">
                  Manage Teachers <People />
                </a>
              )}
              <button role="menuitem" onClick={signOut}>
                Sign Out <SignOut />
              </button>
            </div>
          )}
        </div>
      </header>

      {contact.language !== "en" && (
        <div className="translate-row">
          <button
            className={`translate-toggle ${showTranslations ? "on" : ""}`}
            onClick={() => setShowTranslations((v) => !v)}
            aria-pressed={showTranslations}
            title={showTranslations ? `Hide the ${lang} text` : `Show the ${lang} text`}
          >
            Translate <Globe size={18} />
          </button>
        </div>
      )}

      <div className="scroller" ref={scroller}>
        {loaded && messages.length === 0 && (
          <div className="thread-empty">
            <p>
              Write in English. {name.split(" ")[0]} gets a regular text in <strong>{lang}</strong>, and replies come
              back in English.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const t = new Date(m.created_at).getTime();
          const stamp = !prev || t - new Date(prev.created_at).getTime() > STAMP_GAP_MS;
          const joinsPrev = !!prev && !stamp && prev.direction === m.direction && t - new Date(prev.created_at).getTime() < GROUP_GAP_MS;
          const nextStamp = !!next && new Date(next.created_at).getTime() - t > STAMP_GAP_MS;
          const joinsNext =
            !!next && !nextStamp && next.direction === m.direction && new Date(next.created_at).getTime() - t < GROUP_GAP_MS;
          const out = m.direction === "outbound";
          const failed = FAILED.includes(m.status || "");
          const other = m.body_translated && m.body_translated !== m.body_en ? m.body_translated : null;
          const label = threadTime(m.created_at);
          return (
            <Fragment key={m.id}>
              {stamp && (
                <div className="stamp">
                  <strong>{label.day}</strong> {label.time}
                </div>
              )}
              <div className={`row ${out ? "out" : "in"} ${joinsPrev ? "joined" : ""} ${failed ? "failed" : ""}`}>
                <div
                  className={`bubble ${out ? "out" : "in"} ${joinsNext ? "" : "tail"} ${m.pending ? "pending" : ""}`}
                  onClick={() => failed && setOpenError(openError === m.id ? null : m.id)}
                >
                  <div className="text">{m.body_en}</div>
                  {showTranslations && other && (
                    <div className="translation" dir="auto">
                      <span className="tr-label">
                        <Globe size={11} /> {out ? "Sent in" : "Original"} · {languageName(m.language)}
                      </span>
                      {other}
                    </div>
                  )}
                  {showTranslations && out && m.pending && contact.language !== "en" && (
                    <div className="translation">
                      <span className="tr-label">
                        <Globe size={11} /> Translating to {lang}…
                      </span>
                    </div>
                  )}
                </div>
                {failed && (
                  <button className="fail-icon" onClick={() => setOpenError(openError === m.id ? null : m.id)} aria-label="Why it wasn't delivered">
                    <Alert />
                  </button>
                )}
              </div>
              {failed ? (
                <div className="receipt error">
                  Not Delivered{openError === m.id && m.error ? ` · ${m.error}` : ""}
                </div>
              ) : (
                i === lastOutIdx && <div className="receipt">{receipt(m)}</div>
              )}
              {!out && m.simulated && !joinsNext && <div className="demo-tag">Demo reply</div>}
            </Fragment>
          );
        })}
      </div>

      {sendError && <div className="thread-note">{sendError}</div>}
      {contact.opted_out && (
        <div className="thread-note">
          {name} opted out of texts by replying STOP. They can reply START to receive texts again.
        </div>
      )}

      {readOnly ? (
        <footer className="composer readonly-bar">
          Viewing {ownerLabel ? `${ownerLabel}’s` : "this"} conversation. Only {ownerLabel || "they"} can reply.
        </footer>
      ) : (
      <footer className="composer">
        <button className="plus-btn" onClick={onOpenDemo} aria-label="Demo: simulate a reply" title="Demo: simulate a reply from this parent">
          <Plus />
        </button>
        <div className="pill">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            disabled={contact.opted_out}
            placeholder={contact.opted_out ? "Opted out" : `Text Message · ${lang}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                send();
              }
            }}
          />
          {draft.trim() && (
            <button className="send-btn" onClick={send} aria-label="Send">
              <ArrowUp />
            </button>
          )}
        </div>
      </footer>
      )}
    </section>
  );
}

function receipt(m: Pending): string {
  switch (m.status) {
    case "sending":
    case "queued":
    case "accepted":
      return m.pending ? "Sending…" : "Sent";
    case "delivered":
      return "Delivered";
    case "simulated":
      return "Delivered · Demo";
    default:
      return "Sent";
  }
}
