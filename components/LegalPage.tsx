import { BRAND, COMPANY, LAST_UPDATED } from "@/lib/brand";

// Simple, readable layout for the public Privacy Policy, Terms and sign-up pages.
export default function LegalPage({ title, children, updated = true }: { title: string; children: React.ReactNode; updated?: boolean }) {
  return (
    <div className="legal">
      <header className="legal-head">
        <a href="/join" aria-label={BRAND}>
          <img src="/relay-text-logo.png" alt={BRAND} />
        </a>
      </header>
      <main className="legal-body">
        <h1>{title}</h1>
        {updated && <p className="legal-updated">Last updated {LAST_UPDATED}</p>}
        {children}
      </main>
      <footer className="legal-foot">
        <a href="/join">Sign up for texts</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms &amp; Conditions</a>
        <span className="legal-copy">
          {BRAND} is a service of {COMPANY}
        </span>
      </footer>
    </div>
  );
}
