"use client";

import { useCallback, useEffect, useState } from "react";
import { type Me } from "@/components/MainMenu";
import AdminHeader, { SchoolPicker, savedSchool, saveSchool } from "@/components/AdminHeader";
import { Book, ChevronRight, Compose, PersonAdd } from "@/components/icons";
import { api } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { listTime } from "@/lib/format";

type Week = { start: string; sent: number; replies: number };
type Rates = { contacted: number; engaged: number; teachers: number };
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
    list: { id: string; name: string; role: string; texts30: number; received30?: number; parentsTotal?: number; parents30: number; last_seen_at: string | null }[];
  };
  messages: { sent30: number; replies30: number; weeks: Week[]; days?: Week[] };
  rates?: { current: Rates; previous: Rates | null };
  topics?: { messages: number; list: { key: string; label: string; count: number }[]; tone: { positive: number; neutral: number; concern: number } };
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
            <p className="home-sub">{s ? s.school?.name || "All schools" : " "}</p>
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
          <a className="dash-btn primary" href="/inbox?compose=1">
            <Compose size={20} />
            Send a Message
          </a>
          <a className="dash-btn" href="/admin/teachers">
            <PersonAdd size={20} />
            Manage Teachers
            {s && s.teachers.pending > 0 && <span className="dash-btn-badge">{s.teachers.pending} waiting</span>}
          </a>
          <a className="dash-btn" href="/admin/parents">
            <Book size={20} />
            Manage Parents
          </a>
        </div>

        {s && p && (
          <>
            {/* Headline numbers */}
            <div className="kpis">
              <a className="kpi" href="/admin/parents">
                <span className="kpi-label">Total Parents</span>
                <span className="kpi-value">{fmt(p.total)}</span>
                {p.total ? (
                  <>
                    <span className="kpi-sub">{fmt(p.canText)} have given consent to text</span>
                  </>
                ) : (
                  <span className="kpi-sub">Upload your list to start</span>
                )}
              </a>
              <RateCard
                href="/admin/parents"
                label="Parent Outreach"
                n={s.rates?.current.contacted ?? p.reached30}
                prev={s.rates?.previous?.contacted}
                of={p.total}
                sub="contacted"
                empty="Upload your list to start"
              />
              <RateCard
                href="/inbox"
                label="Parent Engagement"
                n={s.rates?.current.engaged ?? 0}
                prev={s.rates?.previous?.engaged}
                of={s.rates?.current.contacted ?? 0}
                prevOf={s.rates?.previous?.contacted}
                sub="parents responded"
                empty="No parents contacted yet"
              />
              <RateCard
                href="/admin/teachers"
                label="Teacher Involvement"
                n={s.rates?.current.teachers ?? s.teachers.texting30}
                prev={s.rates?.previous?.teachers}
                of={s.teachers.total}
                sub="sent at least one text"
                empty="Add teachers to start"
              />
            </div>
            <p className="kpi-note">Percentages cover the last 30 days, compared with the 30 days before.</p>

            <div className="dash-grid">
              <section className="panel wide">
                <MessagesPanel s={s} />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Languages families speak</h2>
                </div>
                <Languages langs={s.languages} total={p.total} />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Conversation Analysis</h2>
                  <a className="panel-link" href="/inbox">
                    Open
                  </a>
                </div>
                <Topics t={s.topics} />
              </section>

              <section className="panel wide">
                <div className="panel-head">
                  <h2>Teachers</h2>
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

type Bucket = { key: string; label: string; long: string; sent: number; replies: number };
const RANGES = [7, 30, 60] as const;
const VIEWS = [
  { id: "day", label: "Daily", noun: "day" },
  { id: "week", label: "Weekly", noun: "week" },
  { id: "month", label: "Monthly", noun: "month" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

// The server sends one entry per Mountain Time day; `start` is that day's midnight.
// Shift by 7 hours and read UTC fields to get the calendar date.
const dayDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600000);
const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function bucketize(days: Week[], range: number, view: ViewId): Bucket[] {
  const picked = days.slice(-range);
  if (view === "day") {
    return picked.map((w) => {
      const d = dayDate(w.start);
      return { key: w.start, label: md(d), long: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }), sent: w.sent, replies: w.replies };
    });
  }
  const out: (Bucket & { first: Date; last: Date })[] = [];
  for (const w of picked) {
    const d = dayDate(w.start);
    let key: string;
    let label: string;
    if (view === "week") {
      const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
      key = monday.toISOString().slice(0, 10);
      label = md(monday);
    } else {
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      label = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    }
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.sent += w.sent;
      last.replies += w.replies;
      last.last = d;
    } else {
      out.push({ key, label, long: "", sent: w.sent, replies: w.replies, first: d, last: d });
    }
  }
  return out.map(({ first, last, ...b }) => ({
    ...b,
    long:
      view === "month"
        ? `${first.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} (${md(first)}${first.getTime() === last.getTime() ? "" : ` – ${md(last)}`})`
        : `${md(first)}${first.getTime() === last.getTime() ? "" : ` – ${md(last)}`}`,
  }));
}

