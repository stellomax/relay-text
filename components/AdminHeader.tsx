"use client";

import { useEffect, useState } from "react";
import MainMenu, { type Me } from "./MainMenu";
import { api } from "@/lib/client";

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

// Top bar for admin pages: logo on the left, avatar menu on the right.
export default function AdminHeader() {
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
    <header className="home-bar">
      <a href="/admin" aria-label="Home">
        <img className="inbox-logo" src="/relay-text-logo.png" alt="Relay" />
      </a>
      <span className="home-bar-right">
        <MainMenu me={me} />
      </span>
    </header>
  );
}

// Which school is shown. Sits at the right of the page title. Hidden when there's only one school.
export function SchoolPicker({
  schools,
  school,
  onSchool,
}: {
  schools?: { id: string; name: string }[];
  school?: string | null;
  onSchool: (id: string) => void;
}) {
  if (!schools || schools.length <= 1) return null;
  return (
    <label className="title-picker">
      <span>School</span>
      <select className="admin-select" value={school || "all"} onChange={(e) => onSchool(e.target.value)}>
        <option value="all">All schools</option>
        {schools.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
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
