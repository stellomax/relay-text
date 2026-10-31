import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { BRAND, CONTACT_EMAIL, SITE } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms & Conditions · ${BRAND}` };

export default function Terms() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>
        These Terms &amp; Conditions apply to {BRAND} (“{BRAND},” “we,” “us”), a service that lets schools text parents
        and guardians in their own language, and to the website {SITE}. By signing up for or using {BRAND}, you agree to
        these terms.
      </p>

      <h2>SMS Terms</h2>
      <ol>
        <li>
          <strong>Program.</strong> {BRAND} school messages: text messages from your child’s teachers and school staff
          about your child and school matters, such as attendance, schedules, events, conferences, reminders and replies
          to your questions. Messages are translated into the language you choose, and you may reply in your own
          language.
        </li>
        <li>
          <strong>Signing up.</strong> You opt in by completing the sign-up form at {SITE}/join, or the school text-message
          consent on your school’s enrollment or registration form, and checking the box to agree to receive text
          messages. Consent is not a condition of enrollment or of any purchase.
        </li>
        <li>
          <strong>Message frequency varies</strong>, depending on school activity, typically a few messages per month.
        </li>
        <li>
          <strong>Message and data rates may apply.</strong> Check your mobile plan for details.
        </li>
        <li>
          <strong>Opting out.</strong> Reply <strong>STOP</strong> to any message at any time to stop receiving texts.
          You will receive one message confirming you are unsubscribed, and no further messages will be sent. To start
          again, reply <strong>START</strong>.
        </li>
        <li>
          <strong>Help.</strong> Reply <strong>HELP</strong> to any message, or email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
        <li>
          <strong>Carriers.</strong> Mobile carriers are not liable for delayed or undelivered messages.
        </li>
        <li>
          <strong>Translation.</strong> Messages are machine-translated. Translations may not be perfect; if anything is
          unclear, reply and school staff will clarify.
        </li>
        <li>
          <strong>Privacy.</strong> See our <a href="/privacy">Privacy Policy</a>. We do not sell or share your SMS
          opt-in data or personal information with third parties for marketing purposes.
        </li>
      </ol>

      <h2>Not for emergencies</h2>
      <p>
        {BRAND} is not an emergency service. In an emergency, call 911. For urgent school matters, call your child’s
        school.
      </p>

      <h2>School staff accounts</h2>
      <p>
        School staff may use {BRAND} only to communicate with families who have agreed to receive texts, and only for
        school purposes. Staff must not send marketing or unrelated messages and must honor opt-out requests.
      </p>

      <h2>Service</h2>
      <p>
        We work to keep {BRAND} available and accurate but provide it “as is,” without warranties, to the extent allowed
        by law. We may update these terms; changes will be posted on this page with a new date.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
