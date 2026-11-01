"use client";

import { useMemo, useState } from "react";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import { Check } from "./icons";
import { allGroups } from "./NewMessage";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { prettyPhone } from "@/lib/phone";
import type { Contact } from "@/lib/db";

type Summary = { sent: number; simulated: number; failed: number; skipped: number; errors: { contact: string; error: string }[] };

const canText = (c: Contact) => !c.opted_out && !!c.consent_at;
const why = (c: Contact) => (c.opted_out ? "Opted out" : !c.consent_at ? "Needs consent" : "");

// Message several or all families, without leaving Messages: choose → write → sent.
export default function GroupMessage({
  contacts,
  initialSelected,
  onClose,
}: {
  contacts: Contact[];
  initialSelected?: string[];
  onClose: (sent: boolean) => void;
}) {
  const [step, setStep] = useState<"pick" | "write">(initialSelected?.length ? "write" : "pick");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected || []));
  const recipients = contacts.filter((c) => selected.has(c.id) && canText(c));

  if (step === "write") {
    return <Broadcast recipients={recipients} onBack={() => setStep("pick")} onClose={onClose} />;
  }
  return (
    <Picker
      contacts={contacts}
      selected={selected}
      setSelected={setSelected}
      onCancel={() => onClose(false)}
      onNext={() => setStep("write")}
    />
  );
}

