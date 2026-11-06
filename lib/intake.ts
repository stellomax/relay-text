// District onboarding intake form (relaytext.io/intake/<link>): the questions Relay needs to register a
// school district as its own texting brand with Twilio and the carriers (ISV setup, one K-12 campaign per district).
// Shared by the public form, its API and the super admin review page. No server-only imports here.
// Field names in Section 1 and 2 line up with Twilio's brand form, so answers can feed automated registration later.

import { COMPANY } from "./brand";

export type FieldType = "text" | "long" | "choice" | "email" | "phone" | "ein" | "url" | "state" | "zip";

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: string[]; // for "choice"
  required?: boolean; // needed before the form can be submitted
};

export type Section = { id: string; tab: string; title: string; intro?: string; fields: Field[]; uploads?: UploadKind[] };

export type UploadKind = "ein_letter" | "consent_wording" | "optout_list" | "logo" | "dpa" | "questionnaire" | "other";

export const UPLOAD_LABELS: Record<UploadKind, string> = {
  ein_letter: "IRS EIN letter (CP 575 or 147C) or other record of the legal name and EIN",
  consent_wording: "Parent consent wording (copy or screenshot)",
  optout_list: "List of parents who opted out of texts",
  logo: "District logo",
  dpa: "Data privacy agreement or vendor addendum",
  questionnaire: "Vendor or app vetting questionnaire",
  other: "Other",
};

export const YES_NO = ["Yes", "No", "Not sure"];
const SITE_CHOICE = ["The district's own page", "Relay's page", "Both", "Not sure"];

const rep = (n: 1 | 2): Field[] => {
  const req = n === 1;
  return [
    { id: `rep${n}_first`, label: "First name", type: "text", required: req },
    { id: `rep${n}_last`, label: "Last name", type: "text", required: req },
    { id: `rep${n}_title`, label: "Job title", type: "text", required: req, hint: "e.g. Director of Communications" },
    { id: `rep${n}_position`, label: "Role", type: "choice", options: ["Director", "Superintendent", "Chief Information Officer", "General Manager", "Other"], required: req },
    { id: `rep${n}_email`, label: "District email", type: "email", required: req, hint: "Must be an official district address, not Gmail or another personal account." },
    { id: `rep${n}_phone`, label: "Phone", type: "phone", required: req },
  ];
};

