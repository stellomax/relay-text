"use client";

import { useEffect, useState } from "react";

// Opened from the reset email. Supabase puts the one-time token in the address after "#".
export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const err = hash.get("error_description") || query.get("error_description");
    if (err) setLinkError(/expired|invalid/i.test(err) ? "This reset link has expired or was already used." : err);
    const t = hash.get("access_token");
    if (t) setToken(t);
    else if (!err) setLinkError("This page needs the link from your reset email.");
    // Keep the token out of the address bar and browser history.
    if (window.location.hash) window.history.replaceState({}, "", "/reset-password");
  }, []);

  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = !!token && password.length >= 8 && password === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ access_token: token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = data.home || "/inbox";
      return;
    }
    setError(data.error || "Couldn't save the new password. Please try again.");
    setBusy(false);
  }

  return (
    <div className="login">
      <a href="/" className="login-logo-link" aria-label="Relay home page">
        <img src="/relay-text-logo.png" alt="Relay" className="login-logo" />
      </a>
      {linkError && !token ? (
        <div className="done-card">
          <p className="done-title">Link not working</p>
          <p>{linkError} Request a new one and use the newest email.</p>
          <p className="login-links">
            <a href="/forgot">Send a new reset link</a>
          </p>
        </div>
      ) : (
        <>
          <p className="login-tag">Choose a new password</p>
          <form onSubmit={submit} className="login-form">
            <div className="ios-group">
              <input
                type="password"
                placeholder="New password (at least 12 characters)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                required
                autoFocus
              />
              <input
                type="password"
                placeholder="Type it again"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {mismatch && <p className="login-error">The two passwords don’t match.</p>}
            {error && <p className="login-error">{error}</p>}
            <button className="ios-button" disabled={busy || !ready}>
              {busy ? "Saving…" : "Save and Sign In"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
