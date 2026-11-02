"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sheet from "./Sheet";
import ParentPicker, { type GroupLite } from "./ParentPicker";
import { Compose, People, Plus } from "./icons";
import { api } from "@/lib/client";
import type { Parent } from "@/lib/parents";

type Editing = GroupLite | { id?: undefined; name: string; parentIds: string[] };

// My Groups, in a pop-up: a teacher's own shortcuts ("Period 2", "6th graders") for texting several parents at once.
// Only the person who made a group can see it.
export default function GroupsSheet({ onClose, onTextGroup }: { onClose: () => void; onTextGroup?: (groupId: string) => void }) {
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, p] = await Promise.all([api<{ groups: GroupLite[] }>("/api/groups"), api<{ parents: Parent[] }>("/api/parents")]);
      setGroups(g.groups);
      setParents(p.parents);
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

  const known = useMemo(() => new Set(parents.map((p) => p.id)), [parents]);
  const size = (g: GroupLite) => g.parentIds.filter((id) => known.has(id)).length;

  function textGroup(id: string) {
    if (onTextGroup) onTextGroup(id);
    else window.location.href = `/inbox?group=${id}`;
  }

  if (editing) {
    return (
      <GroupEditor
        group={editing}
        parents={parents}
        onBack={() => setEditing(null)}
        onSaved={(list) => {
          setGroups(list);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Sheet title="My Groups" cancelLabel="Close" onCancel={onClose}>
      <p className="ios-footnote top">Groups let you text a whole class or team in one step. Only you can see your groups.</p>
      {error && <p className="sheet-error">{error}</p>}
      {!loaded && <p className="ios-footnote top">Loading…</p>}
      {loaded && (
        <>
          <button className="ios-button big with-icon" onClick={() => setEditing({ name: "", parentIds: [] })}>
            <Plus size={20} /> New Group
          </button>
          {groups.length === 0 ? (
            <div className="empty-card small">
              <p className="empty-card-title">No groups yet</p>
              <p>Make one for each class period or team, like “Period 2” or “Soccer”, then add the parents.</p>
            </div>
          ) : (
            <div className="ios-group group-list">
              {groups.map((g) => (
                <div key={g.id} className="ios-row group-row">
                  <span className="pp-group-icon">
                    <People size={18} />
                  </span>
                  <button className="group-main" onClick={() => setEditing(g)}>
                    <span className="person-name">{g.name}</span>
                    <span className="ios-row-hint">
                      {size(g)} {size(g) === 1 ? "parent" : "parents"}
                    </span>
                  </button>
                  <span className="group-actions">
                    <button className="pill-btn ghost" onClick={() => setEditing(g)}>
                      Edit
                    </button>
                    <button className="pill-btn with-icon" disabled={!size(g)} onClick={() => textGroup(g.id)}>
                      <Compose size={15} /> Text
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

function GroupEditor({
  group,
  parents,
  onBack,
  onSaved,
}: {
  group: Editing;
  parents: Parent[];
  onBack: () => void;
  onSaved: (groups: GroupLite[]) => void;
}) {
  const [name, setName] = useState(group.name);
  const [selected, setSelected] = useState<Set<string>>(new Set(group.parentIds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isNew = !group.id;
  const count = parents.filter((p) => selected.has(p.id)).length;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ groups: GroupLite[] }>("/api/groups", {
        method: isNew ? "POST" : "PATCH",
        body: { id: group.id, name, parentIds: [...selected] },
      });
      onSaved(d.groups);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete the group “${group.name}”? The parents stay on the Parents list.`)) return;
    try {
      const d = await api<{ groups: GroupLite[] }>(`/api/groups?id=${group.id}`, { method: "DELETE" });
      onSaved(d.groups);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Sheet
      title={isNew ? "New Group" : "Edit Group"}
      cancelLabel="‹ Back"
      onCancel={onBack}
      action={{ label: "Save", onClick: save, busy, disabled: !name.trim() }}
    >
      <div className="ios-group">
        <label className="ios-row">
          <span className="ios-row-label wide">Group name</span>
          <input autoFocus={isNew} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Period 2" />
        </label>
      </div>
      <p className="compose-step">
        Who’s in this group? <span className="muted">({count} chosen)</span>
      </p>
      <ParentPicker parents={parents} selected={selected} onChange={setSelected} />
      {error && <p className="sheet-error">{error}</p>}
      <div className="compose-foot">
        <button className="ios-button big" disabled={!name.trim() || busy} onClick={save}>
          {busy ? "Saving…" : isNew ? `Create Group (${count})` : "Save Group"}
        </button>
        {!isNew && (
          <button className="link-btn center-block danger-text" onClick={remove}>
            Delete Group
          </button>
        )}
      </div>
    </Sheet>
  );
}
