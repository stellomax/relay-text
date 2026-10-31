"use client";

import { LANGUAGES } from "@/lib/languages";

export type ContactForm = { parent_name: string; child_name: string; phone: string; language: string };

// Grouped inset rows, like the iOS Contacts editor.
export default function ContactFields({
  value,
  onChange,
  autoFocus,
}: {
  value: ContactForm;
  onChange: (v: ContactForm) => void;
  autoFocus?: boolean;
}) {
  const set = (k: keyof ContactForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <div className="ios-group">
        <input placeholder="Parent or guardian name" value={value.parent_name} onChange={set("parent_name")} autoFocus={autoFocus} />
        <input placeholder="Student name (optional)" value={value.child_name} onChange={set("child_name")} />
      </div>
      <div className="ios-group">
        <label className="ios-row">
          <span className="ios-row-label">mobile</span>
          <input
            inputMode="tel"
            autoComplete="off"
            placeholder="(303) 555-1234"
            value={value.phone}
            onChange={set("phone")}
          />
        </label>
        <label className="ios-row">
          <span className="ios-row-label">language</span>
          <select value={value.language} onChange={set("language")}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
                {l.native !== l.name ? ` · ${l.native}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ios-footnote">
        Texts are sent and received in this language. You always read and write in English.
      </p>
    </>
  );
}
