"use client";

import { useEffect, useState } from "react";
import { isPersonalEmail, REQUIRE_SCHOOL_EMAIL } from "@/lib/schoolEmail";

type Tab = "login" | "signup";

/** One page for staff: Sign In and Sign Up as two tabs. /login opens Sign In, /signup opens Sign Up. */
export default function AuthTabs({ initial }: { initial: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);

  function pick(t: Tab) {
    setTab(t);
    // keep the address bar in step, so a refresh or a shared link opens the same tab
    const path = t === "login" ? "/login" : "/signup";
    if (window.location.pathname !== path) history.replaceState(null, "", path + window.location.search);
  }

  return (
    <div className="login">
      <a href="/" className="login-logo-link" aria-label="Relay home page">
        <img src="/relay-text-logo.png" alt="Relay" className="login-logo" />
      </a>
      <p className="login-tag">{tab === "login" ? "Text families in their own language." : "Create your teacher account."}</p>
      <div className="segmented auth-tabs" role="tablist" aria-label="Sign in or sign up">
        <button type="button" role="tab" aria-selected={tab === "login"} className={tab === "login" ? "on" : ""} onClick={() => pick("login")}>
          Sign In
        </button>
        <button type="button" role="tab" aria-selected={tab === "signup"} className={tab === "signup" ? "on" : ""} onClick={() => pick("signup")}>
          Sign Up
        </button>
      </div>
      {tab === "login" ? <LoginForm /> : <SignupForm />}
      <p className="login-links">
        <a href="/join">Parents: sign up for texts</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
      </p>
    </div>
  );
}

function LoginForm() {
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
    <form onSubmit={submit} className="login-form">
      <div className="ios-group">
        <input type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
      <p className="forgot-link">
        <a href="/forgot">Forgot password?</a>
      </p>
    </form>
  );
}

// Teachers create their account with the 5-digit sign-up code their Relay admin gave them.
function SignupForm() {
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

  const codeOk = check?.valid === true;
  const personal = REQUIRE_SCHOOL_EMAIL && /@.+\./.test(f.email) && isPersonalEmail(f.email);
  const mismatch = f.confirmPassword.length > 0 && f.confirmPassword !== f.password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // The button is always purple and clickable; say what's missing instead of greying it out.
    const missing = !codeOk
      ? "Please enter the 5-digit sign-up code from your Relay admin."
      : personal
        ? "Please use your school email address, not a personal one."
        : f.password.length < 8
          ? "Please choose a password with at least 8 characters."
          : f.password !== f.confirmPassword
            ? "The passwords don’t match."
            : "";
    if (missing) {
      setError(missing);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = "/inbox";
      return;
    }
    setError(data.error || `Sign-up failed (error ${res.status}).`);
    setBusy(false);
  }


  return (
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
          required
        />
      </div>
      {check && !check.valid && <p className="login-error">That code isn’t valid or has already been used.</p>}
      {codeOk && (
        <p className="code-ok">
          Code accepted
          {check?.school ? ` · ${check.school}` : ""}
          {check?.name ? ` · Welcome, ${check.name.split(" ")[0]}!` : ""}
        </p>
      )}
      {!check && <p className="ios-footnote">Your Relay admin gives you this code.</p>}

      <div className="ios-group">
        <input placeholder="Your name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input
          type="email"
          placeholder={REQUIRE_SCHOOL_EMAIL ? "School email" : "Email"}
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
      {error && <p className="login-error">{error}</p>}
      <button className="ios-button" disabled={busy}>
        {busy ? "Creating Account…" : "Create Account"}
      </button>
    </form>
  );
}
