"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Why it Works", href: "/why-it-works" },
  { label: "Trust Center", href: "/trust" },
  { label: "View Demo", href: "/#demo" },
  { label: "Request a Quote", href: "/contact" },
];

/** The top bar on the public pages. On phones the links fold into a Menu button. */
export default function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", close);
    };
  }, [open]);

  return (
    <header className={`lp-nav${open ? " open" : ""}`}>
      <a href="/" className="lp-logo" aria-label={BRAND}>
        <img src="/relay-text-logo.png" alt="RelayText" />
      </a>
      <button type="button" className="lp-menu-btn" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
        {open ? "Close" : "Menu"}
        <span aria-hidden className="lp-menu-icon">
          <i />
          <i />
          <i />
        </span>
      </button>
      <nav id="site-menu" className="lp-nav-actions" aria-label="Main">
        {LINKS.map((l) => (
          <a key={l.label} className="lp-link" href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a className="lp-btn small" href="/login" onClick={() => setOpen(false)}>
          Teacher Login
        </a>
      </nav>
    </header>
  );
}
