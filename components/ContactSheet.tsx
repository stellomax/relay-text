"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import Avatar from "./Avatar";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { prettyPhone } from "@/lib/phone";
import type { Contact } from "@/lib/db";

// Tap the name at the top of a conversation: who this parent is. Details come from the Parents list,
// which admins edit; admins get a link straight to it.
export default function ContactSheet({
  contact,
  readOnly = false,
  isAdmin = false,
  onClose,
  onDeleted,
  moveOptions,
  onMoved,
}: {
  contact: Contact;
  readOnly?: boolean;
  isAdmin?: boolean;
  moveOptions?: { id: string | null; label: string }[];
  onMoved?: () => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState("");
  const unknown = contact.parent_name.startsWith("Unknown ");
  const name = unknown ? prettyPhone(contact.phone) : contact.parent_name;

  const [moveTo, setMoveTo] = useState<string>(contact.staff_id || "");
  const [moving, setMoving] = useState(false);
  async function move() {
    const label = moveOptions?.find((o) => (o.id || "") === moveTo)?.label || "the main number";
    if (!confirm(`Move the conversation with ${name} to ${label}?`)) return;
    setMoving(true);
    setError("");
    try {
      await api("/api/contacts", { method: "PATCH", body: { action: "move", id: contact.id, staff_id: moveTo || null } });
      onMoved?.();
    } catch (e: any) {
      setError(e.message);
      setMoving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete your conversation with ${name}? The messages are removed. ${unknown ? "" : "They stay on the Parents list."}`)) return;
    try {
      await api(`/api/contacts?id=${contact.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const addLink = `/admin/parents?add=1&phone=${encodeURIComponent(contact.phone)}&language=${encodeURIComponent(contact.language)}`;

  return (
    <Sheet title="Parent Info" onCancel={onClose} cancelLabel="Close">
      <div className="info-head">
        <Avatar name={contact.parent_name} size={76} />
      </div>
      <p className="info-name">{name}</p>
      <div className="ios-group">
        {contact.child_name && (
          <div className="ios-row">
            <span className="ios-row-label">student</span>
            <span>{contact.child_name}</span>
          </div>
        )}
        <div className="ios-row">
          <span className="ios-row-label">mobile</span>
          <span>{prettyPhone(contact.phone)}</span>
        </div>
        <div className="ios-row">
          <span className="ios-row-label">language</span>
          <span>{languageName(contact.language)}</span>
        </div>
      </div>
      {contact.opted_out && (
        <p className="ios-footnote">This parent replied STOP, so they can’t be texted until they reply START.</p>
      )}
      {isAdmin ? (
        <div className="ios-group">
          <a className="ios-row action-row" href={contact.parent_id ? `/admin/parents?edit=${contact.parent_id}` : addLink}>
            {contact.parent_id ? "Edit on Parents List" : "Add to Parents List"}
          </a>
        </div>
      ) : (
        <p className="ios-footnote">
          {unknown || !contact.parent_id
            ? "This number isn’t on the Parents list. Ask your admin to add it."
            : "To change a name, number or language, ask your admin. They keep the Parents list up to date."}
        </p>
      )}

      {moveOptions && moveOptions.length > 0 && (
        <>
          <p className="ios-section">Teacher</p>
          <div className="ios-group">
            <label className="ios-row">
              <span className="ios-row-label">texts with</span>
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                {moveOptions.map((o) => (
                  <option key={o.id || "main"} value={o.id || ""}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {moveTo !== (contact.staff_id || "") && (
              <button className="ios-row action-row" onClick={move} disabled={moving}>
                {moving ? "Moving…" : "Move Conversation"}
              </button>
            )}
          </div>
          <p className="ios-footnote">Admins only. The whole conversation moves to that teacher’s Messages.</p>
        </>
      )}
      {!readOnly && isAdmin && (
        <div className="ios-group">
          <button className="ios-row danger" onClick={remove} title="Admins only. Removes this conversation and all its messages. It's recorded in the Activity Log.">
            Delete Conversation
          </button>
        </div>
      )}
      {error && <p className="sheet-error">{error}</p>}
    </Sheet>
  );
}