function MessagesPanel({ s }: { s: Summary }) {
  const [range, setRange] = useState<number>(60);
  const [view, setView] = useState<ViewId>("day");
  const days = s.messages.days;
  const noun = VIEWS.find((v) => v.id === view)!.noun;
  const buckets: Bucket[] = days
    ? bucketize(days, range, view)
    : s.messages.weeks.map((w) => ({ key: w.start, label: md(dayDate(w.start)), long: `Week of ${md(dayDate(w.start))}`, sent: w.sent, replies: w.replies }));
  return (
    <>
      <div className="panel-head">
        <h2>Messages each {days ? noun : "week"}</h2>
        {days && (
          <span className="chart-controls">
            <select className="admin-select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range">
              {RANGES.map((r) => (
                <option key={r} value={r}>
                  Last {r} days
                </option>
              ))}
            </select>
            <select className="admin-select" value={view} onChange={(e) => setView(e.target.value as ViewId)} aria-label="Show by">
              {VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
      <span className="legend chart-legend">
        <span className="key">
          <i className="sw sent" /> Sent by teachers
        </span>
        <span className="key">
          <i className="sw replies" /> Replies from parents
        </span>
      </span>
      <WeekChart buckets={buckets} noun={days ? noun : "week"} />
    </>
  );
}

// Parents whose language isn't English, i.e. who need texts translated
function needTranslation(langs: { code: string; count: number }[]) {
  return langs.filter((l) => l.code !== "en" && !l.code.startsWith("en-")).reduce((a, l) => a + l.count, 0);
}

function otherLangs(langs: { code: string; count: number }[]) {
  return langs.filter((l) => l.code !== "en" && !l.code.startsWith("en-")).length;
}

// A headline rate: big percentage, "N out of M …", and an arrow comparing with the previous 30 days.
function RateCard({ href, label, n, prev, of, prevOf, sub, empty }: { href: string; label: string; n: number; prev?: number; of: number; prevOf?: number; sub: string; empty: string }) {
  const now = of ? Math.round((n / of) * 100) : 0;
  const base = prevOf ?? of; // the earlier period's own total when it has one
  const before = prev !== undefined && base ? Math.round((prev / base) * 100) : null;
  const diff = before === null ? null : now - before;
  return (
    <a className="kpi" href={href}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">
        {of ? `${now}%` : "–"}
        {diff !== null && of > 0 && (
          <span className={`kpi-trend ${diff > 0 ? "up" : diff < 0 ? "down" : "flat"}`} title={`${before}% in the 30 days before`}>
            {diff > 0 ? "▲" : diff < 0 ? "▼" : "–"} {diff === 0 ? "no change" : `${Math.abs(diff)} pts`}
          </span>
        )}
      </span>
      <span className="kpi-sub">{of ? `${fmt(n)} out of ${fmt(of)} ${sub}` : empty}</span>
    </a>
  );
}

// Grouped columns: sent and replies for each of the last 60 days (or 8 weeks), with a hover tooltip.
function WeekChart({ buckets: weeks, noun }: { buckets: Bucket[]; noun: string }) {
  const daily = weeks.length > 14;
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.flatMap((w) => [w.sent, w.replies]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
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
                key={w.key}
                className={`wk-col ${hover === i ? "on" : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${w.long}: ${w.sent} sent, ${w.replies} replies`}
              >
                <span className="wk-bar sent" style={{ height: `${(w.sent / top) * 100}%` }} />
                <span className="wk-bar replies" style={{ height: `${(w.replies / top) * 100}%` }} />
                {hover === i && (
                  <span className="tip">
                    <strong>{w.long}</strong>
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
          {empty && <p className="wk-empty">No texts yet. Once teachers start texting, each {noun} shows here.</p>}
        </div>
      </div>
      <div className="wk-x">
        {weeks.map((w, i) => (
          <span key={w.key}>{weeks.length <= 10 || (weeks.length - 1 - i) % 7 === 0 ? w.label : ""}</span>
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

// Pie of the languages parents speak (English left out): up to 10 languages, each its own color
// (fixed order; adjacent pairs, including last-to-first, pass the palette validator). The list beside it names each one.
const PIE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948", "#8f4f9e", "#7a7a2a"];
const PIE_OTHER = "#c4c1ca";

function slicePath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
}

function Languages({ langs, total }: { langs: { code: string; count: number }[]; total: number }) {
  const [hi, setHi] = useState<number | null>(null);
  // English speakers don't need translation, so they're left out of the chart.
  const isEn = (code: string) => code === "en" || code.startsWith("en-");
  const english = langs.filter((l) => isEn(l.code)).reduce((a, l) => a + l.count, 0);
  const others = langs.filter((l) => !isEn(l.code));
  if (!total || !others.length)
    return <p className="panel-empty">{total ? "Every parent on the list speaks English." : "Languages appear here once parents are on the list."}</p>;
  const sum = others.reduce((a, l) => a + l.count, 0);
  // The top 7 languages, each with its own color; any others share one gray "Other languages" slice.
  const MAX = 7;
  const shown = others.slice(0, MAX);
  const rest = others.slice(shown.length);
  const rows = [
    ...shown.map((l, i) => ({ key: l.code, name: languageName(l.code), count: l.count, color: PIE_COLORS[i] })),
    ...(rest.length ? [{ key: "_other", name: `Other languages (${rest.length})`, count: rest.reduce((a, l) => a + l.count, 0), color: PIE_OTHER }] : []),
  ];
  let angle = 0;
  const R = 78;
  const C = 82;
  return (
    <div className="lang-pie-wrap">
      <svg className="lang-pie" viewBox="0 0 164 164" role="img" aria-label="Languages parents speak, not counting English">
        {rows.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={rows[0].color} />
        ) : (
          rows.map((sl, i) => {
            const a0 = angle;
            angle += (sl.count / sum) * Math.PI * 2;
            return (
              <path
                key={i}
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
          {rows.map((r, i) => (
            <li
              key={r.key}
              className={hi === i ? "on" : hi !== null ? "dim" : ""}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
            >
              <i style={{ background: r.color }} aria-hidden />
              <span className="lang-n">{r.name}</span>
              <span className="lang-c">{fmt(r.count)}</span>
              <span className="lang-p">{pct(r.count, sum)}%</span>
            </li>
          ))}
        </ul>
        {english > 0 && <p className="panel-foot">Not counting {plural(english, "parent", "parents")} who {english === 1 ? "speaks" : "speak"} English.</p>}
      </div>
    </div>
  );
}

// Topics: share of last-30-day texts about each topic (one topic per text; texts like "Thank you" aren't counted),
// then the tone of parents' replies as one segmented bar.
function Topics({ t }: { t?: Summary["topics"] }) {
  if (!t || !t.messages) return <p className="panel-empty">Once teachers and parents start texting, the main topics show here.</p>;
  const max = Math.max(1, ...t.list.map((x) => x.count));
  const toneTotal = t.tone.positive + t.tone.neutral + t.tone.concern;
  const tones = [
    { key: "positive", label: "Positive", n: t.tone.positive },
    { key: "neutral", label: "Neutral", n: t.tone.neutral },
    { key: "concern", label: "Needs attention", n: t.tone.concern },
  ];
  return (
    <div className="topics">
      <p className="topics-sub">Share of {plural(t.messages, "text", "texts")} about each topic, last 30 days</p>
      <ul className="topic-list">
        {t.list.map((x) => (
          <li key={x.key} title={`${fmt(x.count)} of ${fmt(t.messages)} texts`}>
            <span className="topic-n">{x.label}</span>
            <span className="topic-bar">
              <i style={{ width: `${(x.count / max) * 100}%` }} />
            </span>
            <span className="topic-p">{pct(x.count, t.messages)}%</span>
          </li>
        ))}
      </ul>
      {toneTotal > 0 && (
        <div className="tone">
          <span className="tone-label">Sentiment analysis</span>
          <div className="seg" role="img" aria-label={tones.map((x) => `${x.label}: ${pct(x.n, toneTotal)}%`).join(", ")}>
            {tones.filter((x) => x.n > 0).map((x) => (
              <span key={x.key} className={`seg-part tone-${x.key}`} style={{ flexGrow: x.n }} title={`${x.label}: ${fmt(x.n)}`} />
            ))}
          </div>
          <ul className="tone-keys">
            {tones.map((x) => (
              <li key={x.key}>
                <i className={`sw tone-${x.key}`} /> {x.label} <strong>{pct(x.n, toneTotal)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


function TeacherList({ s }: { s: Summary }) {
  const list = s.teachers.list;
  if (!list.length) return <p className="panel-empty">No teachers yet. Use Manage Teachers to add them.</p>;
  // Sent and received bars share one scale so they can be compared
  const max = Math.max(1, ...list.map((t) => Math.max(t.texts30, t.received30 ?? 0)));
  return (
    <>
      <table className="dash-table teacher-table">
        <colgroup>
          <col style={{ width: "26%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Teacher</th>
            <th className="center">Texts sent</th>
            <th className="center">Texts received</th>
            <th className="center">Total parents</th>
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
                <span className="num-in">
                <span className="mini">
                  {t.texts30 > 0 && <span className="mini-bar" style={{ width: `${(t.texts30 / max) * 100}%` }} />}
                </span>
                <span className="num-v">{fmt(t.texts30)}</span>
                </span>
              </td>
              <td className="num">
                <span className="num-in">
                <span className="mini">
                  {(t.received30 ?? 0) > 0 && <span className="mini-bar replies" style={{ width: `${((t.received30 ?? 0) / max) * 100}%` }} />}
                </span>
                <span className="num-v">{fmt(t.received30 ?? 0)}</span>
                </span>
              </td>
              <td className="center">{fmt(t.parentsTotal ?? t.parents30)}</td>
              <td className="muted">{t.last_seen_at ? listTime(t.last_seen_at) : "Never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="panel-foot">Texts sent and received are for the last 30 days. Total parents counts everyone the teacher has a conversation with.</p>
      {s.teachers.pending > 0 && (
        <a className="health-fix" href="/admin/teachers">
          {plural(s.teachers.pending, "teacher is", "teachers are")} waiting for approval →
        </a>
      )}
    </>
  );
}
