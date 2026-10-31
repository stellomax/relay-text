"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { api } from "@/lib/client";
import { SAMPLE_REPLIES } from "@/lib/format";
import { languageName } from "@/lib/languages";
import type { Contact } from "@/lib/db";

// Demo helper: pretend the parent texted back, so translation can be shown without a second phone.
export default function DemoReply({ contact, onClose, onSent }: { contact: Contact; onClose: () => void; onSent: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const samples = SAMPLE_REPLIES[contact.language] || SAMPLE_REPLIES[contact.language.split("-")[0]] || [];

  async function send() {
    setBusy(true);
    setError("");
    try {
      await api("/api/simulate", { body: { contactId: contact.id, text } });
      onSent();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Sheet title="Demo Reply" onCancel={onClose} action={{ label: "Receive", onClick: send, busy, disabled: !text.trim() }}>
      <p className="ios-footnote top">
        Type a reply as if you were {contact.parent_name}, in {languageName(contact.language)} or any language. It
        arrives in the conversation translated to English, exactly like a real text.
      </p>
      <div className="ios-group">
        <textarea
          dir="auto"
          rows={4}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={samples[0] || "Type the parent's reply"}
        />
      </div>
      {samples.length > 0 && (
        <>
          <p className="ios-section">Examples</p>
          <div className="chips">
            {samples.map((s) => (
              <button key={s} className="chip" dir="auto" onClick={() => setText(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="sheet-error">{error}</p>}
    </Sheet>
  );
}
