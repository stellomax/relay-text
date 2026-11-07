"use client";

import { useEffect, useRef, useState } from "react";
import LegalPage from "@/components/LegalPage";
import LanguageSelect from "@/components/LanguageSelect";
import { BRAND, DEFAULT_DISTRICT } from "@/lib/brand";
import { formatPhoneInput } from "@/lib/phone";

// Public sign-up page: how parents and guardians opt in to school text messages.
export default function Join() {
  const [form, setForm] = useState({ parent_name: "", child_name: "", phone: "", language: "es" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("");
  const [teacher, setTeacher] = useState<{ name: string; school: string | null; district?: string } | null>(null);
  const [fromLink, setFromLink] = useState(false);
  const [checked, setChecked] = useState(false);
  // Bot check (Cloudflare Turnstile). Only shown when the site key is set in Vercel.
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState("");
  const captchaBox = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // A teacher's personal link (relaytext.io/join?t=CODE) signs the family up with that teacher.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") || "";
    setCode(t);
    setFromLink(!!t);
  }, []);

  useEffect(() => {
    fetch("/api/join-info")
      .then((r) => r.json())
      .then((d) => setSiteKey(d.captchaSiteKey || null))
      .catch(() => {});
  }, []);

  // Load Turnstile and draw the check once the site key is known.
  useEffect(() => {
    if (!siteKey || done) return;
    let cancelled = false;
    const draw = () => {
      const ts = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (cancelled || !ts || !captchaBox.current || widgetId.current) return;
      widgetId.current = ts.render(captchaBox.current, {
        sitekey: siteKey,
        language: "auto",
        callback: (t: string) => setCaptcha(t),
        "expired-callback": () => setCaptcha(""),
        "error-callback": () => setCaptcha(""),
      });
    };
    const src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    let tag = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (!tag) {
      tag = document.createElement("script");
      tag.src = src;
      tag.async = true;
      document.head.appendChild(tag);
    }
    if ((window as unknown as { turnstile?: Turnstile }).turnstile) draw();
    else tag.addEventListener("load", draw);
    return () => {
      cancelled = true;
      tag?.removeEventListener("load", draw);
    };
  }, [siteKey, done]);

  // A token works once: after a failed sign-up, get a fresh one.
  function resetCaptcha() {
    const ts = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (ts && widgetId.current) ts.reset(widgetId.current);
    setCaptcha("");
  }

  // Look up whose code this is (from the link, or typed in by the parent).
  useEffect(() => {
    const t = code.trim();
    setChecked(false);
    if (t.length < 4) {
      setTeacher(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/join-info?t=${encodeURIComponent(t)}`)
        .then((r) => r.json())
        .then((d) => setTeacher(d.teacher || null))
        .catch(() => setTeacher(null))
        .finally(() => setChecked(true));
    }, 300);
    return () => clearTimeout(timer);
  }, [code]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/optin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, consent, t: code, captcha }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setDone(true);
    else {
      setError(data.error || "Something went wrong. Please try again.");
      resetCaptcha();
    }
    setBusy(false);
  }

  const district = teacher?.district || DEFAULT_DISTRICT;

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
      {teacher && fromLink && (
        <p className="join-teacher">
          Sign up to get texts from <strong>{teacher.name}</strong>
          {teacher.school ? ` at ${teacher.school}` : ""}.
        </p>
      )}
      {fromLink && checked && !teacher && (
        <p className="join-error">This sign-up link isn’t working. Please ask your child’s teacher for a new link.</p>
      )}
      <p>
        {BRAND} lets your child’s teachers and school staff text you in your own language. You get a regular text message,
        with no app to download, and you can reply in your language.
      </p>

      <form className="join-form" onSubmit={submit}>
        {!fromLink && (
          <label>
            Teacher code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="From your child’s teacher"
              required
            />
            {teacher ? (
              <span className="join-ok">
                ✓ {teacher.name}
                {teacher.school ? `, ${teacher.school}` : ""}
              </span>
            ) : checked ? (
              <span className="join-hint bad">We couldn’t find that code. Check it with your child’s teacher.</span>
            ) : (
              <span className="join-hint">Your child’s teacher gives you this code or a sign-up link.</span>
            )}
          </label>
        )}
        <label>
          Parent or guardian name
          <input value={form.parent_name} onChange={set("parent_name")} autoComplete="name" required />
        </label>
        <label>
          Mobile phone number
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value, f.phone) }))} inputMode="tel" autoComplete="tel" placeholder="(303) 555-1234" required />
        </label>
        <label>
          Student name <span className="legal-small">(optional)</span>
          <input value={form.child_name} onChange={set("child_name")} />
        </label>
        <label>
          Language for text messages
          <LanguageSelect value={form.language} onChange={(code) => setForm((f) => ({ ...f, language: code }))} />
        </label>

        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I agree to receive text messages from <strong>{district}</strong> and my child’s school and teachers about my child and
            school matters, such as attendance, events, reminders and replies to my questions. Texts are sent using {BRAND}, the
            district’s texting service. Message frequency varies. Message
            and data rates may apply. Reply HELP for help. Reply STOP to opt out at any time. Consent is not a condition of
            enrollment. See our <a href="/terms">Terms &amp; Conditions</a> and <a href="/privacy">Privacy Policy</a>.
          </span>
        </label>

        {siteKey && <div ref={captchaBox} className="join-captcha" />}

        {error && <p className="join-error">{error}</p>}
        <button className="ios-button" disabled={busy || !consent || !teacher || (!!siteKey && !captcha)}>
          {busy ? "Signing up…" : "Sign up for texts"}
        </button>
      </form>
    </LegalPage>
  );
}

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
};
