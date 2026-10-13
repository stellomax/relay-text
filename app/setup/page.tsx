"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";

type Check = { ok: boolean; detail: string };
type Status = { user: string; database: Check; translation: Check; sms: Check; webhooks: { incoming: string; status: string } };

function Row({ title, check, demoOk }: { title: string; check: Check; demoOk?: boolean }) {
  const cls = check.ok ? "ok" : demoOk ? "demo" : "bad";
  return (
    <div className="check-row">
      <span className={`dot ${cls}`} aria-hidden />
      <div>
        <strong>{title}</strong>
        <div className="muted small-text">{check.detail}</div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api<Status>("/api/setup").then(setStatus).catch((e) => setError(e.message));
  }, []);

  function copy(v: string) {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Setup</h1>
          <p className="muted">Connection status. Keys are set in Vercel and never shown here.</p>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {!status && !error && <p className="muted">Checking connections…</p>}
      {status && (
        <>
          <div className="card stack">
            <Row title="Database (Supabase)" check={status.database} />
            <Row title="Translation (Google)" check={status.translation} />
            <Row title="Texting (Twilio)" check={status.sms} demoOk />
            <p className="muted small-text">Signed in as {status.user}</p>
          </div>
          <div className="card stack">
            <h2>Twilio webhook addresses</h2>
            <p className="muted small-text">
              In Twilio: Phone Numbers → Manage → Active numbers → your number → Messaging configuration. Set{" "}
              <em>A message comes in</em> to Webhook, HTTP POST, with this address:
            </p>
            {[status.webhooks.incoming].map((u) => (
              <div key={u} className="copy-row">
                <code>{u}</code>
                <button className="btn ghost" onClick={() => copy(u)}>
                  {copied === u ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
            <p className="muted small-text">
              Delivery updates (Sent → Delivered) are requested automatically on every text using{" "}
              <code>{status.webhooks.status}</code>.
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}