export const SECTIONS: Section[] = [
  {
    id: "identity",
    tab: "District",
    title: "1. District identity",
    intro:
      "Carriers check these details against IRS and state records, so they must match exactly. Even a small difference (“School District No. 1” vs. “SD 1”) can cause a rejection.",
    fields: [
      { id: "legal_name", label: "District's legal name, exactly as on the IRS EIN letter", type: "text", required: true },
      { id: "ein", label: "EIN (Employer Identification Number)", type: "ein", required: true, hint: "9 digits, e.g. 84-1234567" },
      { id: "street", label: "Official street address", type: "text", required: true, hint: "As on IRS and state records" },
      { id: "city", label: "City", type: "text", required: true },
      { id: "state", label: "State", type: "state", required: true },
      { id: "zip", label: "ZIP code", type: "zip", required: true },
      { id: "website", label: "Official website", type: "url", required: true, hint: "e.g. https://www.dcsdk12.org" },
      { id: "public_district", label: "Is the district a public school district (a government entity)?", type: "choice", options: YES_NO, required: true },
      { id: "own_ein_schools", label: "Are any schools in scope charter or private schools with their own EIN? If yes, list them with their EINs.", type: "long" },
      { id: "existing_texting", label: "Does the district already send texts through another service (ParentSquare, SchoolMessenger, Infinite Campus, TalkingPoints, other)? Which?", type: "long" },
    ],
    uploads: ["ein_letter"],
  },
  {
    id: "contacts",
    tab: "Contacts",
    title: "2. Authorized contacts",
    intro:
      "The texting registry asks for one or two district employees who can confirm the district is real and approve texting in its name. Review notices go to these email addresses.",
    fields: [
      ...rep(1),
      ...rep(2),
      { id: "notice_contact", label: "Who should receive registration and review notices? Can they forward them to Relay the same day?", type: "long" },
      { id: "daily_contact", label: "Relay's day-to-day contact during setup, if different (name, email, phone)", type: "long" },
    ],
  },
  {
    id: "consent",
    tab: "Consent",
    title: "3. Parent consent to receive texts",
    intro:
      "Relay may only text parents who agreed to receive texts. Consent can come from parents signing up on the district's Relay sign-up page, or from district records showing parents gave clear permission (for example on enrollment forms). Carriers must approve both. A “reply YES” text can't be used as consent.",
    fields: [
      { id: "consent_collect", label: "How does the district collect parent mobile numbers today? (enrollment forms, parent portal, other)", type: "long" },
      { id: "consent_asks", label: "Does that process ask parents to agree to receive text messages?", type: "choice", options: YES_NO },
      { id: "consent_wording", label: "If yes, the exact wording parents agree to, and where and when it's shown", type: "long" },
      { id: "consent_share", label: "Roughly what share of parents have given that consent?", type: "text" },
      { id: "optout_record", label: "How does the district record parents who opt out of texts?", type: "long" },
      { id: "texting_policy", label: "Board policy on texting or parent communication, if any (name or number)", type: "text" },
    ],
    uploads: ["consent_wording", "optout_list"],
  },
  {
    id: "signup",
    tab: "Sign-up page",
    title: "4. District sign-up page for parents",
    intro:
      "Relay will set up a parent sign-up page in the district's name, for example “Douglas County School District, powered by Relay.” Carriers require it to show the district's name and links to its terms and privacy pages.",
    fields: [
      { id: "page_name", label: "How should the district's name appear on the page?", type: "text" },
      { id: "logo_ok", label: "May Relay use the district logo on the page?", type: "choice", options: ["Yes", "No"] },
      { id: "privacy_choice", label: "Privacy policy link to show", type: "choice", options: SITE_CHOICE },
      { id: "privacy_url", label: "District privacy policy link (if used)", type: "url" },
      { id: "terms_choice", label: "Terms link to show", type: "choice", options: SITE_CHOICE },
      { id: "terms_url", label: "District terms link (if used)", type: "url" },
      { id: "page_languages", label: "Languages other than English the page should be offered in", type: "text" },
    ],
    uploads: ["logo"],
  },
  {
    id: "scope",
    tab: "Scope",
    title: "5. Scope and timing",
    intro: "These answers size the setup. Each teacher gets a private Relay texting number; more than 49 teachers needs an extra carrier review.",
    fields: [
      { id: "schools", label: "Schools in scope (list them)", type: "long" },
      { id: "teachers", label: "Approximate number of teachers and staff who will text parents", type: "text" },
      { id: "parents", label: "Approximate number of parents or families", type: "text" },
      { id: "languages", label: "Most common home languages other than English", type: "text" },
      { id: "pilot", label: "Which schools should start first (pilot)?", type: "long" },
      { id: "start_date", label: "Target start date for texting", type: "text", hint: "Allow 3+ weeks after this form is complete." },
      { id: "parent_list", label: "How will the parent list be provided, and which student information system do you use?", type: "long" },
    ],
  },
  {
    id: "it",
    tab: "IT & privacy",
    title: "6. IT and privacy",
    intro: "Relay is glad to complete the district's review and sign its data privacy agreement. Relay's Student Data Disclosure is at relaytext.io/student-data.",
    fields: [
      { id: "retention", label: "How long does the district's records-retention schedule keep parent communications? (Relay's default is 2 years.)", type: "text" },
      { id: "incident_contact", label: "Who should Relay contact about a security incident? (name, email, phone)", type: "long" },
      { id: "sso", label: "Does the district require staff to sign in with Google or Microsoft (single sign-on), or two-step sign-in?", type: "long" },
      { id: "allowlist", label: "Do district email filters need to allowlist Relay's sign-in and password emails? Who handles that?", type: "long" },
      { id: "sis", label: "Is a student information system integration required, or is a CSV upload acceptable?", type: "text" },
      { id: "it_requirements", label: "Any requirements for accessibility (e.g. a VPAT), U.S.-only data storage or approval of subprocessors?", type: "long" },
    ],
    uploads: ["dpa", "questionnaire"],
  },
];

