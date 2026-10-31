"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Thread from "@/components/Thread";
import NewMessage from "@/components/NewMessage";
import ContactSheet from "@/components/ContactSheet";
import DemoReply from "@/components/DemoReply";
import { ChevronRight, Compose, Gear, Search } from "@/components/icons";
import { api } from "@/lib/client";
import { listTime } from "@/lib/format";
import { prettyPhone } from "@/lib/phone";
import type { Contact, Message } from "@/lib/db";

type Conversation = { contact: Contact; last: Partial<Message> | null; unread: number };
type SheetKind = "new" | "info" | "demo" | null;

function readSelected(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("c");
}

export default function Messages() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
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

  useEffect(() => {
    setSelectedId(readSelected());
    const onPop = () => setSelectedId(readSelected());
    window.addEventListener("popstate", onPop);
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 4000);
    return () => {
      clearInterval(t);
      window.removeEventListener("popstate", onPop);
    };
  }, [load]);

  // Opening a conversation pushes a history entry, so the phone's back gesture works.
  function open(id: string) {
    if (id !== selectedId) window.history.pushState({}, "", `/?c=${id}`);
    setSelectedId(id);
    setConvos((cs) => cs.map((c) => (c.contact.id === id ? { ...c, unread: 0 } : c)));
  }
  function back() {
    if (readSelected()) window.history.pushState({}, "", "/");
    setSelectedId(null);
    load();
  }

  const selected = convos.find((c) => c.contact.id === selectedId)?.contact || null;
  const otherUnread = convos.filter((c) => c.contact.id !== selectedId && c.unread > 0).length;

  const q = query.trim().toLowerCase();
  const rows = convos.filter(
    (c) =>
      (c.last || c.contact.id === selectedId) &&
      (!q ||
        [c.contact.parent_name, c.contact.child_name || "", c.contact.phone, c.last?.body_en || ""]
          .join(" ")
          .toLowerCase()
          .includes(q))
  );

  return (
    <div className={`app ${selectedId ? "show-thread" : ""}`}>
      <aside className="inbox">
        <div className="inbox-bar">
          <a className="icon-btn" href="/setup" aria-label="Settings" title="Settings">
            <Gear />
          </a>
          <button className="icon-btn" onClick={() => setSheet("new")} aria-label="New message" title="New message">
            <Compose />
          </button>
        </div>
        <div className="inbox-title">
          <img src="/relay-text-logo.png" alt="Relay Text" />
        </div>
        <div className="searchbar">
          <Search />
          <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {error && <p className="inbox-error">{error}</p>}

        {loaded && rows.length === 0 && !error && (
          <div className="inbox-empty">
            {q ? (
              <p>No results</p>
            ) : (
              <>
                <p className="inbox-empty-title">No Messages</p>
                <p>Tap the compose button to text a family in their own language.</p>
                <button className="ios-button small" onClick={() => setSheet("new")}>
                  New Message
                </button>
              </>
            )}
          </div>
        )}

        <ul className="convos">
          {rows.map(({ contact, last, unread }) => {
            const name = contact.parent_name.startsWith("Unknown ") ? prettyPhone(contact.phone) : contact.parent_name;
            return (
              <li key={contact.id}>
                <button
                  className={`convo ${unread ? "unread" : ""} ${contact.id === selectedId ? "selected" : ""}`}
                  onClick={() => open(contact.id)}
                >
                  <span className="dot" aria-label={unread ? "Unread" : undefined} />
                  <Avatar name={contact.parent_name} size={44} />
                  <span className="convo-main">
                    <span className="convo-top">
                      <span className="convo-name">{name}</span>
                      <span className="convo-time">
                        {last?.created_at ? listTime(last.created_at) : ""}
                        <ChevronRight size={12} />
                      </span>
                    </span>
                    <span className="convo-preview">{last?.body_en || "No messages yet"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="pane">
        {selected ? (
          <Thread
            contact={selected}
            backBadge={otherUnread}
            onBack={back}
            onChanged={load}
            onOpenInfo={() => setSheet("info")}
            onOpenDemo={() => setSheet("demo")}
            refreshKey={refreshKey}
          />
        ) : (
          <div className="pane-empty">
            <img src="/icon-192.png" alt="" width={72} height={72} />
            <p>Choose a conversation, or start a new one.</p>
          </div>
        )}
      </main>

      {sheet === "new" && (
        <NewMessage
          contacts={convos.map((c) => c.contact)}
          onCancel={() => setSheet(null)}
          onPick={async (id) => {
            setSheet(null);
            await load();
            open(id);
          }}
        />
      )}
      {sheet === "info" && selected && (
        <ContactSheet
          contact={selected}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            load();
          }}
          onDeleted={() => {
            setSheet(null);
            back();
          }}
        />
      )}
      {sheet === "demo" && selected && (
        <DemoReply
          contact={selected}
          onClose={() => setSheet(null)}
          onSent={() => {
            setSheet(null);
            setRefreshKey((k) => k + 1);
            load();
          }}
        />
      )}
    </div>
  );
}
