"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import Sheet from "@/components/Sheet";
import ContactSheet from "@/components/ContactSheet";
import ContactFields, { ContactForm } from "@/components/ContactFields";
import { allGroups } from "@/components/NewMessage";
import { Broadcast } from "@/components/GroupMessage";
import { Check, ChevronLeft, Plus } from "@/components/icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { prettyPhone } from "@/lib/phone";
import type { Contact } from "@/lib/db";

const NO_GROUP = "__none__";

// Families: the teacher's address book. Pick some families, a group, or everyone, and send one message —
// each family gets its own private text in their language.
export default function Families() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Contact | null>(null);
  const [adding, setAdding] = useState<ContactForm | null>(null);
  const [composeFor, setComposeFor] = useState<Contact[] | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ contacts: Contact[] }>("/api/contacts");
      setContacts(d.contacts);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => allGroups(contacts), [contacts]);
  const countIn = (g: string) =>
    contacts.filter((c) => (g === NO_GROUP ? !(c.groups || []).length : (c.groups || []).some((x) => x.toLowerCase() === g.toLowerCase())))
      .length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return contacts.filter((c) => {
      const gs = c.groups || [];
      if (group === NO_GROUP && gs.length) return false;
      if (group && group !== NO_GROUP && !gs.some((g) => g.toLowerCase() === group.toLowerCase())) return false;
      if (!q) return true;
      return (
        c.parent_name.toLowerCase().includes(q) ||
        (c.child_name || "").toLowerCase().includes(q) ||
        gs.some((g) => g.toLowerCase().includes(q)) ||
        languageName(c.language).toLowerCase().includes(q) ||
        (digits.length >= 3 && c.phone.includes(digits))
      );
    });
  }, [contacts, query, group]);

  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAllShown = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allShownSelected) shown.forEach((c) => n.delete(c.id));
      else shown.forEach((c) => n.add(c.id));
      return n;
    });

  const selectedContacts = contacts.filter((c) => selected.has(c.id));
  const groupLabel = group === NO_GROUP ? "families with no group" : group;
  // The big button: the selection if there is one, otherwise everyone in view.
  const target = selectedContacts.length ? selectedContacts : shown;
  const targetLabel = selectedContacts.length
    ? `Message ${selectedContacts.length} ${selectedContacts.length === 1 ? "Family" : "Families"}`
    : group
      ? `Message All in ${group === NO_GROUP ? "No Group" : group} (${shown.length})`
      : `Message All Families (${shown.length})`;

  async function addFamily() {
    if (!adding) return;
    try {
      const d = await api<{ contact: Contact; warning?: string }>("/api/contacts", { body: adding });
      if (d.warning) alert(d.warning);
      setAdding(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/inbox">
          <ChevronLeft /> Messages
        </a>
        <div className="settings-title">Families</div>
        <button
          className="bar-btn strong"
          aria-label="Add a family"
          onClick={() => setAdding({ parent_name: "", child_name: "", phone: "", language: "es", groups: group && group !== NO_GROUP ? group : "", consent: false })}
        >
          <Plus size={22} />
        </button>
      </header>

      <div className="settings-body fam-body">
        {error && <p className="sheet-error">{error}</p>}

        <div className="admin-toolbar">
          <input
            className="admin-search"
            placeholder="Search name, student, group or language"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {groups.length > 0 && (
          <div className="fam-groups" role="tablist" aria-label="Groups">
            <button role="tab" aria-selected={!group} className={`group-chip ${!group ? "on" : ""}`} onClick={() => setGroup(null)}>
              All <span>{contacts.length}</span>
            </button>
            {groups.map((g) => (
              <button
                role="tab"
                key={g}
                aria-selected={group === g}
                className={`group-chip ${group === g ? "on" : ""}`}
                onClick={() => setGroup(group === g ? null : g)}
              >
                {g} <span>{countIn(g)}</span>
              </button>
            ))}
            {countIn(NO_GROUP) > 0 && (
              <button
                role="tab"
                aria-selected={group === NO_GROUP}
                className={`group-chip ${group === NO_GROUP ? "on" : ""}`}
                onClick={() => setGroup(group === NO_GROUP ? null : NO_GROUP)}
              >
                No group <span>{countIn(NO_GROUP)}</span>
              </button>
            )}
          </div>
        )}

        {loaded && contacts.length === 0 ? (
          <div className="fam-empty">
            <p className="fam-empty-title">No families yet</p>
            <p>Add families with the + button, or share your parent sign-up link (in Settings) so families can add themselves.</p>
            <button
              className="ios-button small"
              onClick={() => setAdding({ parent_name: "", child_name: "", phone: "", language: "es", groups: "", consent: false })}
            >
              Add a Family
            </button>
          </div>
        ) : (
          <>
            <div className="fam-selectbar">
              <button className="fam-check-btn" onClick={toggleAllShown} disabled={!shown.length}>
                <span className={`fam-check ${allShownSelected ? "on" : ""}`} aria-hidden>
                  {allShownSelected && <Check />}
                </span>
                {allShownSelected ? "Deselect" : "Select"} {group ? `all in ${groupLabel}` : "all"}
              </button>
              <span className="fam-count">
                {selected.size > 0 ? (
                  <>
                    {selected.size} selected ·{" "}
                    <button className="link-btn" onClick={() => setSelected(new Set())}>
                      Clear
                    </button>
                  </>
                ) : (
                  `${shown.length} ${shown.length === 1 ? "family" : "families"}`
                )}
              </span>
            </div>

            <div className="ios-group fam-list">
              {shown.map((c) => {
                const on = selected.has(c.id);
                return (
                  <div key={c.id} className={`fam-row ${on ? "on" : ""}`}>
                    <button
                      className="fam-check-hit"
                      onClick={() => toggle(c.id)}
                      aria-pressed={on}
                      aria-label={`${on ? "Deselect" : "Select"} ${c.parent_name}`}
                    >
                      <span className={`fam-check ${on ? "on" : ""}`}>{on && <Check />}</span>
                    </button>
                    <button className="fam-main" onClick={() => setEditing(c)}>
                      <Avatar name={c.parent_name} size={38} />
                      <span className="fam-text">
                        <span className="fam-name">
                          {c.parent_name}
                          {c.child_name && <span className="fam-child"> · {c.child_name}</span>}
                          {c.opted_out && <span className="tag-off">Opted out</span>}
                          {!c.opted_out && !c.consent_at && <span className="tag-demo">Needs consent</span>}
                        </span>
                        <span className="fam-sub">
                          {prettyPhone(c.phone)} · {languageName(c.language)}
                        </span>
                        {(c.groups || []).length > 0 && (
                          <span className="fam-tags">
                            {(c.groups || []).map((g) => (
                              <span key={g} className="group-tag">
                                {g}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
              {loaded && shown.length === 0 && <p className="fam-none">No families match.</p>}
            </div>
            <p className="ios-footnote">Tap a family to edit their details or groups. Tap the circle to select.</p>
          </>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="fam-sendbar">
          <button className="ios-button" disabled={!target.length} onClick={() => setComposeFor(target)}>
            {targetLabel}
          </button>
        </div>
      )}

      {adding && (
        <Sheet
          title="New Family"
          onCancel={() => setAdding(null)}
          action={{ label: "Done", onClick: addFamily, disabled: !adding.parent_name.trim() || !adding.phone.trim() || !adding.consent }}
        >
          <ContactFields value={adding} onChange={setAdding} autoFocus groupOptions={groups} askConsent />
        </Sheet>
      )}

      {editing && (
        <ContactSheet
          contact={editing}
          groupOptions={groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onDeleted={() => {
            setSelected((s) => {
              const n = new Set(s);
              n.delete(editing.id);
              return n;
            });
            setEditing(null);
            load();
          }}
        />
      )}

      {composeFor && (
        <Broadcast
          recipients={composeFor}
          onClose={(sent) => {
            setComposeFor(null);
            if (sent) setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
