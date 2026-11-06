"use client";

import { useCallback, useEffect, useState } from "react";
import AdminHeader, { AdminTitle } from "@/components/AdminHeader";
import { api } from "@/lib/client";
import { AUTH_FIELDS, AUTHORIZATION_TEXT, progress, SECTIONS, UPLOAD_LABELS, type Answers, type IntakeFile } from "@/lib/intake";

type Row = {
  id: string;
  token: string;
  district_id: string | null;
  district_name: string;
  answers: Answers;
  files: (IntakeFile & { url?: string | null })[];
  status: "draft" | "submitted" | "reviewed";
  submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type District = { id: string; name: string };

const STATUS: Record<Row["status"], string> = { draft: "In progress", submitted: "Submitted", reviewed: "Reviewed" };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const linkFor = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/intake/${token}`;

// Super admins: private onboarding form links for districts, and their answers.
export default function IntakesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try {
      const [d, ds] = await Promise.all([api<{ intakes: Row[]; error?: string }>("/api/admin/intakes"), api<{ districts: District[] }>("/api/admin/districts")]);
      setRows(d.intakes);
      setDistricts(ds.districts || []);
      setError(d.error || "");
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!pick) return setError("Pick a district first.");
    try {
      const d = await api<{ intake: Row }>("/api/admin/intakes", { body: { district_id: pick } });
      setPick("");
      await load();
      copy(d.intake.token);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function copy(token: string) {
    navigator.clipboard?.writeText(linkFor(token)).then(
      () => {
        setCopied(token);
        setTimeout(() => setCopied(""), 2500);
      },
      () => {}
    );
  }

  async function view(id: string) {
    try {
      const d = await api<{ intake: Row }>(`/api/admin/intakes?id=${id}`);
      setOpen(d.intake);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function setStatus(r: Row, status: Row["status"]) {
    try {
      await api("/api/admin/intakes", { method: "PATCH", body: { id: r.id, status } });
      setOpen((o) => (o && o.id === r.id ? { ...o, status } : o));
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`Delete the onboarding form for ${r.district_name}, with all its answers and files? This can't be undone.`)) return;
    try {
      await api(`/api/admin/intakes?id=${r.id}`, { method: "DELETE" });
      setOpen(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (open) return <Detail r={open} onBack={() => setOpen(null)} onStatus={setStatus} onDelete={remove} onCopy={copy} copied={copied === open.token} />;

  return (
    <div className="admin-page">
      <AdminHeader />
      <div className="settings-body admin-wide">
        <AdminTitle title="District Onboarding" sub="Private intake form links for districts. Send the link to the district’s contact." />
        {error && <p className="sheet-error">{error}</p>}
        <div className="req-toggle" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a district…</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="ios-button small" style={{ marginTop: 0 }} onClick={create}>
            + New Form Link
          </button>
          <span className="muted">Districts are added in Manage Schools.</span>
        </div>
        {!rows && !error && <p className="ios-footnote top">Loading…</p>}
        {rows && (
          <div className="table-wrap">
            <table className="staff-table req-table">
              <thead>
                <tr>
                  <th><span className="th-plain">District</span></th>
                  <th><span className="th-plain">Status</span></th>
                  <th><span className="th-plain">Answered</span></th>
                  <th><span className="th-plain">Last change</span></th>
                  <th><span className="th-plain">Link</span></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = progress(r.answers || {});
                  return (
                    <tr key={r.id} className={r.status === "reviewed" ? "off" : ""}>
                      <td>
                        <span className="cell-name">{r.district_name}</span>
                        <span className="cell-sub">Created {day(r.created_at)}</span>
                      </td>
                      <td>
                        {STATUS[r.status]}
                        {r.submitted_at && <span className="cell-sub">{day(r.submitted_at)}</span>}
                      </td>
                      <td>
                        {p.done} of {p.total}
                        <span className="cell-sub">{(r.files || []).length} files</span>
                      </td>
                      <td className="nowrap">{day(r.updated_at)}</td>
                      <td>
                        <button className="ios-button small" style={{ marginTop: 0 }} onClick={() => copy(r.token)}>
                          {copied === r.token ? "Copied ✓" : "Copy Link"}
                        </button>
                      </td>
                      <td>
                        <button className="ios-button small" style={{ marginTop: 0 }} onClick={() => view(r.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={6}>No onboarding forms yet. Choose a district above and create a link.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  r,
  onBack,
  onStatus,
  onDelete,
  onCopy,
  copied,
}: {
  r: Row;
  onBack: () => void;
  onStatus: (r: Row, s: Row["status"]) => void;
  onDelete: (r: Row) => void;
  onCopy: (token: string) => void;
  copied: boolean;
}) {
  const a = r.answers || {};
  const val = (id: string) => (a[id] || "").trim() || <span className="muted">—</span>;
  const filesOf = (k: string) => (r.files || []).filter((f) => f.kind === k);
  const FileList = ({ kind }: { kind: keyof typeof UPLOAD_LABELS }) => (
    <>
      <dt>Attached: {UPLOAD_LABELS[kind]}</dt>
      <dd>
        {filesOf(kind).length
          ? filesOf(kind).map((f) => (
              <div key={f.path}>
                {f.url ? <a href={f.url}>{f.name}</a> : f.name} <span className="muted">({day(f.uploaded_at)})</span>
              </div>
            ))
          : <span className="muted">—</span>}
      </dd>
    </>
  );

  return (
    <div className="admin-page">
      <AdminHeader />
      <div className="settings-body admin-wide">
        <button className="back-link" onClick={onBack} style={{ border: 0, background: "none", color: "var(--brand)", cursor: "pointer", fontSize: 16, padding: 0 }}>
          ‹ Back to District Onboarding
        </button>
        <AdminTitle title={r.district_name} sub={`${STATUS[r.status]}${r.submitted_at ? ` ${day(r.submitted_at)}` : ""} · created ${day(r.created_at)} by ${r.created_by || "—"}`} />
        <p className="intake-admin-link">{linkFor(r.token)}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="ios-button small" onClick={() => onCopy(r.token)}>
            {copied ? "Copied ✓" : "Copy Link"}
          </button>
          {r.status === "submitted" && (
            <button className="ios-button small" onClick={() => onStatus(r, "reviewed")}>
              Mark Reviewed
            </button>
          )}
          {r.status !== "draft" && (
            <button className="ios-button small" onClick={() => onStatus(r, "draft")} title="Lets the district change answers and submit again">
              Reopen for Edits
            </button>
          )}
          <button className="ios-button small" style={{ background: "var(--red)" }} onClick={() => onDelete(r)}>
            Delete
          </button>
        </div>
        <dl className="intake-answers">
          {SECTIONS.map((s) => (
            <div key={s.id}>
              <h3>{s.title}</h3>
              {s.fields.map((f) => (
                <div key={f.id}>
                  <dt>{f.id.startsWith("rep") ? `${f.id.startsWith("rep1") ? "Contact 1" : "Contact 2"}: ${f.label}` : f.label}</dt>
                  <dd>{val(f.id)}</dd>
                </div>
              ))}
              {(s.uploads || []).map((k) => (
                <FileList key={k} kind={k} />
              ))}
            </div>
          ))}
          <h3>7. Authorization</h3>
          {AUTH_FIELDS.map((f) => (
            <div key={f.id}>
              <dt>{f.label}</dt>
              <dd>{val(f.id)}</dd>
            </div>
          ))}
          <dt>Agreed to</dt>
          <dd>{a.auth_agree === "yes" ? (
              <>
                Yes{a.auth_at ? `, ${new Date(a.auth_at).toLocaleString("en-US")}` : ""}
                {a.auth_ip ? ` (from ${a.auth_ip})` : ""}: “{a.auth_text || AUTHORIZATION_TEXT}”
              </>
            ) : (
              <span className="muted">Not yet</span>
            )}</dd>
          <FileList kind="other" />
        </dl>
      </div>
    </div>
  );
}
