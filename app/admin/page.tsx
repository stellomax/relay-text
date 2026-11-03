"use client";

import { useCallback, useEffect, useState } from "react";
import { type Me } from "@/components/MainMenu";
import AdminHeader, { SchoolPicker, savedSchool, saveSchool } from "@/components/AdminHeader";
import { Book, ChevronRight, Compose, PersonAdd } from "@/components/icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { listTime } from "@/lib/format";

type Week = { start: string; sent: number; replies: number };
type Summary = {
  name: string;
  isSuper: boolean;
  school: { id: string; name: string } | null;
  schoolId: string;
  schools: { id: string; name: string }[];
  unread: number;
  parentsReady: boolean;
  parents: { total: number; canText: number; needsConsent: number; optedOut: number; reached30: number };
  languages: { code: string; count: number }[];
  teachers: {
    total: number;
    pending: number;
    texting30: number;
    list: { id: string; name: string; role: string; texts30: number; parents30: number; last_seen_at: string | null }[];
  };
  messages: { sent30: number; replies30: number; weeks: Week[]; days?: Week[] };
};

const fmt = (n: number) => n.toLocaleString();
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

// Admin home: the three things an admin does, then how the school is doing at a glance.
export default function AdminDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [s, setS] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback((school?: string) => {
    api<Summary>(`/api/admin/summary${school ? `?school=${encodeURIComponent(school)}` : ""}`)
      .then((d) => {
        setS(d);
        setError("");
        // Remember the school shown, so Manage Teachers and Manage Parents open on the same one.
        if (!savedSchool()) saveSchool(d.schoolId);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    api<{ me: Me }>("/api/me")
      .then((d) => {
        if (d.me.role !== "admin") window.location.href = "/inbox";
        setMe(d.me);
      })
      .catch(() => {});
    load(savedSchool() || undefined);
  }, [load]);

  const first = (s?.name || me?.name || "").split(" ")[0];
  const p = s?.parents;

  return (
    <div className="home">
      <AdminHeader narrow />

      <main className="dash">
        <div className="dash-head title-row">
          <div className="title-main">
            <h1 className="home-title">{first ? `Hi, ${first}` : "Welcome"}</h1>
            <p className="home-sub">{s ? `${s.school?.name || "All schools"} · here’s the last 30 days` : " "}</p>
          </div>
          {s && (
            <SchoolPicker
              schools={s.schools}
              school={s.schoolId}
              onSchool={(id) => {
                saveSchool(id);
                load(id);
              }}
            />
          )}
        </div>
        {error && <p className="sheet-error">{error}</p>}

        {/* The three things an admin does */}
        <div className="dash-actions">
          <a className="home-card primary" href="/inbox?compose=1">
            <span className="home-icon">
              <Compose size={26} />
            </span>
            <span className="home-card-text">
              <span className="home-card-title">Send a Message</span>
              <span className="home-card-desc">To one parent, a group, or everyone</span>
            </span>
            <ChevronRight size={16} className="home-chev" />
          </a>
          <a className="home-card" href="/admin/teachers">
            <span className="home-icon">
              <PersonAdd size={26} />
            </span>
            <span className="home-card-text">
              <span className="home-card-title">Manage Teachers</span>
              <span className="home-card-desc">
                Add, edit or remove
                {s && s.teachers.pending > 0 && <span className="home-badge">{s.teachers.pending} waiting</span>}
              </span>
            </span>
            <ChevronRight size={16} className="home-chev" />
          </a>
          <a className="home-card" href="/admin/parents">
            <span className="home-icon">
              <Book size={26} />
            </span>
            <span className="home-card-text">
              <span className="home-card-title">Manage Parents</span>
              <span className="home-card-desc">Upload a spreadsheet, add or remove</span>
            </span>
            <ChevronRight size={16} className="home-chev" />
          </a>
        </div>

        {s && p && (
          <>
            {/* Headline numbers */}
            <div className="kpis">
              <a className="kpi" href="/admin/parents">
                <span className="kpi-label">Parents on the list</span>
                <span className="kpi-value">{fmt(p.total)}</span>
                <span className="kpi-sub">{p.total ? `${fmt(p.canText)} can be texted` : "Upload your list to start"}</span>
              </a>
              <div className="kpi">
                <span className="kpi-label">Families reached</span>
                <span className="kpi-value">{fmt(p.reached30)}</span>
                <span className="kpi-sub">{p.canText ? `${pct(p.reached30, p.canText)}% of parents who can be texted` : "in the last 30 days"}</span>
              </div>
              <a className="kpi" href="/inbox">
                <span className="kpi-label">Texts sent</span>
                <span className="kpi-value">{fmt(s.messages.sent30)}</span>
                <span className="kpi-sub">
                  {plural(s.messages.replies30, "reply", "replies")} from parents
                  {s.unread > 0 && <span className="home-badge">{s.unread} unread for you</span>}
                </span>
              </a>
              <a className="kpi" href="/admin/teachers">
                <span className="kpi-label">Teachers texting</span>
                <span className="kpi-value">
                  {fmt(s.teachers.texting30)}
                  <span className="kpi-of"> of {fmt(s.teachers.total)}</span>
                </span>
                <span className="kpi-sub">sent at least one text</span>
              </a>
            </div>

            <div className="dash-grid">
              <section className="panel wide">
                <div className="panel-head">
                  <h2>Messages each day</h2>
                  <span className="legend">
                    <span className="key">
                      <i className="sw sent" /> Sent by teachers
                    </span>
                    <span className="key">
                      <i className="sw replies" /> Replies from parents
                    </span>
                  </span>
                </div>
                <WeekChart weeks={s.messages.days || s.messages.weeks} daily={!!s.messages.days} />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Languages families speak</h2>
                </div>
                <Languages langs={s.languages} total={p.total} />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Parents list</h2>
                  <a className="panel-link" href="/admin/parents">
                    Open
                  </a>
                </div>
                <ListHealth p={p} />
              </section>

              <section className="panel wide">
                <div className="panel-head">
                  <h2>Teachers · last 30 days</h2>
                  <a className="panel-link" href="/admin/teachers">
                    Manage
                  </a>
                </div>
                <TeacherList s={s} />
              </section>
            </div>
          </>
        )}
        {!s && !error && <p className="ios-footnote top">Loading…</p>}
      </main>
    </div>
  );
}

// Grouped columns: sent and replies for each of the last 60 days (or 8 weeks), with a hover tooltip.
function WeekChart({ weeks, daily = false }: { weeks: Week[]; daily?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.flatMap((w) => [w.sent, w.replies]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const label = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const longLabel = (iso: string) =>
    daily ? new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : `Week of ${label(iso)}`;
  const empty = weeks.every((w) => !w.sent && !w.replies);
  return (
    <div className={`wk${daily ? " daily" : ""}`}>
      <div className="wk-plot">
        <div className="wk-axis">
          {!empty && ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
              {fmt(t)}
            </span>
          ))}
        </div>
        <div className="wk-area">
          {ticks.map((t) => (
            <i key={t} className="wk-grid" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <div className="wk-cols">
            {weeks.map((w, i) => (
              <div
                key={w.start}
                className={`wk-col ${hover === i ? "on" : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${longLabel(w.start)}: ${w.sent} sent, ${w.replies} replies`}
              >
                <span className="wk-bar sent" style={{ height: `${(w.sent / top) * 100}%` }} />
                <span className="wk-bar replies" style={{ height: `${(w.replies / top) * 100}%` }} />
                {hover === i && (
                  <span className="tip">
                    <strong>{longLabel(w.start)}</strong>
                    <span>
                      <i className="sw sent" /> {fmt(w.sent)} sent
                    </span>
                    <span>
                      <i className="sw replies" /> {fmt(w.replies)} {w.replies === 1 ? "reply" : "replies"}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
          {empty && <p className="wk-empty">No texts yet. Once teachers start texting, each {daily ? "day" : "week"} shows here.</p>}
        </div>
      </div>
      <div className="wk-x">
        {weeks.map((w, i) => (
          <span key={w.start}>{daily ? ((weeks.length - 1 - i) % 7 === 0 ? label(w.start) : "") : i % 2 === 1 || weeks.length <= 6 ? label(w.start) : ""}</span>
        ))}
      </div>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
}

// Pie of the languages parents speak: the top 7 each get a color (fixed order, validated palette),
// every other language folds into one gray slice. The list beside it names every language with its count.
const PIE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"];
const PIE_OTHER = "#c4c1ca";

function slicePath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
}

function Languages({ langs, total }: { langs: { code: string; count: number }[]; total: number }) {
  const [hi, setHi] = useState<number | null>(null);
  if (!total || !langs.length) return <p className="panel-empty">Languages appear here once parents are on the list.</p>;
  const sum = langs.reduce((a, l) => a + l.count, 0);
  const top = langs.slice(0, PIE_COLORS.length);
  const rest = langs.slice(PIE_COLORS.length);
  const restCount = rest.reduce((a, l) => a + l.count, 0);
  const slices = [
    ...top.map((l, i) => ({ name: languageName(l.code), count: l.count, color: PIE_COLORS[i] })),
    ...(restCount ? [{ name: `All other languages (${rest.length})`, count: restCount, color: PIE_OTHER }] : []),
  ];
  const sliceOf = (i: number) => Math.min(i, PIE_COLORS.length); // list row -> slice index
  let angle = 0;
  const R = 78;
  const C = 82;
  return (
    <div className="lang-pie-wrap">
      <svg className="lang-pie" viewBox="0 0 164 164" role="img" aria-label="Languages parents speak">
        {slices.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={slices[0].color} />
        ) : (
          slices.map((sl, i) => {
            const a0 = angle;
            angle += (sl.count / sum) * Math.PI * 2;
            return (
              <path
                key={sl.name}
                d={slicePath(C, C, R, a0, angle)}
                fill={sl.color}
                stroke="#fff"
                strokeWidth={2}
                strokeLinejoin="round"
                opacity={hi === null || hi === i ? 1 : 0.35}
                onMouseEnter={() => setHi(i)}
                onMouseLeave={() => setHi(null)}
              >
                <title>{`${sl.name}: ${fmt(sl.count)} ${sl.count === 1 ? "parent" : "parents"} (${pct(sl.count, sum)}%)`}</title>
              </path>
            );
          })
        )}
      </svg>
      <div className="lang-list-wrap">
        <ul className="lang-list">
          {langs.map((l, i) => {
            const s = sliceOf(i);
            return (
              <li
                key={l.code}
                className={hi === s ? "on" : hi !== null ? "dim" : ""}
                onMouseEnter={() => setHi(s)}
                onMouseLeave={() => setHi(null)}
              >
                <i style={{ background: i < PIE_COLORS.length ? PIE_COLORS[i] : PIE_OTHER }} aria-hidden />
                <span className="lang-n">{languageName(l.code)}</span>
                <span className="lang-c">{fmt(l.count)}</span>
                <span className="lang-p">{pct(l.count, sum)}%</span>
              </li>
            );
          })}
        </ul>
        <p className="panel-foot">{plural(langs.length, "language", "languages")} in all</p>
      </div>
    </div>
  );
}

// One segmented bar: who can be texted, who needs consent, who opted out.
function ListHealth({ p }: { p: Summary["parents"] }) {
  if (!p.total)
    return (
      <div className="panel-empty">
        <p>No parents yet.</p>
        <a className="pill-btn" href="/admin/parents?upload=1">
          Upload a Spreadsheet
        </a>
      </div>
    );
  const segs = [
    { key: "ok", label: "Can be texted", n: p.canText },
    { key: "consent", label: "Need consent", n: p.needsConsent },
    { key: "out", label: "Opted out", n: p.optedOut },
  ].filter((x) => x.n > 0);
  return (
    <div className="health">
      <div className="health-big">
        {pct(p.canText, p.total)}%<span> can be texted</span>
      </div>
      <div className="seg" role="img" aria-label={segs.map((x) => `${x.label}: ${x.n}`).join(", ")}>
        {segs.map((x) => (
          <span key={x.key} className={`seg-part ${x.key}`} style={{ flexGrow: x.n }} title={`${x.label}: ${fmt(x.n)}`} />
        ))}
      </div>
      <ul className="health-keys">
        {[
          { key: "ok", label: "Can be texted", n: p.canText },
          { key: "consent", label: "Need consent", n: p.needsConsent },
          { key: "out", label: "Opted out (replied STOP)", n: p.optedOut },
        ].map((x) => (
          <li key={x.key}>
            <i className={`sw ${x.key}`} /> {x.label}
            <strong>{fmt(x.n)}</strong>
          </li>
        ))}
      </ul>
      {p.needsConsent > 0 && (
        <a className="health-fix" href="/admin/parents?status=consent">
          Confirm consent for {plural(p.needsConsent, "parent", "parents")} →
        </a>
      )}
    </div>
  );
}

function TeacherList({ s }: { s: Summary }) {
  const list = s.teachers.list;
  if (!list.length) return <p className="panel-empty">No teachers yet. Use Manage Teachers to add them.</p>;
  const max = Math.max(1, ...list.map((t) => t.texts30));
  return (
    <>
      <table className="dash-table">
        <thead>
          <tr>
            <th>Teacher</th>
            <th className="num">Texts sent</th>
            <th className="num">Parents texted</th>
            <th>Last signed in</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id}>
              <td>
                {t.name}
                {t.role === "admin" && <span className="tag-admin">Admin</span>}
              </td>
              <td className="num">
                <span className="mini">
                  {t.texts30 > 0 && <span className="mini-bar" style={{ width: `${(t.texts30 / max) * 100}%` }} />}
                </span>
                {fmt(t.texts30)}
              </td>
              <td className="num">{fmt(t.parents30)}</td>
              <td className="muted">{t.last_seen_at ? listTime(t.last_seen_at) : "Never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.teachers.total > list.length && <p className="panel-foot">Top {list.length} of {s.teachers.total} teachers by texts sent.</p>}
      {s.teachers.pending > 0 && (
        <a className="health-fix" href="/admin/teachers">
          {plural(s.teachers.pending, "teacher is", "teachers are")} waiting for approval →
        </a>
      )}
    </>
  );
}
