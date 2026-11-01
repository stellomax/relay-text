"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Sheet from "@/components/Sheet";
import { ChevronLeft, ChevronRight, Plus } from "@/components/icons";
import { api } from "@/lib/client";
import { prettyPhone } from "@/lib/phone";
import { listTime } from "@/lib/format";

type Person = {
  id: string;
  email: string;
  name: string;
  school: string | null;
  school_id: string | null;
  role: "admin" | "teacher";
  status: "pending" | "active" | "disabled";
  area_code: string | null;
  phone_number: string | null;
  phone_placeholder: boolean;
  join_link: string | null;
  builtInAdmin: boolean;
  superAdmin: boolean;
  families: number;
  messages30d: number;
  last_seen_at: string | null;
  created_at: string;
};
type Invite = { id: string; code: string; name: string; school: string | null; area_code: string | null; role: string; expires_at: string };
type SchoolOpt = { id: string; name: string; district: string | null; area_code: string | null; active: boolean };
type Data = {
  staff: Person[];
  autoBuy: boolean;
  unassignedFamilies: number;
  invites: Invite[];
  signupUrl: string;
  schools: SchoolOpt[];
  viewerIsSuper: boolean;
};
type Notice = { title: string; lines: string[]; copy?: string; big?: string } | null;

type SortKey = "name" | "school" | "role" | "number" | "families" | "messages30d" | "last_seen_at" | "status";
const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "name", label: "Teacher" },
  { key: "school", label: "School" },
  { key: "role", label: "Role" },
  { key: "number", label: "Texting number" },
  { key: "families", label: "Families", num: true },
  { key: "messages30d", label: "Texts (30 days)", num: true },
  { key: "last_seen_at", label: "Last active" },
  { key: "status", label: "Status" },
];

function sortValue(p: Person, key: SortKey): string | number {
  switch (key) {
    case "families":
      return p.families;
    case "messages30d":
      return p.messages30d;
    case "last_seen_at":
      return p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
    case "role":
      return p.superAdmin ? "0" : p.role === "admin" ? "1" : "2";
    case "number":
      return p.phone_number || "~";
    case "school":
      return (p.school || "~").toLowerCase();
    case "status":
      return p.status;
    default:
      return p.name.toLowerCase();
  }
}

const EMPTY_NEW = { mode: "code" as "code" | "direct", name: "", email: "", school_id: "", area_code: "", admin: false };

