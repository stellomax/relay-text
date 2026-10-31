import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { BRAND, COMPANY, CONTACT_EMAIL, SITE } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy Policy · ${BRAND}` };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains how {BRAND}, a service of {COMPANY} (“{BRAND},” “we,” “us”), collects, uses and protects information when
        schools use {BRAND} to send text messages to parents and guardians, and when parents and guardians sign up at{" "}
        {SITE}.
      </p>

      <h2>What {BRAND} does</h2>
      <p>
        {BRAND} lets teachers and school staff text parents and guardians in the family’s own language. Staff write in
        English; the parent receives a regular text message translated into their preferred language, and replies are
        translated back into English for school staff.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Parent or guardian name and mobile phone number.</li>
        <li>Student name (optional), so staff know which family they are texting.</li>
        <li>Preferred language for text messages.</li>
        <li>
          The content of text messages sent and received through {BRAND}, in English and in the translated language,
          with delivery status and timestamps.
        </li>
        <li>Your consent to receive text messages, including when and how it was given, and any opt-out (STOP) request.</li>
        <li>For school staff accounts: name, email address and sign-in information.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To send and receive text messages between school staff and families.</li>
        <li>To translate messages between English and the family’s preferred language.</li>
        <li>To honor opt-out requests and keep a record of consent.</li>
        <li>To operate, secure, troubleshoot and improve the service.</li>
      </ul>

      <h2>SMS opt-in data</h2>
      <p>
        <strong>
          We do not sell or share your SMS opt-in data or personal information with third parties for marketing
          purposes.
        </strong>{" "}
        Mobile phone numbers and SMS consent collected by {BRAND} are used only to deliver the school messages you signed
        up for and are never shared with or sold to third parties or affiliates for marketing or promotional purposes.
      </p>

      <h2>Service providers</h2>
      <p>
        We share information only with service providers that help us run {BRAND}, under agreements that limit their use
        of it to providing services to us: a text-messaging provider (to deliver messages to your phone), a translation
        provider (to translate message text), and cloud hosting and database providers. They may not use your
        information for their own marketing.
      </p>
      <p>We may also disclose information if required by law, or to protect the safety of students, families or staff.</p>

      <h2>Student information</h2>
      <p>
        When {BRAND} is used by a school, information about students and families is handled on the school’s behalf and
        in support of the school’s educational purposes, consistent with the Family Educational Rights and Privacy Act
        (FERPA) and applicable state student-privacy laws. {BRAND} does not use student or family information for
        advertising.
      </p>

      <h2>Retention and security</h2>
      <p>
        We keep message history and contact details while the school uses {BRAND} or until deletion is requested.
        Information is encrypted in transit, stored with restricted access, and available only to authorized school staff
        who sign in.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Reply STOP to any message to stop receiving texts. Reply START to receive them again.</li>
        <li>Reply HELP for help.</li>
        <li>
          To see, correct or delete your information, contact your child’s school or email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        {BRAND} text messages are sent to parents and guardians, not to children. We do not knowingly collect phone
        numbers from children under 13.
      </p>

      <h2>Changes</h2>
      <p>We will post any changes to this policy on this page and update the date above.</p>

      <h2>Contact</h2>
      <p>
        {COMPANY}, operator of {BRAND}. Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