export const AUTH_FIELDS: Field[] = [
  { id: "auth_name", label: "Full name", type: "text", required: true },
  { id: "auth_title", label: "Title", type: "text", required: true },
];

export const AUTHORIZATION_TEXT = `By submitting this form, the district authorizes Relay (${COMPANY}) to register the district as a texting brand with Twilio and U.S. mobile carriers, and to send text messages to parents on the district's behalf, using the information in this form. I confirm I am authorized to give this permission for the district.`;

// The form shows one tab per section, plus a last tab for the authorization.
export const AUTH_TAB = { id: "authorize", tab: "Authorize", title: "7. Authorization" };
export const TABS = [...SECTIONS.map(({ id, tab, title }) => ({ id, tab, title })), AUTH_TAB];

// Which tab a field (or "auth_agree") is on.
export function tabOf(fieldId: string): string {
  return SECTIONS.find((s) => s.fields.some((f) => f.id === fieldId))?.id || AUTH_TAB.id;
}

export const ALL_FIELDS: Field[] = [...SECTIONS.flatMap((s) => s.fields), ...AUTH_FIELDS];
const FIELD_IDS = new Set(ALL_FIELDS.map((f) => f.id));

export type Answers = Record<string, string>;

export type IntakeFile = { path: string; name: string; kind: UploadKind; size: number; uploaded_at: string };

export const MAX_FILE_MB = 10;
export const FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
];

// Keep only known fields, as trimmed strings.
export function cleanAnswers(input: unknown): Answers {
  const out: Answers = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!FIELD_IDS.has(k) && k !== "auth_agree") continue;
    out[k] = String(v ?? "").slice(0, 4000);
  }
  return out;
}

const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|aol|icloud|me|msn|comcast|protonmail|proton)\.(com|net|me)$/i;

export const digits = (v: string) => (v || "").replace(/\D/g, "");

// One field's problem, or "" if it's fine. Empty optional fields are fine.
export function fieldProblem(f: Field, raw: string): string {
  const v = (raw || "").trim();
  if (!v) return f.required ? "Required" : "";
  switch (f.type) {
    case "ein":
      return digits(v).length === 9 ? "" : "An EIN has 9 digits.";
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
      return FREE_MAIL.test(v) ? "Use an official district email address." : "";
    case "phone":
      return digits(v).length >= 10 ? "" : "Enter a 10-digit phone number.";
    case "url":
      return /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v) ? "" : "Enter a web address, e.g. https://www.district.org";
    case "state":
      return /^[A-Za-z]{2}$/.test(v) ? "" : "Use the 2-letter state code, e.g. CO";
    case "zip":
      return /^\d{5}(-\d{4})?$/.test(v) ? "" : "Enter a 5-digit ZIP code.";
    default:
      return "";
  }
}

// Everything that stops submission: field id → problem. Contact 2 is checked only if started.
export function submitProblems(a: Answers): Record<string, string> {
  const problems: Record<string, string> = {};
  const rep2Started = ["rep2_first", "rep2_last", "rep2_email", "rep2_phone", "rep2_title"].some((k) => (a[k] || "").trim());
  for (const f of ALL_FIELDS) {
    const isRep2 = f.id.startsWith("rep2_");
    const p = fieldProblem(isRep2 && rep2Started ? { ...f, required: true } : f, a[f.id] || "");
    if (p) problems[f.id] = p;
  }
  if (a.auth_agree !== "yes") problems.auth_agree = "Please confirm the authorization.";
  return problems;
}

export function fieldLabel(id: string): string {
  return ALL_FIELDS.find((f) => f.id === id)?.label || id;
}

// How much is filled in, for the admin list.
export function progress(a: Answers): { done: number; total: number } {
  const fields = ALL_FIELDS.filter((f) => !f.id.startsWith("rep2_"));
  return { done: fields.filter((f) => (a[f.id] || "").trim()).length, total: fields.length };
}
