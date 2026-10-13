"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";

const NAV = [
  { href: "/", label: "Inbox" },
  { href: "/broadcast", label: "Broadcast" },
  { href: "/contacts", label: "Families" },
  { href: "/lists", label: "Lists" },
  { href: "/setup", label: "Setup" },
];

export default function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const path = usePathname();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 64 64" width="28" height="28">
              <rect width="64" height="64" rx="14" fill="currentColor" />
              <path d="M14 20a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H26l-8 6v-6a6 6 0 0 1-4-6z" fill="#f7f3ea" />
              <path d="M50 30v10a6 6 0 0 1-4 6v6l-8-6H30" fill="none" stroke="#f2b84b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
          Text Connect
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button className="link-btn" onClick={logout}>
          Sign out
        </button>
      </header>
      <main className={wide ? "main wide" : "main"}>{children}</main>
    </div>
  );
}
