"use client";

import { useState } from "react";
import LegalPage from "@/components/LegalPage";
import { LANGUAGES } from "@/lib/languages";
import { BRAND, COMPANY } from "@/lib/brand";

// Public sign-up page: how parents and guardians opt in to school text messages.
export default function Join() {
  const [form, setForm] = useState({ parent_name: "", child_name: "", phone: "", language: "es" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/optin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, consent }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setDone(true);
    else setError(data.error || "Something went wrong. Please try again.");
    setBusy(false);
  }

  if (done) {
    return (
      <LegalPage title="You're signed up" updated={false}>
        <p>
          Thank you. We sent a text to confirm. You’ll receive messages from your child’s school in your language, and you
          can reply in your language too.
        </p>
        <p className="legal-small">Reply STOP to opt out at any time, or HELP for help.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Get school texts in your language" updated={false}>
      <p>
        {BRAND} lets your child’s teachers and school staff text you in your own language. You get a regular text message,
        with no app to download, and you can reply in your language.
      </p>

      <form className="join-form" onSubmit={submit}>
        <label>
          Parent or guardian name
          <input value={form.parent_name} onChange={set("parent_name")} autoComplete="name" required />
        </label>
        <label>
          Mobile phone number
          <input value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="(303) 555-1234" required />
        </label>
        <label>
          Student name <span className="legal-small">(optional)</span>
          <input value={form.child_name} onChange={set("child_name")} />
        </label>
        <label>
          Language for text messages
          <select value={form.language} onChange={set("language")}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native === l.name ? l.name : `${l.native} (${l.name})`}
              </option>
            ))}
          </select>
        </label>

        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I agree to receive text messages from {BRAND} ({COMPANY}) on behalf of my child’s school about my child and school
            matters, such as attendance, events, reminders and replies to my questions. Message frequency varies. Message
            and data rates may apply. Reply HELP for help. Reply STOP to opt out at any time. Consent is not a condition of
            enrollment. See our <a href="/terms">Terms &amp; Conditions</a> and <a href="/privacy">Privacy Policy</a>.
          </span>
        </label>

        {error && <p className="join-error">{error}</p>}
        <button className="ios-button" disabled={busy || !consent}>
          {busy ? "Signing up…" : "Sign up for texts"}
        </button>
      </form>
    </LegalPage>
  );
}
