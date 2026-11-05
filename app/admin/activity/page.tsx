"use client";

import { useCallback, useEffect, useState } from "react";
import AdminHeader, { AdminTitle } from "@/components/AdminHeader";
import { api } from "@/lib/client";

type Entry = {
  id: number;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

// Plain-English verbs for each action.
const WHAT: Record<string, string> = {
  "inbox.view": "viewed the inbox of",
  "conversation.move": "moved the conversation with",
  "conversation.delete": "deleted the conversation with",
  "parents.add": "added parent",
  "parents.edit": "edited parent",
  "parents.import": "uploaded parents",
  "parents.delete": "deleted parents",
  "staff.invite": "created a sign-up code for",
  "staff.add": "added",
  "staff.approve": "approved",
  "staff.disable": "turned off",
  "staff.enable": "turned on",
  "staff.update": "edited",
  "staff.assign_number": "assigned a number to",
  "staff.release_number": "released the number of",
  "staff.transfer_number": "transferred the number of",
  "staff.reset_password": "reset the password of",
  "staff.reset_mfa": "reset two-step sign-in for",
  "staff.delete": "deleted",
  "school.delete_all_data": "deleted all data for",
  "demo.load": "loaded demo data into",
  "demo.remove": "removed demo data",
};

function details(e: Entry): string {
  const d = e.detail || {};
  const parts: string[] = [];
  if (e.action === "staff.transfer_number" && d.to) parts.push(`to ${d.to}`);
  if (e.action === "conversation.delete" && d.messages !== undefined) parts.push(`${d.messages} messages`);
  if (e.action === "conversation.move") parts.push(`from ${d.from} to ${d.to}`);
  if (e.action === "parents.import") parts.push(`${d.added ?? 0} added, ${d.updated ?? 0} updated`);
  if (e.action === "parents.delete") parts.push(`${d.deleted ?? d.requested ?? 0} removed`);
  if (e.action === "school.delete_all_data") parts.push(`${d.parents ?? 0} parents, ${d.conversations ?? 0} conversations, ${d.teachers ?? 0} teachers`);
  if (e.action === "staff.update") {
    const keys = Object.keys(d).filter((k) => ["name", "email", "school_id", "role"].includes(k));
    if (keys.length) parts.push(`changed ${keys.map((k) => (k === "school_id" ? "school" : k)).join(", ")}`);
  }
  return parts.join(" · ");
}

// Admins: who did what in Relay. Super admins see every school; school admins see their own school.
export default function ActivityPage() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async (before?: string) => {
    setBusy(true);
    try {
      const d = await api<{ entries: Entry[] }>(`/api/admin/audit${before ? `?before=${encodeURIComponent(before)}` : ""}`);
      setRows((r) => (before ? [...(r || []), ...d.entries] : d.entries));
      setMore(d.entries.length === 200);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const needle = q.trim().toLowerCase();
  const shown = (rows || []).filter(
    (e) => !needle || [e.actor_email, WHAT[e.action] || e.action, e.target_label || "", details(e)].join(" ").toLowerCase().includes(needle),
  );

  return (
    <div className="admin-page">
      <AdminHeader />
      <div className="settings-body admin-wide">
        <AdminTitle title="Activity Log" sub="Who viewed another inbox, moved or deleted conversations, changed the Parents list or teachers" />
        {error && <p className="sheet-error">{error}</p>}
        {!rows && !error && <p className="ios-footnote top">Loading…</p>}
        {rows && (
          <>
            <div className="admin-toolbar">
              <input className="admin-search" placeholder="Search person, action or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the activity log" />
            </div>
            <div className="table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th><span className="th-plain">When</span></th>
                    <th><span className="th-plain">Who</span></th>
                    <th><span className="th-plain">What</span></th>
                    <th><span className="th-plain">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap">{new Date(e.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      <td>{e.actor_email}</td>
                      <td>
                        {WHAT[e.action] || e.action} {e.target_label && <b>{e.target_label}</b>}
                      </td>
                      <td className="muted">{details(e)}</td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={4}>{needle ? "Nothing matches." : "No activity recorded yet."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {more && !needle && rows.length > 0 && (
              <p className="ios-footnote table-foot">
                <button className="link-btn" disabled={busy} onClick={() => load(rows[rows.length - 1].created_at)}>
                  {busy ? "Loading…" : "Show older activity"}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
