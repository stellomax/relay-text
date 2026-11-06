import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY_DISPLAY, CONTACT_EMAIL } from "@/lib/brand";
import SiteNav from "@/components/SiteNav";
import "../landing.css";
import "./trust.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "Trust Center | Relay",
  description:
    "How Relay protects student and family information, and how it helps schools and districts meet FERPA, Colorado's Student Data Transparency and Security Act and texting rules.",
};

// Keep every line here true of the app as it is today. Update UPDATED when anything changes.
const UPDATED = "November 6, 2026";

const AT_A_GLANCE = [
  { t: "Minimal data", d: "Parent name, phone and language, student name(s), and the messages. No grades, attendance, health or other records." },
  { t: "Never sold", d: "No advertising, no selling or renting data, no profiles of students." },
  { t: "School-controlled", d: "Each school's admins manage their own Parents list. Data is deleted on request or when a contract ends." },
  { t: "Plain texts", d: "Parents get ordinary text messages. No app, no account, and teachers' own numbers are never shared." },
];

// The rules schools follow, what each asks of a service like Relay, and how Relay supports it.
const LAWS = [
  {
    law: "FERPA (federal)",
    asks: "Student information shared with a vendor is used only for the school's purposes, under the school's control.",
    relay: "Relay uses family information only to carry school-to-home conversations, under the school's agreement. Admins control the Parents list; access is limited by role and school.",
  },
  {
    law: "Colorado Student Data Transparency and Security Act",
    asks: "A contract with required privacy terms; a plain-language list of the data a vendor collects; correction; data destruction; breach notice.",
    relay: (
      <>
        We sign the district's data privacy agreement. Our <a href="/student-data">Student Data Disclosure</a> lists every data
        element, why we collect it and who we share it with.
      </>
    ),
  },
  {
    law: "Texting rules (TCPA and carrier rules)",
    asks: "Parents' consent for non-emergency texts, a clear way to opt out, and honoring it.",
    relay: "Parents opt in on their district's sign-up page, or an admin confirms consent the district collected. Relay records who, when and how. STOP and HELP work on every text, in every language.",
  },
  {
    law: "Colorado breach notice (government entities)",
    asks: "Vendors that hold data for a district notify it and cooperate if there's a breach; the district then has 30 days to notify residents.",
    relay: "Our written incident response plan aims to tell the district within 72 hours of confirming a problem, or sooner if the contract says so.",
  },
  {
    law: "Open records and retention (CORA, district schedules)",
    asks: "Texts about school business may be public records, kept for the district's retention period.",
    relay: "Each school sets how long messages are kept (2 years by default, or the contract's period). We provide a school's message history on request for a records request.",
  },
  {
    law: "Accessibility (ADA Title II)",
    asks: "District websites and apps meet WCAG 2.1 Level AA.",
    relay: (
      <>
        We're reviewing the parent sign-up page and the teacher app against WCAG 2.1 AA. If anything is hard to use, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we'll help right away.
      </>
    ),
  },
  {
    law: "Language access",
    asks: "Schools communicate meaningfully with parents who speak other languages.",
    relay: "Every text is translated into the family's language, and replies are translated back for the teacher.",
  },
];

const SECURITY = [
  { t: "Encrypted", d: "All traffic uses HTTPS (browsers are told to always use it), and the database is encrypted at rest." },
  { t: "Signed-in access only", d: "Staff sign in with their own password (new passwords need 12+ characters). Two-step sign-in with an authenticator app is available for every account." },
  { t: "Least access", d: "Teachers see their own school's parents and their own conversations. School admins see only their school. This is enforced on our servers, not just hidden on screen." },
  { t: "Activity Log", d: "Viewing another teacher's inbox, moving or deleting conversations, Parents list changes and account changes are all recorded, with who and when." },
  { t: "Abuse protection", d: "Sign-in, sign-up and the parent sign-up form are rate-limited. Sign-out, password resets and turning off an account end that person's sessions on every device." },
  { t: "Locked-down database", d: "Row-level security is on for every table, and service keys stay on our servers, never in the browser." },
  { t: "Private teacher numbers", d: "Texts go out from a Relay number, so teachers' personal cell numbers are never exposed." },
  { t: "Checked code", d: "Every change is type-checked before it deploys, with exact package versions and automatic checks for known vulnerabilities." },
];

const PROVIDERS = [
  { name: "Twilio", role: "Text-message delivery", data: "Parent phone numbers and message text" },
  { name: "Google Cloud Translation", role: "Translating messages", data: "Message text only (no names or phone numbers attached by us)" },
  { name: "Supabase", role: "Database and staff sign-in", data: "All Relay data, encrypted at rest" },
  { name: "Vercel", role: "Hosting the website and app", data: "Data passes through while staff use the app" },
];

const DOCS = [
  { t: "Data privacy agreement", d: "We'll sign your district's agreement or the national model agreement with your state's terms." },
  { t: "Security questionnaire", d: "Send us your district's vetting questionnaire; we answer quickly." },
  { t: "Incident response summary", d: "How we detect, contain and report a security incident." },
  { t: "Message history export", d: "A school's or a family's messages, for a records request or a district review." },
  { t: "Written deletion confirmation", d: "When a school or district asks, or its contract ends, we delete its data within 30 days and confirm in writing." },
];

