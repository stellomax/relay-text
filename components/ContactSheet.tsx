"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import ContactFields, { ContactForm } from "./ContactFields";
import { api } from "@/lib/client";
import type { Contact } from "@/lib/db";

// Tap the name at the top of a conversation: view and edit the family's details.
export default function ContactSheet({
  contact,
  readOnly = false,
  onClose,
  onSaved,
  onDeleted,
  groupOptions,
}: {
  groupOptions?: string[];
  contact: Contact;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState<ContactForm>({
    parent_name: contact.parent_name.startsWith("Unknown ") ? "" : contact.parent_name,
    child_name: contact.child_name || "",
    phone: contact.phone,
    language: contact.language,
    groups: (contact.groups || []).join(", "),
    consent: false,
  });
  const [optedOut, setOptedOut] = useState(contact.opted_out);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ warning?: string }>("/api/contacts", { method: "PATCH", body: { id: contact.id, ...form, opted_out: optedOut } });
      if (d.warning) alert(d.warning);
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${form.parent_name || "this family"} and the whole conversation? This can't be undone.`)) return;
    try {
      await api(`/api/contacts?id=${contact.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Sheet
      title="Family Info"
      onCancel={onClose}
      action={readOnly ? undefined : { label: "Done", onClick: save, busy, disabled: !form.parent_name.trim() || !form.phone.trim() }}
    >
      <div className="info-head">
        <Avatar name={form.parent_name || contact.parent_name} size={76} />
      </div>
      <fieldset className="plain-fieldset" disabled={readOnly}>
        <ContactFields value={form} onChange={setForm} groupOptions={groupOptions} askConsent={!contact.consent_at && !readOnly} />
      </fieldset>
      {contact.consent_at && (
        <p className="ios-footnote">
          Agreed to texts {new Date(contact.consent_at).toLocaleDateString()}
          {contact.consent_source ? ` · ${contact.consent_source.replace(/ \(parent gave number to school\)/, "")}` : ""}
        </p>
      )}
      {optedOut && (
        <div className="ios-group">
          <label className="ios-row switch-row">
            <span>
              Opted out of texts
              <span className="ios-row-hint">They replied STOP. Texts to them are blocked by the carrier until they reply START.</span>
            </span>
            <input type="checkbox" className="ios-switch" checked={optedOut} onChange={(e) => setOptedOut(e.target.checked)} />
          </label>
        </div>
      )}
      {!readOnly && (
        <div className="ios-group">
          <button className="ios-row danger" onClick={remove}>
            Delete Conversation
          </button>
        </div>
      )}
      {error && <p className="sheet-error">{error}</p>}
    </Sheet>
  );
}
