"use client";

import { useState } from "react";

// Teachers request an account here. An admin approves it, and then they get their own texting number.
export default function Signup() {
  const [f, setF] = useState({ name: "", email: "", school: "", area_code: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "pending" | "active">(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setDone(data.pending ? "pending" : "active");
    else setError(data.error || `Sign-up failed (error ${res.status}).`);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="login">
        <img src="/relay-text-logo.png" alt="Relay Text" className="login-logo" />
        <div className="login-form done-card">
          <p className="done-title">{done === "pending" ? "Thanks for signing up!" : "You're all set"}</p>
          <p className="login-tag">
            {done === "pending"
              ? "Your account is waiting for approval. Once an admin approves it, you can sign in and you'll get your own Relay Text number."
              : "Your account is ready. Sign in to get started."}
          </p>
          <a className="ios-button link-button" href="/login">
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <img src="/relay-text-logo.png" alt="Relay Text" className="login-logo" />
      <p className="login-tag">Create your teacher account.</p>
      <form onSubmit={submit} className="login-form">
        <div className="ios-group">
          <input placeholder="Your name" autoComplete="name" value={f.name} onChange={set("name")} required />
          <input type="email" placeholder="School email" autoComplete="email" value={f.email} onChange={set("email")} required />
        </div>
        <div className="ios-group">
          <input placeholder="School" value={f.school} onChange={set("school")} required />
          <input
            placeholder="Area code for your number (e.g. 303)"
            inputMode="numeric"
            maxLength={3}
            value={f.area_code}
            onChange={set("area_code")}
          />
        </div>
        <div className="ios-group">
          <input
            type="password"
            placeholder="Choose a password (8+ characters)"
            autoComplete="new-password"
            minLength={8}
            value={f.password}
            onChange={set("password")}
            required
          />
        </div>
        <p className="ios-footnote">
          You’ll get your own Relay Text number for texting families, so your personal cell number is never shared.
        </p>
        {error && <p className="login-error">{error}</p>}
        <button className="ios-button" disabled={busy}>
          {busy ? "Creating Account…" : "Create Account"}
        </button>
      </form>
      <p className="login-links">
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
