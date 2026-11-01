"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) window.location.href = data.home || "/inbox";
    else {
      setError(data.error || `Sign in failed (error ${res.status}). Please send this to your Relay admin.`);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <img src="/relay-text-logo.png" alt="RelayText" className="login-logo" />
      <p className="login-tag">Text families in their own language.</p>
      <form onSubmit={submit} className="login-form">
        <div className="ios-group">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="login-error">{error}</p>}
        <button className="ios-button" disabled={busy}>
          {busy ? "Signing In…" : "Sign In"}
        </button>
      </form>
      <p className="login-links">
        Teachers: <a href="/signup">create an account</a>
        <br />
        <a href="/join">Parents: sign up for texts</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
      </p>
    </div>
  );
}
