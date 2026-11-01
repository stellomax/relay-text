"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import Sheet from "@/components/Sheet";
import { api } from "@/lib/client";
import { prettyPhone } from "@/lib/phone";

type Check = { ok: boolean; detail: string };
type Status = { database: Check; translation: Check; sms: Check; autoBuy: boolean; webhooks: { incoming: string; status: string } };
type Me = {
  id: string;
  name: string;
  email: string;
  school: string | null;
  role: "admin" | "teacher";
  phone_number: string | null;
  phone_placeholder: boolean;
  join_link: string | null;
};

function Row({ title, check, demo }: { title: string; check: Check; demo?: boolean }) {
  return (
    <div className="ios-row status-row">
      <span className={`status-dot ${check.ok ? "ok" : demo ? "demo" : "bad"}`} aria-hidden />
      <span>
        {title}
        <span className="ios-row-hint">{check.detail}</span>
      </span>
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ios-row copy-row">
      <code>{value}</code>
      <button
        className="bar-btn strong"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// Settings: your account, your number and parent sign-up link; for admins, teacher management and connections.
export default function SetupPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [pw, setPw] = useState<{ current: string; next: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    api<{ me: Me }>("/api/me")
      .then((d) => {
        setMe(d.me);
        if (d.me.role === "admin") api<Status>("/api/setup").then(setStatus).catch((e) => setError(e.message));
      })
      .catch((e) => setError(e.message));
  }, []);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  async function changePassword() {
    if (!pw) return;
    setPwBusy(true);
    setPwMsg("");
    try {
      await api("/api/me", { body: { currentPassword: pw.current, newPassword: pw.next } });
      setPw(null);
      setPwMsg("Password changed.");
    } catch (e: any) {
      setPwMsg(e.message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/inbox">
          <ChevronLeft /> Messages
        </a>
        <div className="settings-title">Settings</div>
        <span />
      </header>
      <div className="settings-body">
        {error && <p className="sheet-error">{error}</p>}
        {!me && !error && <p className="ios-footnote top">Loading…</p>}
        {me && (
          <>
            <p className="ios-section">Your texting number</p>
            <div className="ios-group">
              <div className="ios-row number-row">
                <span className="big-number">{me.phone_number ? prettyPhone(me.phone_number) : "Not assigned yet"}</span>
                {me.phone_placeholder && <span className="tag-demo">Demo</span>}
              </div>
            </div>
            <p className="ios-footnote">
              {me.phone_placeholder
                ? (me as any).texting_live
                  ? "Placeholder number. For now your texts go out from the school's main Relay Text number. Your own number will appear here once it's assigned."
                  : "This is a demo number. You'll get a real number once Relay Text texting goes live."
                : "Families see this number, never your personal cell. Their replies come back here."}
            </p>

            {me.join_link && (
              <>
                <p className="ios-section">Your parent sign-up link</p>
                <div className="ios-group">
                  <CopyRow value={me.join_link} />
                </div>
                <p className="ios-footnote">
                  Share this link with families (newsletter, email, QR code at conferences). When they sign up, they appear in
                  your inbox.
                </p>
              </>
            )}

            {me.role === "admin" && (
              <>
                <p className="ios-section">Admin</p>
                <div className="ios-group">
                  <a className="ios-row nav-row" href="/admin">
                    Manage Teachers
                    <ChevronRight size={13} className="row-chev" />
                  </a>
                </div>
              </>
            )}

            {status && (
              <>
                <p className="ios-section">Connections</p>
                <div className="ios-group">
                  <Row title="Database · Supabase" check={status.database} />
                  <Row title="Translation · Google" check={status.translation} />
                  <Row title="Texting · Twilio" check={status.sms} demo />
                  <Row
                    title="Teacher numbers"
                    check={{
                      ok: status.autoBuy,
                      detail: status.autoBuy
                        ? "Real numbers are bought automatically for approved teachers."
                        : "Teachers get demo numbers. Set TWILIO_AUTO_BUY_NUMBERS=true in Vercel to buy real ones.",
                    }}
                    demo
                  />
                </div>
                <p className="ios-section">Twilio incoming-message webhook</p>
                <div className="ios-group">
                  <CopyRow value={status.webhooks.incoming} />
                </div>
                <p className="ios-footnote">
                  New teacher numbers are set up with this automatically. For the main number, set it in Twilio under the
                  number’s Messaging configuration → “A message comes in” → Webhook, HTTP POST.
                </p>
              </>
            )}

            <p className="ios-section">Account</p>
            <div className="ios-group">
              <div className="ios-row">
                <span className="muted">Name</span>&nbsp;{me.name}
              </div>
              <div className="ios-row">
                <span className="muted">Email</span>&nbsp;{me.email}
              </div>
              {me.school && (
                <div className="ios-row">
                  <span className="muted">School</span>&nbsp;{me.school}
                </div>
              )}
              <button className="ios-row nav-row" onClick={() => setPw({ current: "", next: "" })}>
                Change Password
                <ChevronRight size={13} className="row-chev" />
              </button>
              <button className="ios-row danger" onClick={signOut}>
                Sign Out
              </button>
            </div>
            {pwMsg && <p className="ios-footnote">{pwMsg}</p>}
          </>
        )}
      </div>

      {pw && (
        <Sheet
          title="Change Password"
          onCancel={() => setPw(null)}
          action={{ label: "Save", onClick: changePassword, busy: pwBusy, disabled: !pw.current || pw.next.length < 8 }}
        >
          <div className="ios-group">
            <input
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              autoFocus
            />
            <input
              type="password"
              placeholder="New password (8+ characters)"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </div>
          {pwMsg && <p className="sheet-error">{pwMsg}</p>}
        </Sheet>
      )}
    </div>
  );
}