function Picker({
  contacts,
  selected,
  setSelected,
  onCancel,
  onNext,
}: {
  contacts: Contact[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const groups = useMemo(() => allGroups(contacts), [contacts]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return [...contacts]
      .filter((c) => {
        const gs = c.groups || [];
        if (group && !gs.some((g) => g.toLowerCase() === group.toLowerCase())) return false;
        if (!q) return true;
        return (
          c.parent_name.toLowerCase().includes(q) ||
          (c.child_name || "").toLowerCase().includes(q) ||
          gs.some((g) => g.toLowerCase().includes(q)) ||
          (digits.length >= 3 && c.phone.includes(digits))
        );
      })
      .sort((a, b) => a.parent_name.localeCompare(b.parent_name));
  }, [contacts, query, group]);

  const selectable = shown.filter(canText);
  const allOn = selectable.length > 0 && selectable.every((c) => selected.has(c.id));
  const count = contacts.filter((c) => selected.has(c.id) && canText(c)).length;

  const toggle = (c: Contact) => {
    if (!canText(c)) return;
    const n = new Set(selected);
    n.has(c.id) ? n.delete(c.id) : n.add(c.id);
    setSelected(n);
  };
  const toggleAll = () => {
    const n = new Set(selected);
    if (allOn) selectable.forEach((c) => n.delete(c.id));
    else selectable.forEach((c) => n.add(c.id));
    setSelected(n);
  };

  return (
    <Sheet
      title={count ? `${count} Selected` : "Choose Families"}
      onCancel={onCancel}
      action={{ label: "Next", onClick: onNext, disabled: !count }}
    >
      <div className="to-row">
        <span className="to-label">Find:</span>
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, student or group" />
      </div>

      {groups.length > 0 && (
        <div className="fam-groups gm-groups">
          <button className={`group-chip ${!group ? "on" : ""}`} onClick={() => setGroup(null)}>
            All
          </button>
          {groups.map((g) => (
            <button key={g} className={`group-chip ${group === g ? "on" : ""}`} onClick={() => setGroup(group === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="ios-group gm-list">
        <button className="gm-row gm-all" onClick={toggleAll} disabled={!selectable.length}>
          <span className={`fam-check ${allOn ? "on" : ""}`}>{allOn && <Check />}</span>
          <span className="gm-all-label">
            {allOn ? "Deselect all" : "Select all"}
            {group ? ` in ${group}` : ""} ({selectable.length})
          </span>
        </button>
        {shown.map((c) => {
          const on = selected.has(c.id);
          const blocked = why(c);
          return (
            <button key={c.id} className={`gm-row ${on ? "on" : ""} ${blocked ? "blocked" : ""}`} onClick={() => toggle(c)} disabled={!!blocked}>
              <span className={`fam-check ${on ? "on" : ""}`}>{on && <Check />}</span>
              <Avatar name={c.parent_name} size={34} />
              <span className="fam-text">
                <span className="fam-name">
                  {c.parent_name}
                  {c.child_name && <span className="fam-child"> · {c.child_name}</span>}
                </span>
                <span className="fam-sub">
                  {blocked ? blocked : `${languageName(c.language)} · ${prettyPhone(c.phone)}`}
                  {(c.groups || []).length > 0 && ` · ${(c.groups || []).join(", ")}`}
                </span>
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="fam-none">No families match.</p>}
      </div>
      {contacts.some((c) => !canText(c)) && (
        <p className="ios-footnote">Grayed-out families opted out or need consent confirmed in Family Info.</p>
      )}
    </Sheet>
  );
}

// Write one message and send it to every chosen family — each gets a separate, private text in their language.
export function Broadcast({
  recipients,
  onBack,
  onClose,
}: {
  recipients: Contact[];
  onBack?: () => void;
  onClose: (sent: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Summary | null>(null);
  const [showAll, setShowAll] = useState(false);

  const active = recipients.filter(canText);
  const left = recipients.length - active.length;
  const byLang = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of active) m.set(c.language, (m.get(c.language) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [active]);

  async function send() {
    if (!text.trim() || !active.length) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<{ summary: Summary }>("/api/send", { body: { text, contactIds: active.map((c) => c.id) } });
      setResult(d.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const done = result.sent + result.simulated;
    return (
      <Sheet title="Sent" onCancel={() => onClose(true)} cancelLabel="" action={{ label: "Done", onClick: () => onClose(true) }}>
        <div className="fam-result">
          <div className="gm-done" aria-hidden>
            <Check size={30} />
          </div>
          <p className="fam-result-big">
            Sent to {done} {done === 1 ? "family" : "families"}
            {result.simulated > 0 && result.sent === 0 ? " (demo mode)" : ""}
          </p>
          <p className="ios-footnote center-text">Each family got their own private text in their language. Replies show up in Messages.</p>
          {result.failed > 0 && (
            <>
              <p className="sheet-error">{result.failed} couldn’t be sent:</p>
              <ul className="fam-errors">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.contact}</strong>: {e.error}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button className="ios-button" onClick={() => onClose(true)}>
            Done
          </button>
        </div>
      </Sheet>
    );
  }

  const names = active.map((c) => c.parent_name);
  const preview = showAll ? names : names.slice(0, 5);
  const n = active.length;
  return (
    <Sheet
      title="New Message"
      onCancel={onBack || (() => onClose(false))}
      cancelLabel={onBack ? "‹ Back" : "Cancel"}
      action={{ label: busy ? "Sending…" : "Send", onClick: send, busy, disabled: !text.trim() || !n }}
    >
      <div className="ios-group">
        <div className="ios-row fam-to">
          <span className="to-label">To:</span>
          <span className="fam-to-names">
            <strong>
              {n} {n === 1 ? "family" : "families"}
            </strong>
            {n > 0 && " — "}
            {preview.join(", ")}
            {!showAll && names.length > preview.length && (
              <>
                {" "}
                <button className="link-btn" onClick={() => setShowAll(true)}>
                  +{names.length - preview.length} more
                </button>
              </>
            )}
          </span>
        </div>
      </div>
      <div className="ios-group">
        <textarea
          rows={6}
          autoFocus
          placeholder="Write your message in English"
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <p className="ios-footnote">
        {byLang.length > 0 && <>Each family gets it in their language: {byLang.map(([l, k]) => `${languageName(l)} (${k})`).join(", ")}. </>}
        Texts are private — no one sees who else got it.
        {left > 0 && ` ${left} opted-out or unconfirmed ${left === 1 ? "family is" : "families are"} left out.`}
      </p>
      {error && <p className="sheet-error">{error}</p>}
      <button className="ios-button" disabled={busy || !text.trim() || !n} onClick={send}>
        {busy ? "Sending…" : `Send to ${n} ${n === 1 ? "Family" : "Families"}`}
      </button>
    </Sheet>
  );
}
