"use client";

import { useMemo, useState } from "react";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import ContactFields, { ContactForm } from "./ContactFields";
import { People, Plus } from "./icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { prettyPhone, toE164 } from "@/lib/phone";
import type { Contact } from "@/lib/db";

export function allGroups(contacts: Contact[]): string[] {
  const seen = new Map<string, string>();
  for (const c of contacts) for (const g of c.groups || []) if (!seen.has(g.toLowerCase())) seen.set(g.toLowerCase(), g);
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// "New Message": pick an existing family from the To: field, or add a new one.
export default function NewMessage({
  contacts,
  createUrl = "/api/contacts",
  familiesUrl,
  onCancel,
  onPick,
}: {
  contacts: Contact[];
  createUrl?: string;
  familiesUrl?: string;
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
      groups: "",
      consent: false,
    });
    setError("");
  }

  async function save() {
    if (!adding) return;
    const phone = toE164(adding.phone);
    if (!phone) {
      setError("That phone number doesn't look right. Enter a 10-digit U.S. mobile number, like (303) 555-1234.");
      return;
    }
    const existing = contacts.find((c) => c.phone === phone);
    if (existing) return onPick(existing.id);
    setBusy(true);
    setError("");
    try {
      const d = await api<{ contact: Contact }>(createUrl, { body: adding });
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
        action={{ label: "Done", onClick: save, busy, disabled: !adding.parent_name.trim() || !adding.phone.trim() || !adding.consent }}
      >
        {error && <p className="sheet-error">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && adding.parent_name.trim() && adding.phone.trim() && adding.consent) save();
          }}
        >
          <ContactFields value={adding} onChange={setAdding} autoFocus groupOptions={allGroups(contacts)} askConsent />
          <button type="submit" hidden aria-hidden="true" />
        </form>
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
        {familiesUrl && contacts.length > 1 && !to.trim() && (
          <li>
            <a className="pick-row add" href={familiesUrl}>
              <span className="pick-plus">
                <People size={18} />
              </span>
              <span className="pick-text">
                <span className="pick-name">Message several or all families</span>
              </span>
            </a>
          </li>
        )}
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
