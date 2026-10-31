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
    if (res.ok) window.location.href = "/";
    else {
      setError(data.error || "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <img src="/relay-text-logo.png" alt="Relay Text" className="login-logo" />
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
    </div>
  );
}
