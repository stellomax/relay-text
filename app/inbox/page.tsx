"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Thread from "@/components/Thread";
import NewThread from "@/components/NewThread";
import GroupsSheet from "@/components/GroupsSheet";
import ContactSheet from "@/components/ContactSheet";
import DemoReply from "@/components/DemoReply";
import { ChevronRight, Compose as ComposeIcon, Search } from "@/components/icons";
import MainMenu, { type Me, type ConversationActions } from "@/components/MainMenu";
import { api } from "@/lib/client";
import { listTime } from "@/lib/format";
import { prettyPhone } from "@/lib/phone";
import type { Contact, Message } from "@/lib/db";

type Conversation = { contact: Contact; last: Partial<Message> | null; unread: number };
type Inbox = { id: string; label: string; sub?: string };
type SheetKind = "info" | "demo" | null;

function readParams() {
  if (typeof window === "undefined") return { c: null as string | null, as: null as string | null };
  const p = new URLSearchParams(window.location.search);
  return { c: p.get("c"), as: p.get("as") };
}

function url(c: string | null, as: string | null) {
  const p = new URLSearchParams();
  if (as) p.set("as", as);
  if (c) p.set("c", c);
  const q = p.toString();
  return q ? `/inbox?${q}` : "/inbox";
}

export default function Messages() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [as, setAs] = useState<string | null>(null);
  const [inboxes, setInboxes] = useState<Inbox[] | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [composeGroup, setComposeGroup] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [pickedInbox, setPickedInbox] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const asRef = useRef<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<{ me: Me }>("/api/me")
      .then((d) => setMe(d.me))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const a = asRef.current;
      const d = await api<{ conversations: Conversation[]; inboxes?: Inbox[]; scope: { readOnly: boolean } }>(
        `/api/conversations${a ? `?as=${encodeURIComponent(a)}` : ""}`
      );
      if (a !== asRef.current) return; // the inbox changed while loading
      setConvos(d.conversations);
      setInboxes(d.inboxes || null);
      setReadOnly(!!d.scope?.readOnly);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const p = readParams();
      asRef.current = p.as;
      setAs(p.as);
      setSelectedId(p.c);
    };
    sync();
    const p = new URLSearchParams(window.location.search);
    if (p.get("groups")) {
      setGroupsOpen(true);
      p.delete("groups");
      const rest = p.toString();
      window.history.replaceState({}, "", rest ? `/inbox?${rest}` : "/inbox");
    }
    if (p.get("compose") || p.get("group")) {
      setComposeGroup(p.get("group"));
      setComposing(true);
      p.delete("compose");
      p.delete("group");
      const rest = p.toString();
      window.history.replaceState({}, "", rest ? `/inbox?${rest}` : "/inbox");
    }
    const onPop = () => {
      sync();
      setComposing(!!(window.history.state && window.history.state.compose));
      load();
    };
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
    setComposing(false);
    if (id !== selectedId) window.history.pushState({}, "", url(id, as));
    setSelectedId(id);
    setConvos((cs) => cs.map((c) => (c.contact.id === id && !readOnly ? { ...c, unread: 0 } : c)));
  }
  // Text Group (from My Groups): New Message with the group already chosen.
  function textGroup(id: string) {
    if (readOnly) return;
    window.history.pushState({ compose: 1 }, "", url(null, as));
    setSelectedId(null);
    setComposeGroup(id);
    setComposing(true);
  }
  function startNew() {
    if (readOnly) return;
    // A history entry, so the phone's back gesture closes New Message.
    window.history.pushState({ compose: 1 }, "", url(null, as));
    setSelectedId(null);
    setComposeGroup(null);
    setComposing(true);
  }
  function back() {
    setComposing(false);
    if (readParams().c) window.history.pushState({}, "", url(null, as));
    setSelectedId(null);
    load();
  }
  function switchInbox(id: string) {
    setPickedInbox(true);
    const next = !inboxes || id === inboxes[0]?.id ? null : id;
    asRef.current = next;
    setAs(next);
    setSelectedId(null);
    setConvos([]);
    setLoaded(false);
    window.history.pushState({}, "", url(null, next));
    load();
  }

  const selected = convos.find((c) => c.contact.id === selectedId)?.contact || null;

  async function deleteConversation(c: Contact) {
    if (!confirm(`Delete the conversation with ${c.parent_name}? All messages are removed. This can't be undone.`)) return;
    try {
      await api(`/api/contacts?id=${c.id}`, { method: "DELETE" });
      back();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const conversationActions: ConversationActions | null = selected
    ? {
        name: selected.parent_name,
        readOnly,
        onInfo: () => setSheet("info"),
        onDemo: () => setSheet("demo"),
        onDelete: () => deleteConversation(selected),
      }
    : null;
  const otherUnread = convos.filter((c) => c.contact.id !== selectedId && c.unread > 0).length;
  const currentInbox = inboxes?.find((i) => i.id === (as || inboxes[0]?.id));
  const asQuery = as ? `?as=${encodeURIComponent(as)}` : "";

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
    <div className={`app ${selectedId || composing ? "show-thread" : ""}`}>
      <aside className="inbox">
        <div className="inbox-bar">
          <img className="inbox-logo" src="/relay-text-logo.png" alt="RelayText" />
          <span className="inbox-bar-actions">
            {!readOnly && (
              <button className="new-msg-btn" onClick={() => startNew()}>
                <ComposeIcon size={18} /> New Message
              </button>
            )}
            {/* On phones the menu sits here; on wider screens it's at the top right of the conversation side. */}
            <span className="inbox-bar-menu">
              <MainMenu me={me} onTextGroup={textGroup} />
            </span>
          </span>
        </div>

        {inboxes && inboxes.length > 1 && (
          <label className="inbox-picker">
            <span className="inbox-picker-label">View inboxes</span>
            {/* Starts on "Select Here" while showing your own messages, so it's clear you can pick any teacher's inbox. */}
            <select value={as || (pickedInbox ? inboxes[0].id : "")} onChange={(e) => switchInbox(e.target.value)} aria-label="View inboxes">
              <option value="" disabled hidden>
                Select Here
              </option>
              {inboxes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                  {i.sub ? ` · ${i.sub}` : ""}
                </option>
              ))}
            </select>
            <ChevronRight size={12} className="picker-chev" />
          </label>
        )}
        {readOnly && currentInbox && (
          <p className="viewing-note">Viewing {currentInbox.label}’s conversations. Only they can reply.</p>
        )}

        <div className="searchbar">
          <Search />
          <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {error && <p className="inbox-error">{error}</p>}

        {loaded && rows.length === 0 && !error && (
          <div className="inbox-empty">
            {q ? (
              <p>No results</p>
            ) : readOnly ? (
              <p>No conversations yet.</p>
            ) : (
              <>
                <p className="inbox-empty-title">No messages yet</p>
                <ol className="how-steps">
                  <li>
                    Tap <strong>New Message</strong>
                  </li>
                  <li>Choose a parent, a group, or everyone</li>
                  <li>Write in English and tap Send</li>
                </ol>
                <p>Each parent gets the text in their own language. Their replies show up here in English.</p>
                <button className="ios-button big" onClick={() => startNew()}>
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
        {composing && !readOnly ? (
          <NewThread
            key={composeGroup || "new"}
            initialGroupId={composeGroup}
            onBack={back}
            headerRight={<MainMenu me={me} onTextGroup={textGroup} />}
            onSent={async (r) => {
              await load();
              if (r.count === 1 && r.contactIds[0]) open(r.contactIds[0]);
            }}
          />
        ) : selected ? (
          <Thread
            contact={selected}
            backBadge={otherUnread}
            onBack={back}
            onChanged={load}
            onOpenInfo={() => setSheet("info")}
            onOpenDemo={() => setSheet("demo")}
            refreshKey={refreshKey}
            readOnly={readOnly}
            ownerLabel={currentInbox?.label}
            headerRight={<MainMenu me={me} conversation={conversationActions} onTextGroup={textGroup} />}
          />
        ) : (
          <div className="pane-blank">
            <div className="pane-bar">
              <MainMenu me={me} onTextGroup={textGroup} />
            </div>
            <div className="pane-empty">
              <img src="/icon-192.png" alt="" width={72} height={72} />
              <p>
                {readOnly ? (
                  "Choose a conversation to view."
                ) : (
                  <>
                    Choose a conversation, or{" "}
                    <button className="link-btn" onClick={() => startNew()}>
                      start a new one
                    </button>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </main>

      {groupsOpen && (
        <GroupsSheet
          onClose={() => setGroupsOpen(false)}
          onTextGroup={(id) => {
            setGroupsOpen(false);
            textGroup(id);
          }}
        />
      )}
      {sheet === "info" && selected && (
        <ContactSheet
          contact={selected}
          readOnly={readOnly}
          isAdmin={me?.role === "admin"}
          moveOptions={
            inboxes
              ? inboxes.map((i) => ({
                  id: i.id === "unassigned" ? null : i.id,
                  label: i.id === "unassigned" ? "Main number (no teacher)" : i.id === me?.id ? `Me (${me.name})` : i.sub ? `${i.label} · ${i.sub}` : i.label,
                }))
              : undefined
          }
          onMoved={() => {
            setSheet(null);
            back();
          }}
          onClose={() => setSheet(null)}
          onDeleted={() => {
            setSheet(null);
            back();
          }}
        />
      )}
      {sheet === "demo" && selected && !readOnly && (
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
