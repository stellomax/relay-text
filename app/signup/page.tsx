"use client";

import { useEffect, useState } from "react";
import { isPersonalEmail } from "@/lib/schoolEmail";

// Teachers create their account with the 5-digit sign-up code their Relay Text admin gave them.
export default function Signup() {
  const [f, setF] = useState({ code: "", name: "", email: "", password: "", confirmPassword: "" });
  const [check, setCheck] = useState<null | { valid: boolean; name?: string; school?: string | null }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Check the code once all 5 digits are in, and greet the teacher by name.
  useEffect(() => {
    if (!/^\d{5}$/.test(f.code)) {
      setCheck(null);
      return;
    }
    let live = true;
    fetch(`/api/signup?code=${f.code}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setCheck(d);
        if (d.valid && d.name) setF((v) => (v.name ? v : { ...v, name: d.name }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [f.code]);

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
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setError(data.error || `Sign-up failed (error ${res.status}).`);
    setBusy(false);
  }

  const codeOk = check?.valid === true;
  const personal = /@.+\./.test(f.email) && isPersonalEmail(f.email);
  const mismatch = f.confirmPassword.length > 0 && f.confirmPassword !== f.password;
  const ready = codeOk && !personal && f.password.length >= 8 && f.password === f.confirmPassword;

  return (
    <div className="login">
      <img src="/relay-text-logo.png" alt="Relay Text" className="login-logo" />
      <p className="login-tag">Create your teacher account.</p>
      <form onSubmit={submit} className="login-form">
        <div className="ios-group">
          <input
            className="code-input"
            placeholder="5-digit sign-up code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={5}
            value={f.code}
            onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 5) })}
            autoFocus
            required
          />
        </div>
        {check && !check.valid && <p className="login-error">That code isn’t valid or has already been used.</p>}
        {codeOk && (
          <p className="code-ok">
            Code accepted{check?.name ? ` · Welcome, ${check.name.split(" ")[0]}!` : ""}
            {check?.school ? ` (${check.school})` : ""}
          </p>
        )}
        {!check && <p className="ios-footnote">Your Relay Text admin gives you this code.</p>}

        <div className="ios-group">
          <input placeholder="Your name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <input
            type="email"
            placeholder="School email"
            autoComplete="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Choose a password (8+ characters)"
            autoComplete="new-password"
            minLength={8}
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={f.confirmPassword}
            onChange={(e) => setF({ ...f, confirmPassword: e.target.value })}
            required
          />
        </div>
        {personal && <p className="login-error">Please use your school email address, not a personal one.</p>}
        {mismatch && <p className="login-error">The passwords don’t match.</p>}
        <p className="ios-footnote">
          You’ll get your own Relay Text number for texting families, so your personal cell number is never shared.
        </p>
        {error && <p className="login-error">{error}</p>}
        <button className="ios-button" disabled={busy || !ready}>
          {busy ? "Creating Account…" : "Create Account"}
        </button>
      </form>
      <p className="login-links">
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
