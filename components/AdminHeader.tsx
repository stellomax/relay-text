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

type PickSchool = { id: string; name: string; district?: string | null };
const dname = (s: { district?: string | null }) => (s.district || "").trim();

// The district whose schools these are, when they all share one (an admin's own district).
export function districtOf(schools?: { district?: string | null }[]): string | null {
  const names = new Set((schools || []).map(dname).filter(Boolean));
  return names.size === 1 ? [...names][0] : null;
}

// What's picked, saved as one value shared by the dashboard, Manage Teachers and Manage Parents:
// "all" (every school), "d:<district name>" (every school in a district), "none", or a school id.
export const districtPick = (name: string) => `d:${name}`;
export function pickedDistrict(pick?: string | null): string | null {
  return pick && pick.startsWith("d:") ? pick.slice(2) : null;
}
// The one school picked, or "" when a whole district or every school is shown.
export function pickedSchoolId(pick?: string | null): string {
  return !pick || pick === "all" || pick.startsWith("d:") ? "" : pick;
}
// Is a row with this school shown under the pick?
export function inPick(schoolId: string | null | undefined, pick: string | null | undefined, schools: PickSchool[]): boolean {
  const d = pickedDistrict(pick);
  if (d) {
    const s = schools.find((x) => x.id === schoolId);
    return !!s && dname(s) === d;
  }
  const id = pickedSchoolId(pick);
  if (!id) return true;
  return id === "none" ? !schoolId : schoolId === id;
}
// Words for the pick, for the line under a page title.
export function pickLabel(pick: string | null | undefined, schools: PickSchool[]): string {
  const d = pickedDistrict(pick);
  if (d) return `All schools in ${d}`;
  const id = pickedSchoolId(pick);
  if (id) return schools.find((x) => x.id === id)?.name || "All schools";
  const one = districtOf(schools);
  return one && !hasManyDistricts(schools) ? "All schools in the district" : "All schools";
}
const hasManyDistricts = (schools: PickSchool[]) => new Set(schools.map(dname)).size > 1;

// Which schools are shown. Sits at the right of the page title.
// Super admins get two dropdowns that work together: District (all districts or one), then School
// (all schools in that district, or one). Admins oversee one district: its name sits on top and the
// dropdown lists that district's schools.
export function SchoolPicker({
  schools,
  school,
  onSchool,
  district,
  superAdmin = false,
}: {
  schools?: PickSchool[];
  school?: string | null;
  onSchool: (id: string) => void;
  district?: string | null;
  superAdmin?: boolean;
}) {
  if (!schools || !schools.length) return null;

  if (superAdmin || hasManyDistricts(schools)) {
    const districts = [...new Set(schools.map((s) => dname(s) || "No district"))].sort((a, b) =>
      a === "No district" ? 1 : b === "No district" ? -1 : a.localeCompare(b),
    );
    const pickedId = pickedSchoolId(school);
    const pickedSch = pickedId && pickedId !== "none" ? schools.find((s) => s.id === pickedId) : undefined;
    // The district shown: the one picked, or the picked school's district.
    const cur = pickedDistrict(school) ?? (pickedSch ? dname(pickedSch) || "No district" : "");
    const inCur = schools.filter((s) => !cur || (dname(s) || "No district") === cur).sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="title-pickers">
        <label className="title-picker">
          <span>District</span>
          <select
            className="admin-select"
            value={cur}
            onChange={(e) => onSchool(e.target.value ? districtPick(e.target.value) : "all")}
            aria-label="District"
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="title-picker">
          <span>School</span>
          <select
            className="admin-select"
            value={pickedSch ? pickedSch.id : ""}
            onChange={(e) => onSchool(e.target.value || (cur ? districtPick(cur) : "all"))}
            aria-label="School"
          >
            <option value="">{cur ? "All schools in the district" : "All schools"}</option>
            {cur ? (
              inCur.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            ) : (
              <SchoolOptions schools={schools} />
            )}
          </select>
        </label>
      </div>
    );
  }

  const name = (district || "").trim() || districtOf(schools);
  const head = name ? (
    <>
      <span>District</span>
      <strong className="title-district">{name}</strong>
    </>
  ) : (
    <span>School</span>
  );
  // A district always gets its dropdown, even with one school; without a district, one school needs no picker.
  if (schools.length <= 1 && !name) return null;
  return (
    <label className="title-picker">
      {head}
      <select className="admin-select" value={pickedSchoolId(school) || "all"} onChange={(e) => onSchool(e.target.value)} aria-label="School">
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
