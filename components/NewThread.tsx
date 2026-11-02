"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ParentPicker, { canText, type GroupLite } from "./ParentPicker";
import Sheet from "./Sheet";
import { ArrowUp, Check, ChevronLeft } from "./icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import type { Parent } from "@/lib/parents";

type Summary = { sent: number; simulated: number; failed: number; skipped: number; errors: { contact: string; error: string }[] };

// New Message, in the same right-hand window as a conversation:
// "To:" at the top, choose parents (or a group, or everyone) in the middle, type at the bottom like any text.
export default function NewThread({
  initialGroupId,
  onBack,
  onSent,
  headerRight,
}: {
  initialGroupId?: string | null;
  onBack: () => void;
  onSent: (r: { contactIds: string[]; count: number }) => void;
  headerRight?: React.ReactNode;
}) {
  const [parents, setParents] = useState<Parent[] | null>(null);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ summary: Summary; count: number } | null>(null);
  const [showAllTo, setShowAllTo] = useState(false);
  const [picking, setPickingState] = useState(!initialGroupId);
  // What was chosen when the pop-up opened, so Cancel can put it back.
  const before = useRef<Set<string>>(new Set());
  const setPicking = (open: boolean) => {
    if (open) before.current = new Set(selected);
    setPickingState(open);
  };
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([api<{ parents: Parent[] }>("/api/parents"), api<{ groups: GroupLite[] }>("/api/groups").catch(() => ({ groups: [] as GroupLite[] }))])
      .then(([p, g]) => {
        setParents(p.parents);
        setGroups(g.groups);
        const start = g.groups.find((x) => x.id === initialGroupId);
        if (start) {
          const ok = new Set(p.parents.filter(canText).map((x) => x.id));
          setSelected(new Set(start.parentIds.filter((id) => ok.has(id))));
          setTimeout(() => input.current?.focus(), 50);
        } else setPicking(true);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grow the text box with the message, like Messages.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  const recipients = useMemo(() => (parents || []).filter((p) => selected.has(p.id) && canText(p)), [parents, selected]);
  const n = recipients.length;
  const langs = useMemo(() => {
    const m = new Map<string, number>();
    recipients.forEach((p) => m.set(p.language, (m.get(p.language) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [recipients]);

  // Close the chooser and go straight to typing.
  const donePicking = () => {
    setPicking(false);
    setTimeout(() => input.current?.focus(), 60);
  };
  // Cancel: undo changes made in the pop-up. If nobody is chosen and nothing is typed, leave New Message.
  const cancelPicking = () => {
    const restored = before.current || new Set<string>();
    setSelected(new Set(restored));
    setPickingState(false);
    if (!restored.size && !draft.trim()) onBack();
  };

  const remove = (id: string) => {
    const s = new Set(selected);
    s.delete(id);
    setSelected(s);
  };

  async function send() {
    const text = draft.trim();
    if (!text || !n || busy) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<{ summary: Summary; contactIds: string[] }>("/api/send", { body: { text, parentIds: recipients.map((p) => p.id) } });
      setDraft("");
      if (n === 1 && d.contactIds.length === 1 && !d.summary.failed) {
        onSent({ contactIds: d.contactIds, count: 1 }); // opens the conversation
        return;
      }
      setDone({ summary: d.summary, count: n });
      setSelected(new Set());
      onSent({ contactIds: d.contactIds, count: n });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const shown = showAllTo ? recipients : recipients.slice(0, 6);

  return (
    <section className="thread new-thread">
      <header className="thread-bar new-bar">
        <button className="back-btn" onClick={onBack} aria-label="Back to conversations">
          <ChevronLeft />
        </button>
        <div className="new-title">New Message</div>
        <div className="thread-bar-right">{headerRight}</div>
      </header>

      {!done && (
        <div
          className="to-line clickable"
          role="button"
          tabIndex={0}
          onClick={() => setPicking(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPicking(true))}
          aria-label="Choose recipients"
        >
          <span className="to-label">To:</span>
          <span className="to-chips">
            {n === 0 && <span className="to-hint">Tap here to choose parents</span>}
            {shown.map((p) => (
              <span key={p.id} className="to-chip">
                {p.parent_name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p.id);
                  }}
                  aria-label={`Remove ${p.parent_name}`}
                >
                  ×
                </button>
              </span>
            ))}
            {!showAllTo && n > shown.length && (
              <button
                className="link-btn to-more"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTo(true);
                }}
              >
                +{n - shown.length} more
              </button>
            )}
          </span>
          <span className="to-add" aria-hidden>
            {n ? "Change" : "Choose"}
          </span>
        </div>
      )}

      <div className="scroller new-scroller">
        {done ? (
          <div className="new-done">
            <div className="gm-done" aria-hidden>
              <Check size={30} />
            </div>
            <p className="fam-result-big">
              Sent to {done.summary.sent + done.summary.simulated} {done.summary.sent + done.summary.simulated === 1 ? "parent" : "parents"}
              {done.summary.simulated > 0 && done.summary.sent === 0 ? " (demo mode)" : ""}
            </p>
            <p className="ios-footnote center-text">
              Each parent got their own private text in their language. Replies show up in your conversations on the left, in English.
            </p>
            {done.summary.failed > 0 && (
              <ul className="fam-errors">
                {done.summary.errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.contact}</strong>: {e.error}
                  </li>
                ))}
              </ul>
            )}
            <button className="ios-button big" onClick={() => setDone(null)}>
              Write Another Message
            </button>
          </div>
        ) : (
          <div className="thread-empty new-empty">
            {n === 0 ? (
              <>
                <p>Start by choosing who to text.</p>
                <button className="ios-button big" onClick={() => setPicking(true)}>
                  Choose Parents
                </button>
              </>
            ) : (
              <p>
                Type your message below in English. {n === 1 ? `${recipients[0].parent_name} gets` : "Each parent gets"} a regular text in
                their own language, and replies come back to you in English.
              </p>
            )}
          </div>
        )}
      </div>

      {error && <div className="thread-note error-note">{error}</div>}
      {!done && n > 0 && (
        <div className="thread-note">
          {n === 1 ? `${recipients[0].parent_name} gets it in ${languageName(recipients[0].language)}.` : `Each parent gets a private text in their language: ${langs.map(([l, k]) => `${languageName(l)} (${k})`).join(", ")}.`}
        </div>
      )}
      {!done && (
        <footer className="composer">
          <div className="pill">
            <textarea
              ref={input}
              rows={1}
              value={draft}
              readOnly={!n}
              onFocus={() => !n && setPicking(true)}
              placeholder={n ? `Text Message to ${n} ${n === 1 ? "parent" : "parents"}` : "Choose parents first"}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  send();
                }
              }}
              aria-label="Message"
            />
            {draft.trim() && n > 0 && (
              <button className="send-btn" onClick={send} disabled={busy} aria-label="Send">
                <ArrowUp />
              </button>
            )}
          </div>
        </footer>
      )}

      {picking && !done && (
        <Sheet
          title={n ? `${n} ${n === 1 ? "Parent" : "Parents"} Chosen` : "Choose Parents"}
          cancelLabel="Cancel"
          onCancel={cancelPicking}
          action={{ label: "Done", onClick: donePicking }}
        >
          {parents === null && !error && <p className="ios-footnote top">Loading parents…</p>}
          {parents && (
            <>
              <ParentPicker parents={parents} selected={selected} onChange={setSelected} groups={groups} onlyTextable autoFocus />
              {parents.length === 0 && <p className="ios-footnote">Your school’s Parents list is empty. An admin adds parents to the list.</p>}
            </>
          )}
          <div className="compose-foot">
            {n >= 2 && (
              <SaveAsGroup
                parentIds={recipients.map((p) => p.id)}
                groups={groups}
                onSaved={(list) => setGroups(list)}
              />
            )}
            <button className="ios-button big" onClick={donePicking}>
              {n ? `Done: Write Message (${n})` : "Done"}
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

// "Save these parents as a group": turn what's ticked into one of the teacher's groups, without leaving the chooser.
function SaveAsGroup({ parentIds, groups, onSaved }: { parentIds: string[]; groups: GroupLite[]; onSaved: (groups: GroupLite[]) => void }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  // Nothing to offer if these exact parents are already a group.
  const key = [...parentIds].sort().join(",");
  const already = groups.find((g) => [...g.parentIds].sort().join(",") === key);
  if (saved && already) return <p className="save-group done">✓ Saved as “{saved}”. It’s in My Groups now.</p>;
  if (already) return null;

  async function save() {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<{ groups: GroupLite[] }>("/api/groups", { body: { name: n, parentIds } });
      setSaved(n);
      setNaming(false);
      setName("");
      onSaved(d.groups);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!naming) {
    return (
      <button className="link-btn save-group" onClick={() => setNaming(true)}>
        + Save these {parentIds.length} parents as a group
      </button>
    );
  }
  return (
    <div className="save-group-form">
      <input
        autoFocus
        value={name}
        placeholder="Group name, e.g. Period 2"
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            setNaming(false);
          }
        }}
        aria-label="Group name"
      />
      <button className="pill-btn" disabled={!name.trim() || busy} onClick={save}>
        {busy ? "Saving…" : "Save Group"}
      </button>
      <button className="link-btn" onClick={() => setNaming(false)}>
        Cancel
      </button>
      {error && <p className="sheet-error">{error}</p>}
    </div>
  );
}
