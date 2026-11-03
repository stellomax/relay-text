import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY } from "@/lib/brand";
import SiteNav from "@/components/SiteNav";
import DemoModal from "@/components/DemoModal";
import "../landing.css";
import "../demo/demo.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "Relay for teachers",
  description:
    "Text any parent in their language. Write in English, and Relay translates both ways over plain text messages. No app for parents, and your personal number stays private.",
};

const STEPS = [
  {
    n: "1",
    title: "Sign up with your school code",
    text: "Your school's Relay admin gives you a 5-digit code. Create your account in a minute, with no download.",
  },
  {
    n: "2",
    title: "Pick the parents",
    text: "Your school's parent list is already in Relay. Choose one parent, a few, or one of your groups, like “Period 2”.",
  },
  {
    n: "3",
    title: "Type in English and send",
    text: "Each parent gets a regular text in their own language. Their replies come back to you in English.",
  },
];

const CAN = [
  "Text one parent or a whole class at once",
  "Save groups like “Period 2” or “Soccer team”",
  "Read every reply in English, with the original underneath",
  "Keep your personal cell number private",
  "Use it from your computer or your phone's browser",
  "Parents need no app, account or password",
];

const QUESTIONS = [
  {
    q: "Do I need to learn something new?",
    a: "If you can text, you can use Relay. It looks and works like the Messages app. You write in English, and Relay handles the language in both directions.",
  },
  {
    q: "Will parents see my cell number?",
    a: "No. Texts come from a Relay number, not your phone, so your personal number is never shared.",
  },
  {
    q: "What if a parent replies in another language?",
    a: "Relay detects the language, translates the reply into English for you, and keeps the original right underneath. Replies in English are left as they are.",
  },
  {
    q: "Where do the parents' numbers come from?",
    a: "Your school's administrators keep the parent list up to date, and parents can also join through your personal sign-up link. Relay only texts parents who have agreed to receive messages.",
  },
  {
    q: "Who can see my conversations?",
    a: "You and your school's administrators. Family information is never sold or shared for marketing.",
  },
  {
    q: "What if a parent wants to stop?",
    a: "They reply STOP and Relay stops texting them right away. They can reply START to get messages again.",
  },
];

export default function TeachersPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteNav />

      <main>
        <section className="lp-page-hero">
          <p className="lp-eyebrow">For teachers</p>
          <h1>Text any parent, in their language.</h1>
          <p className="lp-lede">
            You write in English. Each parent reads and replies in their own language, by regular text message. Relay takes care of
            the translation in both directions.
          </p>
          <div className="lp-ctas center">
            <DemoModal className="lp-btn lp-hero-demo">See Relay in action</DemoModal>
            <a className="lp-btn outline" href="/signup">
              Sign up with your school code
            </a>
          </div>
        </section>

        <section className="lp-steps-wrap" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="lp-step-n" aria-hidden>
                  {s.n}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-can" aria-labelledby="can">
          <h2 id="can">What you can do with Relay</h2>
          <ul className="lp-checks lp-can-list">
            {CAN.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="lp-faq" aria-labelledby="faq">
          <h2 id="faq">Teacher questions</h2>
          <dl>
            {QUESTIONS.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="lp-final">
          <h2>Want Relay at your school?</h2>
          <p>Share this page with your principal, or ask us for a quote. Already have a code from your school? Sign up today.</p>
          <div className="lp-ctas center">
            <a className="lp-btn light" href="/contact">
              Request a Quote
            </a>
            <a className="lp-btn outline-light" href="/signup">
              Teacher sign up
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <span>
          {BRAND} is a service of {COMPANY}.
        </span>
        <nav aria-label="Footer">
          <a href="/join">Parents: sign up for texts</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </nav>
      </footer>
    </div>
  );
}
