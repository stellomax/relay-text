"use client";

import { useCallback, useEffect, useState } from "react";
import AdminHeader, { AdminTitle } from "@/components/AdminHeader";
import { api } from "@/lib/client";

type Req = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string | null;
  organization: string;
  location: string | null;
  students: string | null;
  message: string | null;
  handled: boolean;
  created_at: string;
};

// Super admins: requests from the "Bring Relay to your school" form on the website.
export default function RequestsPage() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState("");
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ requests: Req[] }>("/api/contact");
      setRows(d.requests);
      setError("");
    } catch (e: any) {
      setError(/school_requests/.test(e.message) ? "This page needs a database update: run the latest supabase/schema.sql in Supabase." : e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(r: Req) {
    setRows((rs) => (rs || []).map((x) => (x.id === r.id ? { ...x, handled: !x.handled } : x)));
    try {
      await api("/api/contact", { method: "PATCH", body: { id: r.id, handled: !r.handled } });
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  const open = (rows || []).filter((r) => !r.handled).length;
  const shown = (rows || []).filter((r) => showDone || !r.handled);

  return (
    <div className="admin-page">
      <AdminHeader />
      <div className="settings-body admin-wide">
        <AdminTitle
          title="School Requests"
          sub={rows ? `${open} new · from the “Bring Relay to your school” form on relaytext.io` : undefined}
        />
        {error && <p className="sheet-error">{error}</p>}
        {!rows && !error && <p className="ios-footnote top">Loading…</p>}
        {rows && (
          <>
            <label className="req-toggle">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show handled requests
            </label>
            <div className="table-wrap">
              <table className="staff-table req-table">
                <thead>
                  <tr>
                    <th><span className="th-plain">Received</span></th>
                    <th><span className="th-plain">Contact</span></th>
                    <th><span className="th-plain">School or district</span></th>
                    <th><span className="th-plain">Message</span></th>
                    <th><span className="th-plain">Handled</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className={r.handled ? "off" : ""}>
                      <td className="nowrap">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>
                        <span className="cell-name">
                          {r.first_name} {r.last_name}
                        </span>
                        <span className="cell-sub">{r.role || "—"}</span>
                        <a className="cell-sub" href={`mailto:${r.email}`}>
                          {r.email}
                        </a>
                        {r.phone && <span className="cell-sub">{r.phone}</span>}
                      </td>
                      <td>
                        <span className="cell-name">{r.organization}</span>
                        <span className="cell-sub">{[r.location, r.students].filter(Boolean).join(" · ") || "—"}</span>
                      </td>
                      <td className="req-msg">{r.message || <span className="muted">—</span>}</td>
                      <td>
                        <input type="checkbox" className="ios-switch" checked={r.handled} onChange={() => toggle(r)} aria-label="Handled" />
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={5}>{rows.length ? "No new requests." : "No requests yet."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
