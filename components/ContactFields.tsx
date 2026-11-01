"use client";

import { LANGUAGES } from "@/lib/languages";

export type ContactForm = { parent_name: string; child_name: string; phone: string; language: string; groups?: string; consent?: boolean };

const splitGroups = (s: string) => s.split(",").map((g) => g.trim()).filter(Boolean);

// Grouped inset rows, like the iOS Contacts editor.
export default function ContactFields({
  value,
  onChange,
  autoFocus,
  groupOptions = [],
  askConsent = false,
}: {
  askConsent?: boolean;
  value: ContactForm;
  onChange: (v: ContactForm) => void;
  autoFocus?: boolean;
  groupOptions?: string[];
}) {
  const current = splitGroups(value.groups || "");
  const suggestions = groupOptions.filter((g) => !current.some((c) => c.toLowerCase() === g.toLowerCase()));
  const addGroup = (g: string) => onChange({ ...value, groups: [...current, g].join(", ") });
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
      <div className="ios-group">
        <label className="ios-row">
          <span className="ios-row-label">groups</span>
          <input placeholder="e.g. Period 2, Soccer" value={value.groups || ""} onChange={set("groups")} autoComplete="off" />
        </label>
      </div>
      {suggestions.length > 0 && (
        <div className="group-suggest">
          {suggestions.slice(0, 12).map((g) => (
            <button type="button" key={g} className="group-chip add" onClick={() => addGroup(g)}>
              + {g}
            </button>
          ))}
        </div>
      )}
      <p className="ios-footnote">Optional. Use groups to text a whole class or team at once from Families.</p>
      {askConsent && (
        <label className="consent-row">
          <input type="checkbox" checked={!!value.consent} onChange={(e) => onChange({ ...value, consent: e.target.checked })} />
          <span>
            This parent gave their mobile number to the school and agreed to receive text messages about their child.
            <span className="ios-row-hint">Required before texting. Your name and the date are saved as the record.</span>
          </span>
        </label>
      )}
    </>
  );
}