// Admin: create sign-up codes for new teachers, and manage teachers, admins and their texting numbers.
export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Person | null>(null);
  const [adding, setAdding] = useState<typeof EMPTY_NEW | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const load = useCallback(async () => {
    try {
      const d = await api<Data>("/api/admin/staff");
      setData(d);
      setOpen((o) => (o ? d.staff.find((s) => s.id === o.id) || null : null));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("school")) setSchoolFilter(params.get("school")!);
    // "Add Teacher" in the main menu opens straight to the add sheet.
    if (params.get("add")) {
      setAdding({ ...EMPTY_NEW });
      window.history.replaceState({}, "", "/admin");
    }
  }, [load]);

  async function act(p: Person, action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError("");
    try {
      const r = await api("/api/admin/staff", { method: "PATCH", body: { id: p.id, action, ...extra } });
      if (r.tempPassword) {
        setNotice({
          title: "Temporary Password",
          lines: [`Give this to ${p.name}. They can change it in Settings after signing in.`],
          copy: `Sign in to Relay at relaytext.io with ${p.email}\nTemporary password: ${r.tempPassword}`,
        });
      } else if (r.number?.note || r.numberError) {
        setNotice({ title: "Number", lines: [r.numberError ? `Couldn't assign a number: ${r.numberError}` : r.number.note] });
      }
      if (action === "update" || action === "delete") setOpen(null);
      await load();
    } catch (e: any) {
      setError(e.message);
      if (open) alert(e.message);
    } finally {
      setBusy("");
    }
  }

  function inviteMessage(code: string) {
    return `You're invited to Relay. Go to ${data?.signupUrl || "relaytext.io/signup"} and enter sign-up code ${code} to create your account. The code works once and expires in 30 days.`;
  }

  async function createCode() {
    if (!adding) return;
    setBusy("add");
    setError("");
    try {
      const r = await api("/api/admin/staff", {
        body: { ...adding, role: adding.admin ? "admin" : "teacher" },
      });
      if (adding.mode === "direct") {
        const lines = [`${adding.name}'s account is ready. Send them these sign-in details; they can change the password in Settings.`];
        if (r.number?.phone) lines.push(`Texting number: ${prettyPhone(r.number.phone)}${r.number.placeholder ? " (demo)" : ""}`);
        if (r.numberError) lines.push(`Number not assigned yet: ${r.numberError}`);
        setNotice({
          title: "Teacher Added",
          lines,
          copy: `Your Relay account is ready. Sign in at relaytext.io with ${r.email}\nTemporary password: ${r.tempPassword}\nYou can change your password in Settings.`,
        });
        setAdding(null);
        await load();
        return;
      }
      setNotice({
        title: "Sign-up Code",
        big: r.invite.code,
        lines: [`Give this code to ${adding.name}. They enter it at relaytext.io/signup to create their account and get their own texting number.`],
        copy: inviteMessage(r.invite.code),
      });
      setAdding(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function cancelInvite(inv: Invite) {
    if (!confirm(`Cancel sign-up code ${inv.code} for ${inv.name}?`)) return;
    try {
      await api(`/api/admin/staff?invite=${inv.id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const pending = data?.staff.filter((s) => s.status === "pending") || [];
  const q = search.trim().toLowerCase();
  const people = (data?.staff.filter((s) => s.status !== "pending") || [])
    .filter((s) => !schoolFilter || (schoolFilter === "none" ? !s.school_id : s.school_id === schoolFilter))
    .filter((s) => !q || [s.name, s.email, s.school || "", s.phone_number || ""].join(" ").toLowerCase().includes(q))
    .sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "families" || key === "messages30d" || key === "last_seen_at" ? -1 : 1 }));

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/inbox">
          <ChevronLeft /> Messages
        </a>
        <div className="settings-title">Teachers</div>
        <button
          className="icon-btn add-btn"
          onClick={() => setAdding({ ...EMPTY_NEW, school_id: schoolFilter && schoolFilter !== "none" ? schoolFilter : "" })}
          aria-label="Add teacher"
          title="Add teacher"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="settings-body admin-wide">
        {error && <p className="sheet-error">{error}</p>}
        {!data && !error && <p className="ios-footnote top">Loading…</p>}

        {data && (
          <>

            <div className={`admin-banner ${data.autoBuy ? "live" : ""}`}>
              {data.autoBuy
                ? "Live: approving a teacher buys them a real local number in their area code."
                : "Demo: approved teachers get demo numbers. After Twilio approval, set TWILIO_AUTO_BUY_NUMBERS=true in Vercel, then tap “Get Real Number” for each teacher."}
            </div>

            {data.invites.length > 0 && (
              <>
                <p className="ios-section">Sign-up codes not used yet</p>
                <div className="ios-group">
                  {data.invites.map((inv) => (
                    <div key={inv.id} className="ios-row invite-row">
                      <span className="invite-code">{inv.code}</span>
                      <span className="person-main">
                        <span className="person-name">
                          {inv.name}
                          {inv.role === "admin" && <span className="tag-admin">Admin</span>}
                        </span>
                        <span className="ios-row-hint">
                          {inv.school ? `${inv.school} · ` : ""}expires {new Date(inv.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <button className="bar-btn strong" onClick={() => navigator.clipboard?.writeText(inviteMessage(inv.code))}>
                        Copy
                      </button>
                      <button className="bar-btn danger-text" onClick={() => cancelInvite(inv)}>
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {pending.length > 0 && (
              <>
                <p className="ios-section">Waiting for approval</p>
                <div className="ios-group">
                  {pending.map((p) => (
                    <div key={p.id} className="ios-row person-row pending">
                      <Avatar name={p.name} size={38} />
                      <span className="person-main">
                        <span className="person-name">{p.name}</span>
                        <span className="ios-row-hint">
                          {p.email}
                          {p.school ? ` · ${p.school}` : ""}
                          {p.area_code ? ` · ${p.area_code}` : ""}
                        </span>
                      </span>
                      <span className="pending-actions">
                        <button className="pill-btn" disabled={!!busy} onClick={() => act(p, "approve")}>
                          {busy === "approve" ? "Approving…" : "Approve"}
                        </button>
                        <button className="pill-btn ghost" disabled={!!busy} onClick={() => act(p, "disable")}>
                          Decline
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {data.viewerIsSuper && (
              <div className="ios-group">
                <a className="ios-row nav-row" href="/admin/schools">
                  <span>
                    Schools
                    <span className="ios-row-hint">
                      {data.schools.length} {data.schools.length === 1 ? "school" : "schools"} · create schools and their sign-up codes
                    </span>
                  </span>
                  <ChevronRight size={13} className="row-chev" />
                </a>
              </div>
            )}

            <div className="admin-toolbar">
              <input
                className="admin-search"
                placeholder="Search name, email or number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search teachers"
              />
              {data.schools.length > 0 && (
                <select className="admin-select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} aria-label="Filter by school">
                  <option value="">All schools</option>
                  {data.schools.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                  <option value="none">No school</option>
                </select>
              )}
              <button
                className="pill-btn add-pill"
                onClick={() => setAdding({ ...EMPTY_NEW, school_id: schoolFilter && schoolFilter !== "none" ? schoolFilter : "" })}
              >
                <Plus size={16} /> Add Teacher
              </button>
            </div>

            <div className="table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c.key} className={c.num ? "num" : ""} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                        <button onClick={() => toggleSort(c.key)}>
                          {c.label}
                          <span className="sort-ind" aria-hidden>
                            {sort.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : ""}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th aria-label="Edit" />
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr
                      key={p.id}
                      className={p.status === "disabled" ? "off" : ""}
                      onClick={() => setOpen(p)}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(p))}
                    >
                      <td>
                        <span className="cell-person">
                          <Avatar name={p.name} size={32} />
                          <span>
                            <span className="cell-name">{p.name}</span>
                            <span className="cell-sub">{p.email}</span>
                          </span>
                        </span>
                      </td>
                      <td>{p.school || <span className="muted">—</span>}</td>
                      <td>
                        {p.role === "admin" ? <span className="tag-admin">{p.superAdmin ? "Super Admin" : "Admin"}</span> : "Teacher"}
                      </td>
                      <td className="nowrap">
                        {p.phone_number ? prettyPhone(p.phone_number) : <span className="muted">None</span>}
                        {p.phone_placeholder && <span className="tag-demo">Demo</span>}
                      </td>
                      <td className="num">{p.families}</td>
                      <td className="num">{p.messages30d}</td>
                      <td className="nowrap">{p.last_seen_at ? listTime(p.last_seen_at) : <span className="muted">Never</span>}</td>
                      <td>
                        <span className={`status-pill ${p.status}`}>{p.status === "active" ? "Active" : "Off"}</span>
                      </td>
                      <td className="cell-edit">
                        <button
                          className="pill-btn ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(p);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={COLUMNS.length + 1}>{q || schoolFilter ? "No teachers match." : "No teachers yet. Use Add Teacher to invite one."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="ios-footnote table-foot">
              {people.length} {people.length === 1 ? "person" : "people"} · Click Edit (or a row) to change details, manage their number or reset their password.
            </p>
            {data.unassignedFamilies > 0 && (
              <p className="ios-footnote">
                {data.unassignedFamilies} {data.unassignedFamilies === 1 ? "family is" : "families are"} on the main number
                without a teacher. Admins can see them in the inbox picker under “Main number.”
              </p>
            )}
            <p className="ios-footnote">
              To add a teacher, tap + to create a sign-up code. They use it at relaytext.io/signup.
            </p>
          </>
        )}
      </div>

      {open && (
        <PersonSheet
          person={open}
          schools={data?.schools || []}
          autoBuy={!!data?.autoBuy}
          busy={busy}
          viewerIsSuper={!!data?.viewerIsSuper}
          onClose={() => setOpen(null)}
          onAct={(action, extra) => act(open, action, extra)}
        />
      )}

      {adding && (
        <Sheet
          title="Add Teacher"
          onCancel={() => setAdding(null)}
          action={{
            label: adding.mode === "direct" ? "Add" : "Create Code",
            onClick: createCode,
            busy: busy === "add",
            disabled: !adding.name.trim() || (adding.mode === "direct" && !adding.email.trim()),
          }}
        >
          <div className="segmented" role="tablist">
            <button
              role="tab"
              aria-selected={adding.mode === "code"}
              className={adding.mode === "code" ? "on" : ""}
              onClick={() => setAdding({ ...adding, mode: "code" })}
            >
              Sign-up Code
            </button>
            <button
              role="tab"
              aria-selected={adding.mode === "direct"}
              className={adding.mode === "direct" ? "on" : ""}
              onClick={() => setAdding({ ...adding, mode: "direct" })}
            >
              Add Directly
            </button>
          </div>
          <p className="ios-footnote top">
            {adding.mode === "code"
              ? "Creates a 5-digit sign-up code. The teacher enters it at relaytext.io/signup with their school email and a password, and gets their own texting number right away."
              : "Creates the account now with a temporary password you send them. They get their own texting number right away."}
          </p>
          <div className="ios-group">
            <input placeholder="Teacher's name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} autoFocus />
            {adding.mode === "direct" && (
              <input
                type="email"
                placeholder="School email"
                value={adding.email}
                onChange={(e) => setAdding({ ...adding, email: e.target.value })}
              />
            )}
            <label className="ios-row select-row">
              <span className="ios-row-label">school</span>
              <select value={adding.school_id} onChange={(e) => setAdding({ ...adding, school_id: e.target.value })}>
                <option value="">No school</option>
                {(data?.schools || []).map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                    {sc.district ? ` · ${sc.district}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ios-group">
            <label className="ios-row switch-row">
              <span>
                Admin
                <span className="ios-row-hint">Admins can manage teachers and view every inbox.</span>
              </span>
              <input
                type="checkbox"
                className="ios-switch"
                checked={adding.admin}
                onChange={(e) => setAdding({ ...adding, admin: e.target.checked })}
              />
            </label>
          </div>
        </Sheet>
      )}

      {notice && (
        <Sheet title={notice.title} onCancel={() => setNotice(null)}>
          {notice.big && <div className="big-code">{notice.big}</div>}
          {notice.lines.map((l) => (
            <p key={l} className="ios-footnote top">
              {l}
            </p>
          ))}
          {notice.copy && (
            <>
              <div className="ios-group">
                <pre className="copy-block">{notice.copy}</pre>
              </div>
              <button className="ios-button" onClick={() => navigator.clipboard?.writeText(notice.copy!)}>
                Copy
              </button>
              {!notice.big && (
                <p className="ios-footnote top" style={{ marginTop: 12 }}>
                  This password is shown only once. If it’s lost, use Reset Password on their page.
                </p>
              )}
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

function PersonSheet({
  person: p,
  schools,
  autoBuy,
  busy,
  viewerIsSuper,
  onClose,
  onAct,
}: {
  viewerIsSuper: boolean;
  person: Person;
  schools: SchoolOpt[];
  autoBuy: boolean;
  busy: string;
  onClose: () => void;
  onAct: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({
    name: p.name,
    email: p.email,
    school_id: p.school_id || "",
    admin: p.role === "admin",
  });
  const emailChanged = f.email.trim().toLowerCase() !== p.email;
  const changed =
    f.name !== p.name ||
    emailChanged ||
    f.school_id !== (p.school_id || "") ||
    f.admin !== (p.role === "admin");
  const canEditEmail = viewerIsSuper && !p.builtInAdmin;

  return (
    <Sheet
      title={p.name}
      onCancel={onClose}
      action={
        changed
          ? {
              label: "Save",
              busy: busy === "update",
              disabled: !f.name.trim(),
              onClick: () => {
                if (emailChanged && !confirm(`Change ${p.name}'s email to ${f.email.trim()}? They'll sign in with the new email from now on.`)) return;
                onAct("update", {
                  name: f.name,
                  school_id: f.school_id,
                  role: f.admin ? "admin" : "teacher",
                  ...(emailChanged ? { email: f.email } : {}),
                });
              },
            }
          : undefined
      }
    >
      <div className="info-head">
        <Avatar name={f.name || p.name} size={64} />
      </div>
      <p className="ios-footnote top center-text">
        {canEditEmail ? "" : p.email}
        {p.status === "disabled" ? `${canEditEmail ? "" : " · "}Turned off` : ""}
      </p>

      <div className="ios-group">
        <label className="ios-row">
          <span className="ios-row-label">name</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        {canEditEmail && (
          <label className="ios-row">
            <span className="ios-row-label">email</span>
            <input type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </label>
        )}
        <label className="ios-row">
          <span className="ios-row-label">school</span>
          <select value={f.school_id} onChange={(e) => setF({ ...f, school_id: e.target.value })}>
            <option value="">{p.school && !p.school_id ? `${p.school} (not linked)` : "No school"}</option>
            {schools.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </label>
        
        <label className="ios-row switch-row">
          <span>Admin</span>
          <input
            type="checkbox"
            className="ios-switch"
            checked={f.admin}
            disabled={p.builtInAdmin}
            onChange={(e) => setF({ ...f, admin: e.target.checked })}
          />
        </label>
      </div>

      <p className="ios-section">Texting number</p>
      <div className="ios-group">
        <div className="ios-row number-row">
          <span className="big-number">{p.phone_number ? prettyPhone(p.phone_number) : "None"}</span>
          {p.phone_placeholder && <span className="tag-demo">Demo</span>}
        </div>
        {(!p.phone_number || (p.phone_placeholder && autoBuy)) && p.status === "active" && (
          <button className="ios-row action-row" disabled={!!busy} onClick={() => onAct("assign_number")}>
            {busy === "assign_number" ? "Working…" : p.phone_placeholder ? "Get Real Number" : "Assign Number"}
          </button>
        )}
        {p.phone_number && (
          <button
            className="ios-row danger"
            disabled={!!busy}
            onClick={() =>
              confirm(
                p.phone_placeholder
                  ? "Remove this demo number?"
                  : "Release this number? Families texting it will no longer reach Relay, and the number may not be recoverable."
              ) && onAct("release_number")
            }
          >
            {p.phone_placeholder ? "Remove Demo Number" : "Release Number"}
          </button>
        )}
      </div>

      {p.join_link && (
        <>
          <p className="ios-section">Parent sign-up link</p>
          <div className="ios-group">
            <div className="ios-row copy-row">
              <code>{p.join_link}</code>
              <button className="bar-btn strong" onClick={() => navigator.clipboard?.writeText(p.join_link!)}>
                Copy
              </button>
            </div>
          </div>
        </>
      )}

      <div className="ios-group">
        <a className="ios-row nav-row" href={`/inbox?as=${p.id}`}>
          View Inbox
          <ChevronRight size={13} className="row-chev" />
        </a>
        <button className="ios-row action-row" disabled={!!busy} onClick={() => onAct("reset_password")}>
          {busy === "reset_password" ? "Working…" : "Reset Password"}
        </button>
        {p.status === "disabled" ? (
          <button className="ios-row action-row" disabled={!!busy} onClick={() => onAct("enable")}>
            Turn On Account
          </button>
        ) : (
          !p.builtInAdmin && (
            <button
              className="ios-row danger"
              disabled={!!busy}
              onClick={() => confirm(`Turn off ${p.name}'s account? They won't be able to sign in.`) && onAct("disable")}
            >
              Turn Off Account
            </button>
          )
        )}
      </div>

      {viewerIsSuper && !p.builtInAdmin && (
        <>
          <div className="ios-group">
            <button
              className="ios-row danger"
              disabled={!!busy}
              onClick={() =>
                confirm(
                  `Delete ${p.name}? Their login is removed and their texting number is released. Their families and conversations move to the main number, where admins can still see them. This can't be undone.`
                ) && onAct("delete")
              }
            >
              {busy === "delete" ? "Deleting…" : "Delete Teacher"}
            </button>
          </div>
          <p className="ios-footnote">Super admins only. To pause someone instead, use Turn Off Account.</p>
        </>
      )}
    </Sheet>
  );
}
