"use client";

import { useState } from "react";

const ROLES = [
  "Principal or assistant principal",
  "District administrator",
  "ESL / ELL coordinator",
  "Family engagement staff",
  "Teacher",
  "Other",
];
const SIZES = ["Under 300 students", "300–600", "600–1,000", "1,000–5,000", "5,000+ (district)"];

const EMPTY = { first_name: "", last_name: "", email: "", phone: "", role: "", organization: "", location: "", students: "", message: "", website: "" };

// "Bring Relay to your school": a short form that saves the request for the Relay team.
export default function ContactForm() {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Something went wrong. Please try again.");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="ct-card ct-done">
        <div className="ct-check" aria-hidden>
          ✓
        </div>
        <h2>Thanks, {f.first_name}!</h2>
        <p>We’ve got your request and will reply to {f.email} within one business day.</p>
        <a className="lp-btn ghost" href="/">
          Back to the home page
        </a>
      </div>
    );
  }

  return (
    <form className="ct-card" onSubmit={submit}>
      <h2>Request a demo &amp; pricing</h2>
      <div className="ct-row">
        <label>
          <span className="ct-lbl">First name<span className="ct-req">*</span></span>
          <input required value={f.first_name} onChange={set("first_name")} autoComplete="given-name" />
        </label>
        <label>
          <span className="ct-lbl">Last name<span className="ct-req">*</span></span>
          <input required value={f.last_name} onChange={set("last_name")} autoComplete="family-name" />
        </label>
      </div>
      <div className="ct-row">
        <label>
          <span className="ct-lbl">Work email<span className="ct-req">*</span></span>
          <input required type="email" value={f.email} onChange={set("email")} autoComplete="email" />
        </label>
        <label>
          Phone
          <input type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" />
        </label>
      </div>
      <label>
        <span className="ct-lbl">Your role<span className="ct-req">*</span></span>
        <select required value={f.role} onChange={set("role")}>
          <option value="" disabled>
            Choose one
          </option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="ct-lbl">School or district<span className="ct-req">*</span></span>
        <input required value={f.organization} onChange={set("organization")} autoComplete="organization" />
      </label>
      <div className="ct-row">
        <label>
          City &amp; state
          <input value={f.location} onChange={set("location")} placeholder="e.g. Denver, CO" />
        </label>
        <label>
          Number of students
          <select value={f.students} onChange={set("students")}>
            <option value="">Choose one</option>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Anything we should know?
        <textarea rows={4} value={f.message} onChange={set("message")} placeholder="Languages your families speak, timing, questions…" />
      </label>
      {/* Hidden from people; bots fill it in. */}
      <input className="ct-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} aria-hidden="true" />
      {error && <p className="ct-error">{error}</p>}
      <button className="lp-btn ct-submit" disabled={busy}>
        {busy ? "Sending…" : "Request Info"}
      </button>
      <p className="ct-fine">We’ll only use this to reply to you. No mailing lists.</p>
    </form>
  );
}
