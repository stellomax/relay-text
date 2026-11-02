import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY } from "@/lib/brand";
import DemoPlayer from "@/components/DemoPlayer";
import "../landing.css";
import "./demo.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "See Relay in action",
  description:
    "Click through a real conversation: a teacher writes in English, a parent reads and replies in Spanish, and Relay translates both ways over plain text messages.",
};

export default function DemoPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <header className="lp-nav">
        <a href="/" className="lp-logo" aria-label={BRAND}>
          <img src="/relay-text-logo.png" alt="RelayText" />
        </a>
        <nav className="lp-nav-actions" aria-label="Account">
          <a className="lp-link" href="/login">
            Teacher Login
          </a>
          <a className="lp-btn small" href="/contact">
            <span className="dm-wide">Bring Relay to your school</span>
            <span className="dm-narrow">Contact us</span>
          </a>
        </nav>
      </header>

      <main className="dm-page">
        <div className="dm-intro">
          <h1>See Relay in action</h1>
          <p className="lp-lede">
            A teacher and a parent who don’t share a language. Click through their conversation, one text at a time.
          </p>
        </div>
        <DemoPlayer />
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
