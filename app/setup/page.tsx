"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "@/components/icons";
import { api } from "@/lib/client";

type Check = { ok: boolean; detail: string };
type Status = { user: string; database: Check; translation: Check; sms: Check; webhooks: { incoming: string; status: string } };

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

// Settings: shows whether Supabase, Google and Twilio are connected. Keys live in Vercel and are never shown.
export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Status>("/api/setup").then(setStatus).catch((e) => setError(e.message));
  }, []);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/">
          <ChevronLeft /> Messages
        </a>
        <div className="settings-title">Settings</div>
        <span />
      </header>
      <div className="settings-body">
        {error && <p className="sheet-error">{error}</p>}
        {!status && !error && <p className="ios-footnote top">Checking connections…</p>}
        {status && (
          <>
            <p className="ios-section">Connections</p>
            <div className="ios-group">
              <Row title="Database · Supabase" check={status.database} />
              <Row title="Translation · Google" check={status.translation} />
              <Row title="Texting · Twilio" check={status.sms} demo />
            </div>

            <p className="ios-section">Twilio incoming-message webhook</p>
            <div className="ios-group">
              <div className="ios-row copy-row">
                <code>{status.webhooks.incoming}</code>
                <button
                  className="bar-btn strong"
                  onClick={() => {
                    navigator.clipboard?.writeText(status.webhooks.incoming);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="ios-footnote">
              In Twilio, open your phone number → Messaging configuration → “A message comes in” → Webhook, HTTP POST,
              and paste this address.
            </p>

            <p className="ios-section">Account</p>
            <div className="ios-group">
              <div className="ios-row">
                <span className="muted">Signed in as</span>&nbsp;{status.user}
              </div>
              <button className="ios-row danger" onClick={signOut}>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
