import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY_DISPLAY } from "@/lib/brand";
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
    title: "Simplicity wins",
    text: "Teachers are busy. If it isn’t as easy as sending a text, it won’t get used. So Relay works like the Messages app they already know.",
  },
  {
    title: "Build trust first, success will follow",
    text: "We keep only what a conversation needs, and we never sell or share family information for marketing.",
  },
];

// Sample names and titles with placeholder photos (public/team-1..4.jpg); replace with the real team.
const TEAM = [
  { name: "Daniel Brooks", title: "Co-founder · Former Middle School Principal", photo: "/team-1.jpg" },
  { name: "Elena Morales", title: "ELD Teacher · Curriculum Lead", photo: "/team-2b.jpg" },
  { name: "Julie Hansen", title: "Family Engagement Coordinator", photo: "/team-3.jpg" },
  { name: "Michelle Carter", title: "Lead Developer", photo: "/team-4.jpg" },
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

        <section className="lp-about-why lp-about-who">
          <p>Our team passionately believes this statement. In fact, it’s why we built {BRAND} in the first place.</p>
          <p>
            We’re a team of teachers, school administrators, developers and (above all) parents who care deeply about removing
            barriers that hinder teacher/family partnership. Our lives are surrounded by technology; why not take what we’re
            already using to connect with marginalized families?
          </p>
          <p>
            And that’s exactly what we see. The truth is, English language development (ELD) students and their families already
            work hard to learn a new language and a new culture. Making it easier to communicate with their child’s school brings
            all of us closer, and opens the door for their child to flourish.
          </p>
        </section>

        <section className="lp-team-wrap" aria-labelledby="who">
          <h2 id="who">Who We Are</h2>
          <ul className="lp-team">
            {TEAM.map((t) => (
              <li key={t.name}>
                <img className="team-avatar" src={t.photo} alt={t.name} width={148} height={148} loading="lazy" />
                <b>{t.name}</b>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
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
          <h2 id="believe">Our Core Values</h2>
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
            {BRAND} is a service of {COMPANY_DISPLAY}. Have a question, or want to see if Relay fits your school? Write to us at{" "}
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
          {BRAND} is a service of {COMPANY_DISPLAY}.
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
