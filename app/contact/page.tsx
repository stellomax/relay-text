import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY_DISPLAY } from "@/lib/brand";
import ContactForm from "@/components/ContactForm";
import SiteNav from "@/components/SiteNav";
import "../landing.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "Bring Relay to your school",
  description: "Tell us about your school or district. We'll set up a demo and pilot pricing for Relay, two-way texting with built-in translation.",
};

export default function ContactPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteNav />

      <main className="ct">
        <section className="ct-pitch">
          <h1>Bring Relay to your school</h1>
          <p className="lp-lede">
            Tell us a little about your school or district, and we’ll get back to you within one business day to set up a short demo and
            pilot pricing.
          </p>
          <ul className="lp-hero-checks">
            <li>A 20-minute demo for you and your team</li>
            <li>Pilot pricing for one school or a whole district</li>
            <li>Help loading your parent list and inviting teachers</li>
            <li>Up and running in days, with no IT project</li>
          </ul>
          <p className="ct-alt">
            Prefer email? Write to <a href="mailto:relay@stellomark.com">relay@stellomark.com</a>.
          </p>
        </section>
        <ContactForm />
      </main>

      <footer className="lp-foot">
        <span>
          {BRAND} is a service of {COMPANY_DISPLAY}.
        </span>
        <nav aria-label="Footer">
          <a href="/join">Parents: sign up for texts</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/student-data">Student Data</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </nav>
      </footer>
    </div>
  );
}
