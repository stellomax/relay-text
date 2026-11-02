"use client";

import { useEffect, useMemo, useState } from "react";
import Sheet from "./Sheet";
import ParentPicker, { canText, type GroupLite } from "./ParentPicker";
import { Check } from "./icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import type { Parent } from "@/lib/parents";

type Summary = { sent: number; simulated: number; failed: number; skipped: number; errors: { contact: string; error: string }[] };

// New Message, in two plain steps: 1) choose parents from the list (or a group), 2) write in English and send.
// Each parent gets their own private text in their language.
export default function Compose({
  initialGroupId,
  initialParentIds,
  onClose,
}: {
  initialGroupId?: string | null;
  initialParentIds?: string[];
  onClose: (opts?: { sent?: boolean; openContactId?: string }) => void;
}) {
  const [parents, setParents] = useState<Parent[] | null>(null);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialParentIds || []));
  const [step, setStep] = useState<"pick" | "write" | "done">("pick");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: Summary; contactIds: string[] } | null>(null);

  useEffect(() => {
    Promise.all([api<{ parents: Parent[] }>("/api/parents"), api<{ groups: GroupLite[] }>("/api/groups").catch(() => ({ groups: [] }))])
      .then(([p, g]) => {
        setParents(p.parents);
        setGroups(g.groups);
        const start = g.groups.find((x) => x.id === initialGroupId);
        if (start) {
          const ok = new Set(p.parents.filter((x) => canText(x)).map((x) => x.id));
          setSelected(new Set(start.parentIds.filter((id) => ok.has(id))));
          setStep("write");
        } else if (initialParentIds?.length) setStep("write");
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recipients = useMemo(() => (parents || []).filter((p) => selected.has(p.id) && canText(p)), [parents, selected]);
  const n = recipients.length;
  const plural = (k: number) => (k === 1 ? "parent" : "parents");

  async function send() {
    if (!text.trim() || !n) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<{ summary: Summary; contactIds: string[] }>("/api/send", { body: { text, parentIds: recipients.map((p) => p.id) } });
      setResult(d);
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && result) {
    const done = result.summary.sent + result.summary.simulated;
    const single = n === 1 && result.contactIds.length === 1 ? result.contactIds[0] : null;
    return (
      <Sheet title="Sent" cancelLabel="" onCancel={() => onClose({ sent: true })}>
        <div className="fam-result">
          <div className="gm-done" aria-hidden>
            <Check size={30} />
          </div>
          <p className="fam-result-big">
            Sent to {done} {plural(done)}
            {result.summary.simulated > 0 && result.summary.sent === 0 ? " (demo mode)" : ""}
          </p>
          <p className="ios-footnote center-text">Each parent got their own private text in their language. Their replies will show up in Messages, in English.</p>
          {result.summary.failed > 0 && (
            <>
              <p className="sheet-error">{result.summary.failed} couldn’t be sent:</p>
              <ul className="fam-errors">
                {result.summary.errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.contact}</strong>: {e.error}
                  </li>
                ))}
              </ul>
            </>
          )}
          {single ? (
            <button className="ios-button big" onClick={() => onClose({ sent: true, openContactId: single })}>
              Open Conversation
            </button>
          ) : (
            <button className="ios-button big" onClick={() => onClose({ sent: true })}>
              Done
            </button>
          )}
        </div>
      </Sheet>
    );
  }

  if (step === "write") {
    const byLang = new Map<string, number>();
    recipients.forEach((p) => byLang.set(p.language, (byLang.get(p.language) || 0) + 1));
    const names = recipients.map((p) => p.parent_name);
    return (
      <Sheet title="New Message" cancelLabel="‹ Back" onCancel={() => setStep("pick")}>
        <p className="compose-step">
          <span className="compose-step-num">2</span> Write your message in English
        </p>
        <div className="ios-group">
          <div className="ios-row fam-to">
            <span className="to-label">To:</span>
            <span className="fam-to-names">
              <strong>
                {n} {plural(n)}
              </strong>
              {n > 0 && " — "}
              {names.slice(0, 6).join(", ")}
              {names.length > 6 && ` and ${names.length - 6} more`}
            </span>
          </div>
        </div>
        <div className="ios-group">
          <textarea
            rows={6}
            autoFocus
            placeholder="Type your message here"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            aria-label="Message"
          />
        </div>
        <p className="ios-footnote">
          {byLang.size > 0 && (
            <>
              Relay translates it for each parent:{" "}
              {[...byLang.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([l, k]) => `${languageName(l)}${byLang.size > 1 ? ` (${k})` : ""}`)
                .join(", ")}
              .{" "}
            </>
          )}
          {n > 1 && "Each parent gets a separate, private text."}
        </p>
        {error && <p className="sheet-error">{error}</p>}
        <div className="compose-foot">
          <button className="ios-button big" disabled={busy || !text.trim() || !n} onClick={send}>
            {busy ? "Sending…" : `Send to ${n} ${plural(n)}`}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="New Message" onCancel={() => onClose()}>
      <p className="compose-step">
        <span className="compose-step-num">1</span> Choose who to text
      </p>
      {error && <p className="sheet-error">{error}</p>}
      {!parents && !error && <p className="ios-footnote top">Loading parents…</p>}
      {parents && (
        <ParentPicker parents={parents} selected={selected} onChange={setSelected} groups={groups} onlyTextable autoFocus />
      )}
      {parents && parents.length === 0 && (
        <p className="ios-footnote">Your school’s Parents list is empty. An admin adds parents to the list.</p>
      )}
      <div className="compose-foot">
        <button className="ios-button big" disabled={!n} onClick={() => setStep("write")}>
          {n ? `Next: Write Message (${n} ${plural(n)})` : "Choose at least one parent"}
        </button>
      </div>
    </Sheet>
  );
}