export default function TrustPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteNav />

      <main className="lp-about-main tc">
        <section className="lp-page-hero">
          <p className="lp-eyebrow">Trust Center</p>
          <h1>Family information stays safe, private and in the school's control.</h1>
          <p className="lp-lede">
            {BRAND} is built for school-to-home communication, and nothing else. Here's what we collect, how we protect it, and how{" "}
            {BRAND} helps your school and district meet the rules you follow. Everything your IT team needs is on this page or a
            request away.
          </p>
          <p className="tc-updated">Last updated {UPDATED}</p>
        </section>

        <section className="tc-glance" aria-label="At a glance">
          {AT_A_GLANCE.map((x) => (
            <div className="tc-card" key={x.t}>
              <b>{x.t}</b>
              <span>{x.d}</span>
            </div>
          ))}
        </section>

        <section className="lp-about-why" aria-labelledby="laws">
          <h2 id="laws">The rules schools follow, and how {BRAND} helps</h2>
          <p>
            Schools stay responsible for following these rules. {BRAND} is designed so that using it supports them rather than
            creating new work.
          </p>
          <div className="legal-table-wrap">
            <table className="legal-table tc-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>What it asks</th>
                  <th>How {BRAND} supports it</th>
                </tr>
              </thead>
              <tbody>
                {LAWS.map((l) => (
                  <tr key={l.law}>
                    <td>
                      <strong>{l.law}</strong>
                    </td>
                    <td>{l.asks}</td>
                    <td>{l.relay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lp-about-why" aria-labelledby="security">
          <h2 id="security">How we protect it</h2>
          <div className="tc-grid">
            {SECURITY.map((x) => (
              <div className="tc-item" key={x.t}>
                <b>{x.t}</b>
                <span>{x.d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-about-why" aria-labelledby="data">
          <h2 id="data">Your data, your rules</h2>
          <ul className="tc-list">
            <li>
              <strong>What we collect:</strong> the full list, with the reason for each item, is on our{" "}
              <a href="/student-data">Student Data Disclosure</a>.
            </li>
            <li>
              <strong>How long we keep it:</strong> messages are deleted automatically after 2 years, or the period in your
              contract. Parents who replied STOP stay blocked; only their number and the opt-out are kept.
            </li>
            <li>
              <strong>Deleting everything:</strong> when a school or district asks, or its contract ends, we delete its data
              within 30 days and confirm in writing.
            </li>
            <li>
              <strong>Corrections:</strong> admins fix a family's details on the Parents list at any time; we help with anything
              else.
            </li>
            <li>
              <strong>Consent:</strong> parents agree to texts from their district on a district-branded sign-up page, or the
              district provides its own record of consent. Every text includes a way to opt out.
            </li>
          </ul>
        </section>

        <section className="lp-about-why" aria-labelledby="providers">
          <h2 id="providers">Who helps us run {BRAND}</h2>
          <p>
            We share information only with these providers, only as needed to run {BRAND}. We'll tell contracted districts before
            adding or changing one.
          </p>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>What it does</th>
                  <th>Information involved</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.role}</td>
                    <td>{p.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lp-about-why" aria-labelledby="incidents">
          <h2 id="incidents">If something goes wrong</h2>
          <p>
            We keep a written incident response plan. If family or student information may have been exposed, we contain it
            first, preserve the evidence, and tell the affected district without unreasonable delay, aiming for 72 hours from
            confirming it, or sooner if the contract requires. We explain what happened, what was involved and what we're doing,
            and we help the district with anything it sends to families.
          </p>
        </section>

        <section className="lp-about-why" aria-labelledby="docs">
          <h2 id="docs">For your IT and privacy team</h2>
          <p>
            Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for any of these:
          </p>
          <div className="tc-grid">
            {DOCS.map((x) => (
              <div className="tc-item" key={x.t}>
                <b>{x.t}</b>
                <span>{x.d}</span>
              </div>
            ))}
          </div>
          <p className="tc-links">
            Read: <a href="/student-data">Student Data Disclosure</a> · <a href="/privacy">Privacy Policy</a> ·{" "}
            <a href="/terms">Terms &amp; Conditions</a>
          </p>
          <p className="tc-note">
            {BRAND} doesn't claim to be "FERPA certified": no such certification exists. Each district decides whether a service
            meets its policies, and we'll give your reviewers whatever they need to decide. This page isn't legal advice.
          </p>
        </section>

        <section className="lp-final">
          <h2>Questions from your district?</h2>
          <p>We'll answer your IT team directly, sign your data privacy agreement, and help you plan a pilot.</p>
          <div className="lp-ctas center">
            <a className="lp-btn light" href={`mailto:${CONTACT_EMAIL}?subject=Relay%20privacy%20review`}>
              Email {CONTACT_EMAIL}
            </a>
            <a className="lp-btn outline-light" href="/contact">
              Request a Quote
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <span>
          {BRAND} is a service of {COMPANY_DISPLAY}.
        </span>
        <nav aria-label="Footer">
          <a href="/join">Parents: sign up for texts</a>
          <a href="/trust">Trust Center</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/student-data">Student Data</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </nav>
      </footer>
    </div>
  );
}
