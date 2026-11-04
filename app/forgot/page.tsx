"use client";

import { useState } from "react";

// Forgot password: we email a link to set a new one.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setSent(true);
    else setError(data.error || "Something went wrong. Please try again.");
    setBusy(false);
  }

  return (
    <div className="login">
      <a href="/" className="login-logo-link" aria-label="Relay home page">
        <img src="/relay-text-logo.png" alt="Relay" className="login-logo" />
      </a>
      {sent ? (
        <div className="done-card">
          <p className="done-title">Check your email</p>
          <p>
            If <strong>{email}</strong> has a Relay account, we’ve sent it a link to set a new password. It can take a minute or two to
            arrive, so check your spam folder too.
          </p>
          <p className="ios-footnote">The link works once and expires after an hour.</p>
          <p className="login-links">
            <a href="/login">Back to Sign In</a>
          </p>
        </div>
      ) : (
        <>
          <p className="login-tag">Forgot your password?</p>
          <p className="forgot-help">Enter the email you sign in with. We’ll email you a link to set a new password.</p>
          <form onSubmit={submit} className="login-form">
            <div className="ios-group">
              <input type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button className="ios-button" disabled={busy}>
              {busy ? "Sending…" : "Email Me a Reset Link"}
            </button>
          </form>
          <p className="login-links">
            <a href="/login">Back to Sign In</a>
            <br />
            No email? Your Relay admin can also reset your password.
          </p>
        </>
      )}
    </div>
  );
}
