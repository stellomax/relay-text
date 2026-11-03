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
  title: "About Relay",
  description:
    "Relay helps teachers and families talk to each other in their own languages, by plain text message. Here's why we built it and what we believe.",
};

const BELIEFS = [
  {
    title: "Every family, in their language",
    text: "A parent shouldn’t need English, an app or a translator to hear from their child’s teacher, or to answer back.",
  },
  {
    title: "Simple wins",
    text: "Teachers are busy. If it isn’t as easy as sending a text, it won’t get used. So Relay works like the Messages app they already know.",
  },
  {
    title: "Families’ trust comes first",
    text: "We keep only what a conversation needs, and we never sell or share family information for marketing.",
  },
];

export default function AboutPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteNav />

      <main className="lp-about-main">
        <section className="lp-page-hero">
          <p className="lp-eyebrow">About us</p>
          <h1>When families and teachers understand each other, students thrive.</h1>
        </section>

        <section className="lp-about-why lp-about-who" aria-labelledby="who">
          <h2 id="who">Who we are</h2>
          <p>
            We’re a team of teachers, school administrators and developers who care deeply about using technology to connect with
            marginalized families. English language development (ELD) students and their families already work hard to learn a
            new language and a new culture. Making it easier to talk with their child’s school brings all of us closer.
          </p>
        </section>

        <section className="lp-about-why">
          <p>
            In many schools, the families who most need to hear from teachers are the ones messages miss: families who speak a
            language other than English at home, newcomers, and parents juggling long work hours. Newsletters go unread, portals
            go unchecked, and a quick question turns into a phone call nobody has time for.
          </p>
          <p>
            Text messages already reach almost every parent. Relay adds the missing piece, translation in both directions, so a
            teacher and a parent can have a real conversation without sharing a language, downloading an app or exposing a
            personal phone number.
          </p>
        </section>

        <section className="lp-steps-wrap" aria-labelledby="believe">
          <h2 id="believe">What we believe</h2>
          <ul className="lp-steps">
            {BELIEFS.map((b) => (
              <li key={b.title}>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-about-why lp-about-contact">
          <p>
            {BRAND} is a service of {COMPANY}. Have a question, or want to see if Relay fits your school? Write to us at{" "}
            <a href="mailto:relay@stellomark.com">relay@stellomark.com</a>.
          </p>
        </section>

        <section className="lp-final">
          <h2>See it for yourself.</h2>
          <p>Watch a teacher and a parent text in two languages, or ask us about a pilot at your school.</p>
          <div className="lp-ctas center">
            <DemoModal className="lp-btn light lp-hero-demo">See Relay in action</DemoModal>
            <a className="lp-btn outline-light" href="/contact">
              Request a Quote
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
