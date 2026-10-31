"use client";

import { useMemo, useState } from "react";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import ContactFields, { ContactForm } from "./ContactFields";
import { Plus } from "./icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { prettyPhone, toE164 } from "@/lib/phone";
import type { Contact } from "@/lib/db";

// "New Message": pick an existing family from the To: field, or add a new one.
export default function NewMessage({
  contacts,
  onCancel,
  onPick,
}: {
  contacts: Contact[];
  onCancel: () => void;
  onPick: (contactId: string) => void;
}) {
  const [to, setTo] = useState("");
  const [adding, setAdding] = useState<ContactForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const matches = useMemo(() => {
    const q = to.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return contacts
      .filter(
        (c) =>
          !q ||
          c.parent_name.toLowerCase().includes(q) ||
          (c.child_name || "").toLowerCase().includes(q) ||
          (digits.length >= 3 && c.phone.includes(digits))
      )
      .sort((a, b) => a.parent_name.localeCompare(b.parent_name));
  }, [to, contacts]);

  function startAdd() {
    const looksLikePhone = /^[\d\s()+.-]{7,}$/.test(to.trim());
    setAdding({
      parent_name: looksLikePhone ? "" : to.trim(),
      child_name: "",
      phone: looksLikePhone ? to.trim() : "",
      language: "es",
    });
    setError("");
  }

  async function save() {
    if (!adding) return;
    const phone = toE164(adding.phone);
    const existing = phone && contacts.find((c) => c.phone === phone);
    if (existing) return onPick(existing.id);
    setBusy(true);
    setError("");
    try {
      const d = await api<{ contact: Contact }>("/api/contacts", { body: adding });
      onPick(d.contact.id);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (adding) {
    return (
      <Sheet
        title="New Family"
        onCancel={() => setAdding(null)}
        action={{ label: "Done", onClick: save, busy, disabled: !adding.parent_name.trim() || !adding.phone.trim() }}
      >
        <ContactFields value={adding} onChange={setAdding} autoFocus />
        {error && <p className="sheet-error">{error}</p>}
      </Sheet>
    );
  }

  return (
    <Sheet title="New Message" onCancel={onCancel}>
      <div className="to-row">
        <span className="to-label">To:</span>
        <input autoFocus value={to} onChange={(e) => setTo(e.target.value)} placeholder="Name or mobile number" />
      </div>
      <ul className="pick-list">
        <li>
          <button className="pick-row add" onClick={startAdd}>
            <span className="pick-plus">
              <Plus size={18} />
            </span>
            <span className="pick-text">
              <span className="pick-name">{to.trim() ? `Add “${to.trim()}”` : "Add a new family"}</span>
            </span>
          </button>
        </li>
        {matches.map((c) => (
          <li key={c.id}>
            <button className="pick-row" onClick={() => onPick(c.id)}>
              <Avatar name={c.parent_name} size={36} />
              <span className="pick-text">
                <span className="pick-name">{c.parent_name}</span>
                <span className="pick-sub">
                  {prettyPhone(c.phone)} · {languageName(c.language)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
