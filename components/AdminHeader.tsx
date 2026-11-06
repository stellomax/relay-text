"use client";

import { useEffect, useState } from "react";
import MainMenu, { type Me } from "./MainMenu";
import { api } from "@/lib/client";
import SchoolOptions from "@/components/SchoolOptions";

const KEY = "relay.dashSchool";

// The school an admin is looking at, shared by the dashboard, Manage Teachers and Manage Parents.
// "all" = every school; otherwise a school id. Remembered in this browser.
export function savedSchool(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function saveSchool(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

export function useSavedSchool(fallback: () => string | null) {
  const [school, setSchool] = useState<string | null>(null);
  useEffect(() => {
    setSchool(savedSchool() || fallback() || "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pick = (id: string) => {
    saveSchool(id);
    setSchool(id);
  };
  return [school, pick] as const;
}

// Top bar for admin pages: logo on the left, avatar menu on the right, lined up with the page content below.
export default function AdminHeader({ narrow = false }: { narrow?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api<{ me: Me }>("/api/me")
      .then((d) => {
        if (d.me.role !== "admin") window.location.href = "/inbox";
        setMe(d.me);
      })
      .catch(() => {});
  }, []);

  return (
    <header className={`home-bar admin-bar ${narrow ? "narrow" : ""}`}>
      <a href="/admin" aria-label="Home">
        <img className="inbox-logo" src="/relay-text-logo.png" alt="Relay" />
      </a>
      <span className="home-bar-right">
        <MainMenu me={me} />
      </span>
    </header>
  );
}

// The district whose schools these are, when they all share one (an admin's own district).
export function districtOf(schools?: { district?: string | null }[]): string | null {
  const names = new Set((schools || []).map((s) => (s.district || "").trim()).filter(Boolean));
  return names.size === 1 ? [...names][0] : null;
}

// Which school is shown. Sits at the right of the page title.
// Admins oversee a school district: its name sits on top and the dropdown lists the district's schools.
// Super admins with several districts get every school, grouped by district.
export function SchoolPicker({
  schools,
  school,
  onSchool,
  district,
}: {
  schools?: { id: string; name: string; district?: string | null }[];
  school?: string | null;
  onSchool: (id: string) => void;
  district?: string | null;
}) {
  if (!schools || !schools.length) return null;
  const name = (district || "").trim() || districtOf(schools);
  const head = name ? (
    <>
      <span>District</span>
      <strong className="title-district">{name}</strong>
    </>
  ) : (
    <span>School</span>
  );
  if (schools.length <= 1) return name ? <div className="title-picker">{head}</div> : null;
  return (
    <label className="title-picker">
      {head}
      <select className="admin-select" value={school || "all"} onChange={(e) => onSchool(e.target.value)} aria-label="School">
        <option value="all">{name ? "All schools in the district" : "All schools"}</option>
        <SchoolOptions schools={schools} />
      </select>
    </label>
  );
}

// Big page title under the bar, like "Hi, Dave" on the dashboard; the school picker sits on the right.
export function AdminTitle({
  title,
  picker,
  sub,
  back = true,
}: {
  title: string;
  picker?: React.ReactNode;
  sub?: string;
  back?: boolean;
}) {
  return (
    <div className="dash-head title-row">
      <div className="title-main">
        <h1 className="home-title">{title}</h1>
        {sub && <p className="home-sub">{sub}</p>}
        {back && (
          <a className="title-back" href="/admin">
            ‹ Back to Dashboard
          </a>
        )}
      </div>
      {picker}
    </div>
  );
}
