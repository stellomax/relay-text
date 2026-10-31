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
  role: "admin" | "teacher";
  status: "pending" | "active" | "disabled";
  area_code: string | null;
  phone_number: string | null;
  phone_placeholder: boolean;
  join_link: string | null;
  builtInAdmin: boolean;
  families: number;
  messages30d: number;
  last_seen_at: string | null;
  created_at: string;
};
type Data = { staff: Person[]; autoBuy: boolean; unassignedFamilies: number };
type Notice = { title: string; lines: string[]; copy?: string } | null;

const EMPTY_NEW = { name: "", email: "", school: "", area_code: "", admin: false };

// Admin: approve, add and manage teachers and admins, and their texting numbers.
export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Person | null>(null);
  const [adding, setAdding] = useState<typeof EMPTY_NEW | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

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
          copy: `Sign in to Relay Text at relaytext.io with ${p.email}\nTemporary password: ${r.tempPassword}`,
        });
      } else if (r.number?.note || r.numberError) {
        setNotice({ title: "Number", lines: [r.numberError ? `Couldn't assign a number: ${r.numberError}` : r.number.note] });
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function addPerson() {
    if (!adding) return;
    setBusy("add");
    setError("");
    try {
      const r = await api("/api/admin/staff", {
        body: { ...adding, role: adding.admin ? "admin" : "teacher" },
      });
      const lines = [`${adding.name} can sign in now. Send them these details; they can change the password in Settings.`];
      if (r.number?.phone) lines.push(`Texting number: ${prettyPhone(r.number.phone)}${r.number.placeholder ? " (demo)" : ""}`);
      if (r.numberError) lines.push(`Number not assigned yet: ${r.numberError}`);
      setNotice({
        title: "Account Created",
        lines,
        copy: `Sign in to Relay Text at relaytext.io with ${adding.email.trim().toLowerCase()}\nTemporary password: ${r.tempPassword}`,
      });
      setAdding(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  const pending = data?.staff.filter((s) => s.status === "pending") || [];
  const people = data?.staff.filter((s) => s.status !== "pending") || [];

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/setup">
          <ChevronLeft /> Settings
        </a>
        <div className="settings-title">Teachers</div>
        <button className="icon-btn add-btn" onClick={() => setAdding({ ...EMPTY_NEW })} aria-label="Add teacher" title="Add teacher">
          <Plus size={20} />
        </button>
      </header>

      <div className="settings-body">
        {error && <p className="sheet-error">{error}</p>}
        {!data && !error && <p className="ios-footnote top">Loading…</p>}

        {data && (
          <>
            <div className={`admin-banner ${data.autoBuy ? "live" : ""}`}>
              {data.autoBuy
                ? "Live: approving a teacher buys them a real local number in their area code."
                : "Demo: approved teachers get demo numbers. After Twilio approval, set TWILIO_AUTO_BUY_NUMBERS=true in Vercel, then tap “Get Real Number” for each teacher."}
            </div>

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

            <p className="ios-section">Teachers and admins · {people.length}</p>
            <div className="ios-group">
              {people.map((p) => (
                <button key={p.id} className={`ios-row person-row ${p.status === "disabled" ? "off" : ""}`} onClick={() => setOpen(p)}>
                  <Avatar name={p.name} size={38} />
                  <span className="person-main">
                    <span className="person-name">
                      {p.name}
                      {p.role === "admin" && <span className="tag-admin">Admin</span>}
                      {p.status === "disabled" && <span className="tag-off">Off</span>}
                    </span>
                    <span className="ios-row-hint">
                      {p.phone_number ? prettyPhone(p.phone_number) : "No number"}
                      {p.phone_placeholder ? " (demo)" : ""}
                      {p.school ? ` · ${p.school}` : ""}
                    </span>
                    <span className="ios-row-hint">
                      {p.families} {p.families === 1 ? "family" : "families"} · {p.messages30d} texts in 30 days
                      {p.last_seen_at ? ` · active ${listTime(p.last_seen_at)}` : ""}
                    </span>
                  </span>
                  <ChevronRight size={13} className="row-chev" />
                </button>
              ))}
            </div>
            {data.unassignedFamilies > 0 && (
              <p className="ios-footnote">
                {data.unassignedFamilies} {data.unassignedFamilies === 1 ? "family is" : "families are"} on the main number
                without a teacher. Admins can see them in the inbox picker under “Main number.”
              </p>
            )}
            <p className="ios-footnote">
              Teachers can request an account at relaytext.io/signup. You can also add someone directly with the + button.
            </p>
          </>
        )}
      </div>

      {open && (
        <PersonSheet
          person={open}
          autoBuy={!!data?.autoBuy}
          busy={busy}
          onClose={() => setOpen(null)}
          onAct={(action, extra) => act(open, action, extra)}
        />
      )}

      {adding && (
        <Sheet
          title="Add Teacher"
          onCancel={() => setAdding(null)}
          action={{
            label: "Add",
            onClick: addPerson,
            busy: busy === "add",
            disabled: !adding.name.trim() || !adding.email.trim(),
          }}
        >
          <div className="ios-group">
            <input placeholder="Name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} autoFocus />
            <input
              type="email"
              placeholder="Email"
              value={adding.email}
              onChange={(e) => setAdding({ ...adding, email: e.target.value })}
            />
          </div>
          <div className="ios-group">
            <input placeholder="School" value={adding.school} onChange={(e) => setAdding({ ...adding, school: e.target.value })} />
            <input
              placeholder="Area code for their number (e.g. 303)"
              inputMode="numeric"
              maxLength={3}
              value={adding.area_code}
              onChange={(e) => setAdding({ ...adding, area_code: e.target.value })}
            />
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
          <p className="ios-footnote">They’ll get a temporary password and their own texting number.</p>
        </Sheet>
      )}

      {notice && (
        <Sheet title={notice.title} onCancel={() => setNotice(null)}>
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
              <p className="ios-footnote top" style={{ marginTop: 12 }}>
                This password is shown only once.
              </p>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

function PersonSheet({
  person: p,
  autoBuy,
  busy,
  onClose,
  onAct,
}: {
  person: Person;
  autoBuy: boolean;
  busy: string;
  onClose: () => void;
  onAct: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({ name: p.name, school: p.school || "", area_code: p.area_code || "", admin: p.role === "admin" });
  const changed =
    f.name !== p.name || f.school !== (p.school || "") || f.area_code !== (p.area_code || "") || f.admin !== (p.role === "admin");

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
              onClick: () => onAct("update", { name: f.name, school: f.school, area_code: f.area_code, role: f.admin ? "admin" : "teacher" }),
            }
          : undefined
      }
    >
      <div className="info-head">
        <Avatar name={f.name || p.name} size={64} />
      </div>
      <p className="ios-footnote top center-text">
        {p.email}
        {p.status === "disabled" ? " · turned off" : ""}
      </p>

      <div className="ios-group">
        <label className="ios-row">
          <span className="ios-row-label">name</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="ios-row">
          <span className="ios-row-label">school</span>
          <input value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} />
        </label>
        <label className="ios-row">
          <span className="ios-row-label">area code</span>
          <input inputMode="numeric" maxLength={3} value={f.area_code} onChange={(e) => setF({ ...f, area_code: e.target.value })} />
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
                  : "Release this number? Families texting it will no longer reach Relay Text, and the number may not be recoverable."
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
        <a className="ios-row nav-row" href={`/?as=${p.id}`}>
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
    </Sheet>
  );
}
