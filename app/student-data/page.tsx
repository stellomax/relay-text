import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { BRAND, COMPANY, CONTACT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Student Data Disclosure · ${BRAND}`,
  description: `What student and family information ${BRAND} collects, why, who it is shared with, and how it is protected and deleted.`,
};

// Plain-language disclosure for schools and districts (e.g. Colorado's Student Data Transparency and
// Security Act, C.R.S. 22-16-108). Keep it in step with supabase/schema.sql and the Privacy Policy.
const UPDATED = "November 5, 2026";

const ELEMENTS = [
  {
    data: "Parent or guardian name",
    why: "So teachers know who they are texting.",
    from: "The school (Parents list or upload), or the parent when signing up",
  },
  {
    data: "Student name(s)",
    why: "So teachers know which child a conversation is about.",
    from: "The school, or the parent when signing up",
  },
  {
    data: "Parent mobile phone number",
    why: "To deliver texts to the parent and match their replies to the right conversation.",
    from: "The school, or the parent when signing up",
  },
  {
    data: "Preferred language",
    why: "To translate messages into the family’s language.",
    from: "The school, or the parent when signing up",
  },
  {
    data: "School",
    why: "So only staff at the student’s school can see the family.",
    from: "The school",
  },
  {
    data: "Text messages, in English and in the family’s language",
    why: "To carry the conversation and show staff exactly what the parent received and replied.",
    from: "Teachers and parents, as they text",
  },
  {
    data: "Delivery status and timestamps",
    why: "To show whether a text arrived, and to troubleshoot delivery problems.",
    from: "Created by the service",
  },
  {
    data: "Texting consent and opt-out (STOP) status",
    why: "To text only families who agreed, and to honor opt-outs. We record when consent was given, how, and which administrator confirmed it.",
    from: "The school, the parent, or the parent’s STOP / START reply",
  },
  {
    data: "Message topic and tone counts",
    why: "To show administrators overall trends (for example, how many replies are about attendance). Worked out from message text by simple word rules when the dashboard loads; not stored, and not used to profile anyone.",
    from: "Created by the service",
  },
];

const PROVIDERS = [
  {
    name: "Twilio",
    role: "Text-message delivery",
    data: "Parent phone numbers and the text of messages sent and received",
  },
  {
    name: "Google Cloud Translation",
    role: "Translating message text",
    data: "The text of each message only (no names attached by us, and no phone numbers)",
  },
  {
    name: "Supabase",
    role: "Database and staff sign-in",
    data: "All of the information listed above, and staff account details",
  },
  {
    name: "Vercel",
    role: "Hosting for the Relay website and app",
    data: "Information passes through while staff use the app; it is stored in the database, not by the host",
  },
];

export default function StudentData() {
  return (
    <LegalPage title="Student Data Disclosure" updated={false}>
      <p className="legal-updated">Last updated {UPDATED}</p>

      <p>
        This page explains, in plain language, what information about students and families {BRAND} collects, why we
        collect it, how we use and share it, and how it is protected and deleted. It is written for parents, school
        staff and district reviewers, and supports schools’ obligations under laws such as the Family Educational Rights
        and Privacy Act (FERPA) and Colorado’s Student Data Transparency and Security Act (C.R.S. 22-16-101 et seq.).
      </p>

      <h2>At a glance</h2>
      <ul>
        <li>
          {BRAND} is two-way texting between teachers and parents, with translation. Its only purpose is
          communication between school and home.
        </li>
        <li>
          We collect the minimum needed for that: parent name, phone number and language, student name(s), and the
          messages themselves.
        </li>
        <li>
          We do <strong>not</strong> collect grades, attendance, test scores, disability, health, discipline or other
          student records, and we don’t connect to student information systems.
        </li>
        <li>
          We never sell student or family information, never use it for advertising, and never use it to build
          profiles of students.
        </li>
        <li>The school controls its data. We delete it when the school asks or when its contract ends.</li>
      </ul>

      <h2>Information we collect, and why</h2>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <thead>
            <tr>
              <th>Information</th>
              <th>Why we collect it</th>
              <th>Where it comes from</th>
            </tr>
          </thead>
          <tbody>
            {ELEMENTS.map((e) => (
              <tr key={e.data}>
                <td>
                  <strong>{e.data}</strong>
                </td>
                <td>{e.why}</td>
                <td>{e.from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        For school staff, we also keep each person’s name, work email, school, role and last sign-in, so they can sign in
        and administrators can manage accounts.
      </p>
      <p>
        Students don’t use {BRAND}. Texts go to parents and guardians, and we don’t collect information directly from
        children.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To send and receive texts between school staff and families, translated into each family’s language.</li>
        <li>To record consent and honor opt-out requests.</li>
        <li>To show school administrators totals about their own school’s outreach, such as how many families were contacted.</li>
        <li>To keep the service secure, working and supported.</li>
      </ul>
      <p>
        We use student and family information only for these purposes and only as our agreement with the school allows. If
        we ever needed to use it another way, we would first get permission as the law requires.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We share information only with the service providers below, only as needed to run {BRAND}, and under agreements
        that limit their use of it to providing services to us. We don’t share it with anyone else, except where the
        law requires it or to protect the safety of a student, family or staff member.
      </p>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>What it does for us</th>
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
      <p>We will let contracted schools know before we add or change a provider that handles student or family information.</p>

      <h2>Who at the school can see it</h2>
      <ul>
        <li>Teachers see the families on their own school’s Parents list and their own conversations.</li>
        <li>
          School administrators see their own school’s Parents list, teachers and dashboard. This is enforced by our servers,
          not just hidden on screen.
        </li>
        <li>Only administrators can add, change or delete families on the Parents list.</li>
        <li>Parents see only their own texts, on their own phone.</li>
      </ul>

      <h2>How we protect it</h2>
      <ul>
        <li>All information is encrypted in transit (HTTPS), and the database is encrypted at rest.</li>
        <li>Staff must sign in, and access is limited by role and school.</li>
        <li>Texts go out from a {BRAND} number, so teachers’ personal cell numbers are never shared.</li>
        <li>Service passwords and keys are stored only on our servers, never in the app people use.</li>
        <li>Within our team, only the people who run and support {BRAND} can access its data, and only when needed.</li>
      </ul>

      <h2>Correcting information</h2>
      <p>
        School administrators can correct a family’s details at any time on the Parents list, and the change carries
        into existing conversations. Parents can ask their child’s school to correct their information. We will also help
        any contracted school or district find and correct information on request: email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Keeping and deleting it</h2>
      <ul>
        <li>
          Text messages are deleted automatically after 2 years, or after the period set in the school’s or district’s contract.
          Parent details stay on the Parents list while the school uses {BRAND}.
        </li>
        <li>
          If a parent replied STOP, we keep only their phone number and the opt-out, so they are never texted again.
        </li>
        <li>
          When a school or district asks, or its contract ends, we securely delete its student and family information
          within 30 days, unless its contract says otherwise, and confirm in writing.
        </li>
        <li>
          Backup copies kept by our database provider and delivery logs kept by our texting provider are removed on those
          providers’ own schedules; they are not used for anything else in the meantime.
        </li>
        <li>A parent can reply STOP at any time to stop receiving texts.</li>
      </ul>

      <h2>If something goes wrong</h2>
      <p>
        If student or family information is accessed or disclosed without authorization, we will notify the affected
        school or district without unreasonable delay. We will explain what happened, what information was involved and
        what we are doing about it, and we will cooperate with the school’s response.
      </p>

      <h2>Changes to this page</h2>
      <p>
        We will tell contracted schools and districts about any material change to how we collect, use or share student
        information before it takes effect, and update the date at the top of this page.
      </p>

      <h2>Contact</h2>
      <p>
        {COMPANY}, operator of {BRAND}. Questions, contract requests, or a data privacy agreement for your district:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our <a href="/privacy">Privacy Policy</a> and <a href="/trust">Trust Center</a>.
      </p>
    </LegalPage>
  );
}
