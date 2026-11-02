"use client";

import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import { Check, People, Search } from "./icons";
import { languageName } from "@/lib/languages";
import type { Parent } from "@/lib/parents";

export type GroupLite = { id: string; name: string; parentIds: string[] };

export const canText = (p: Parent) => !p.opted_out && !!p.consent_at;
export const blockedReason = (p: Parent) => (p.opted_out ? "Opted out of texts" : !p.consent_at ? "Needs consent (ask your admin)" : "");
export const students = (p: Parent) => (p.students || []).join(", ");

// Search the Parents list and tick parents (and, when given, whole groups).
export default function ParentPicker({
  parents,
  selected,
  onChange,
  groups = [],
  onlyTextable = false,
  autoFocus = false,
}: {
  parents: Parent[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  groups?: GroupLite[];
  onlyTextable?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const usable = (p: Parent) => !onlyTextable || canText(p);
  const byId = useMemo(() => new Map(parents.map((p) => [p.id, p])), [parents]);

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = useMemo(
    () =>
      parents.filter(
        (p) =>
          !q ||
          p.parent_name.toLowerCase().includes(q) ||
          (p.students || []).some((s) => s.toLowerCase().includes(q)) ||
          (digits.length >= 3 && p.phone.includes(digits))
      ),
    [parents, q, digits]
  );
  const shownGroups = groups.filter((g) => !q || g.name.toLowerCase().includes(q));

  const toggle = (p: Parent) => {
    if (!usable(p)) return;
    const n = new Set(selected);
    n.has(p.id) ? n.delete(p.id) : n.add(p.id);
    onChange(n);
  };
  const groupMembers = (g: GroupLite) => g.parentIds.map((id) => byId.get(id)).filter((p): p is Parent => !!p && usable(p));
  const groupOn = (g: GroupLite) => {
    const m = groupMembers(g);
    return m.length > 0 && m.every((p) => selected.has(p.id));
  };
  const toggleGroup = (g: GroupLite) => {
    const n = new Set(selected);
    const on = groupOn(g);
    groupMembers(g).forEach((p) => (on ? n.delete(p.id) : n.add(p.id)));
    onChange(n);
  };
  const selectable = shown.filter(usable);
  const allOn = selectable.length > 0 && selectable.every((p) => selected.has(p.id));
  const toggleAll = () => {
    const n = new Set(selected);
    selectable.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id)));
    onChange(n);
  };

  return (
    <div className="pp">
      <label className="pp-search">
        <Search />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by parent or student name"
          aria-label="Search parents"
        />
      </label>

      {shownGroups.length > 0 && (
        <>
          <p className="pp-section">My Groups</p>
          <div className="ios-group pp-list">
            {shownGroups.map((g) => {
              const on = groupOn(g);
              const n = groupMembers(g).length;
              return (
                <button key={g.id} className={`pp-row ${on ? "on" : ""}`} onClick={() => toggleGroup(g)} disabled={!n}>
                  <span className={`fam-check ${on ? "on" : ""}`}>{on && <Check />}</span>
                  <span className="pp-group-icon">
                    <People size={18} />
                  </span>
                  <span className="fam-text">
                    <span className="fam-name">{g.name}</span>
                    <span className="fam-sub">
                      {n} {n === 1 ? "parent" : "parents"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="pp-section">{groups.length ? "Parents" : "Parents list"}</p>
      <div className="ios-group pp-list">
        {selectable.length > 1 && (
          <button className="pp-row pp-all" onClick={toggleAll}>
            <span className={`fam-check ${allOn ? "on" : ""}`}>{allOn && <Check />}</span>
            <span>
              {allOn ? "Unselect all" : q ? "Select all shown" : "Select everyone"} ({selectable.length})
            </span>
          </button>
        )}
        {shown.map((p) => {
          const on = selected.has(p.id);
          const blocked = onlyTextable ? blockedReason(p) : "";
          return (
            <button key={p.id} className={`pp-row ${on ? "on" : ""} ${blocked ? "blocked" : ""}`} onClick={() => toggle(p)} disabled={!!blocked}>
              <span className={`fam-check ${on ? "on" : ""}`}>{on && <Check />}</span>
              <Avatar name={p.parent_name} size={36} />
              <span className="fam-text">
                <span className="fam-name">{p.parent_name}</span>
                <span className="fam-sub">
                  {blocked || [students(p) && `Student: ${students(p)}`, languageName(p.language)].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="fam-none">{parents.length ? "No parents match your search." : "The Parents list is empty."}</p>}
      </div>
    </div>
  );
}
