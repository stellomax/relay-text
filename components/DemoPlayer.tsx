"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ---------- the cast ---------- */
const TEACHER = {
  name: "Mrs. Anton",
  role: "6th grade science · Sagewood MS",
  photo: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=320&h=320&q=80&auto=format&fit=crop&crop=faces",
  initials: "MA",
};
const PARENT = {
  name: "Ms. Rivera",
  role: "Sofia's mom",
  photo: "https://images.unsplash.com/photo-1700190828755-2965e99a7604?w=320&h=320&q=80&auto=format&fit=crop&crop=faces",
  initials: "LR",
};

/* ---------- the conversation ---------- */
type Msg = { from: "teacher" | "parent"; en: string; es: string; time: string };

const DISCLOSURE =
  "Enviado por Mrs. Anton, Sagewood MS vía Relay. Reply STOP to opt out or HELP for help. Pueden aplicarse tarifas de mensajes y datos.";

const SCRIPT: Msg[] = [
  {
    from: "teacher",
    time: "3:24 PM",
    en: "Hi Ms. Rivera, this is Mrs. Anton, Sofia's science teacher. Sofia presented her volcano project today and did a wonderful job!",
    es: "Hola, Sra. Rivera, soy la Sra. Anton, la maestra de ciencias de Sofía. ¡Sofía presentó hoy su proyecto del volcán y lo hizo de maravilla!",
  },
  {
    from: "parent",
    time: "3:31 PM",
    es: "¡Qué alegría! Gracias por avisarme. Trabajó muchísimo en ese volcán 😊",
    en: "How wonderful! Thank you for letting me know. She worked so hard on that volcano 😊",
  },
  {
    from: "parent",
    time: "3:32 PM",
    es: "¿Cómo le va en matemáticas? Dice que las fracciones le cuestan.",
    en: "How is she doing in math? She says fractions are hard for her.",
  },
  {
    from: "teacher",
    time: "3:40 PM",
    en: "Fractions are tricky for lots of students! We have free tutoring on Tuesdays at 3:30 in Room 12. Sofia is welcome to come.",
    es: "¡Las fracciones son difíciles para muchos estudiantes! Tenemos tutoría gratuita los martes a las 3:30 en el salón 12. Sofía es bienvenida.",
  },
  {
    from: "parent",
    time: "3:46 PM",
    es: "Perfecto, ahí estará. ¿Puedo recogerla a las 4:30?",
    en: "Perfect, she’ll be there. Can I pick her up at 4:30?",
  },
  {
    from: "teacher",
    time: "3:48 PM",
    en: "Of course! I’ll walk her to the front office at 4:30. See you Tuesday!",
    es: "¡Por supuesto! La acompañaré a la oficina principal a las 4:30. ¡Nos vemos el martes!",
  },
  {
    from: "parent",
    time: "3:49 PM",
    es: "¡Muchas gracias, Sra. Anton! ❤️",
    en: "Thank you so much, Mrs. Anton! ❤️",
  },
];

type Phase = "typing" | "sending" | "done";

/* ---------- small pieces ---------- */
function Avatar({ who, size }: { who: typeof TEACHER; size: number }) {
  const [broken, setBroken] = useState(false);
  return broken ? (
    <span className="dm-av dm-av-fallback" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {who.initials}
    </span>
  ) : (
    <img className="dm-av" src={who.photo} alt={who.name} width={size} height={size} onError={() => setBroken(true)} />
  );
}

function Dots() {
  return (
    <span className="dm-dots" aria-label="Translating">
      <i />
      <i />
      <i />
    </span>
  );
}

/* ---------- the player ---------- */
export default function DemoPlayer() {
  const [idx, setIdx] = useState(0); // how many messages have started
  const [phase, setPhase] = useState<Phase>("done");
  const [typed, setTyped] = useState(0);
  const deskRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const tpRef = useRef<HTMLDivElement>(null);
  const ppRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(0);

  // keep the button exactly halfway between Mrs. Anton and Ms. Rivera (wide screens only)
  useLayoutEffect(() => {
    function place() {
      const tp = tpRef.current, pp = ppRef.current, ctl = ctlRef.current;
      if (!tp || !pp || !ctl) return;
      let next = 0;
      if (window.innerWidth > 900) {
        const a = tp.getBoundingClientRect(), b = pp.getBoundingClientRect(), c = ctl.getBoundingClientRect();
        const home = c.left - (shiftRef.current ?? 0) + c.width / 2; // where the button sits with no shift
        next = Math.round((a.right + b.left) / 2 - home);
      }
      shiftRef.current = next;
      setShift(next);
    }
    place();
    const ro = new ResizeObserver(place);
    [tpRef, ppRef].forEach((r) => r.current && ro.observe(r.current));
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, []);

  const cur = idx > 0 ? SCRIPT[idx - 1] : null;
  const finished = idx === SCRIPT.length && phase === "done";

  // the typing → sending → done sequence for the current message
  useEffect(() => {
    if (!cur || phase === "done") return;
    if (phase === "typing") {
      const text = cur.from === "teacher" ? cur.en : cur.es;
      if (typed >= text.length) {
        const t = setTimeout(() => setPhase("sending"), 350);
        return () => clearTimeout(t);
      }
      const per = Math.max(12, Math.min(32, 1700 / text.length));
      const t = setTimeout(() => setTyped((n) => Math.min(text.length, n + 2)), per * 2);
      return () => clearTimeout(t);
    }
    if (phase === "sending") {
      const t = setTimeout(() => setPhase("done"), 1500);
      return () => clearTimeout(t);
    }
  }, [cur, phase, typed]);

  // keep both threads scrolled to the newest message
  useEffect(() => {
    for (const r of [deskRef, phoneRef]) {
      const el = r.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [idx, phase]);

  function next() {
    if (cur && phase !== "done") {
      setPhase("done"); // skip ahead to the end of this message
      return;
    }
    if (idx < SCRIPT.length) {
      setIdx(idx + 1);
      setTyped(0);
      setPhase("typing");
    }
  }
  function back() {
    if (idx === 0) return;
    setIdx(idx - 1);
    setPhase("done");
  }
  function restart() {
    setIdx(0);
    setPhase("done");
    setTyped(0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "BUTTON" || tag === "A") return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // what each side shows for message i
  function stateOf(i: number): "hidden" | "sender" | "both" {
    if (i < idx - 1) return "both";
    if (i > idx - 1) return "hidden";
    if (phase === "done") return "both";
    if (phase === "sending") return "sender";
    return "hidden";
  }

  const teacherTyping = cur && phase === "typing" && cur.from === "teacher" ? cur.en.slice(0, typed) : "";
  const parentTyping = cur && phase === "typing" && cur.from === "parent" ? cur.es.slice(0, typed) : "";
  const flying = cur && phase === "sending" ? cur.from : null;

  // last message the teacher can see, for the inbox preview
  let lastSeen = "";
  SCRIPT.forEach((m, i) => {
    if (stateOf(i) === "both" || (m.from === "teacher" && stateOf(i) === "sender")) lastSeen = m.en;
  });


  return (
    <div className="dm">
      {/* the two screens */}
      <div className="dm-stage" onClick={next} role="button" tabIndex={-1} aria-label="Play the next message">
        {/* the people, with the button between them */}
        <div className="dm-person tp" ref={tpRef}>
          <Avatar who={TEACHER} size={84} />
          <div>
            <b>{TEACHER.name}</b>
            <span>{TEACHER.role}</span>
          </div>
        </div>
        <div className="dm-ctl" ref={ctlRef} style={{ transform: shift ? `translateX(${shift}px)` : undefined }} onClick={(e) => e.stopPropagation()}>
          {finished ? (
            <>
              <button type="button" className="lp-btn dm-next" onClick={restart}>
                ↺ Watch again
              </button>
              <a className="dm-cta" href="/contact">
                Bring Relay to your school ›
              </a>
            </>
          ) : (
            <button type="button" className="lp-btn dm-next" onClick={next}>
              {idx === 0 ? "Start demo conversation ›" : "Next message ›"}
            </button>
          )}
        </div>
        <div className="dm-person pp" ref={ppRef}>
          <Avatar who={PARENT} size={84} />
          <div>
            <b>{PARENT.name}</b>
            <span>{PARENT.role}</span>
          </div>
        </div>

        {/* teacher's computer */}
        <div className="dm-screen-col">
          <div className="dm-desk">
            <div className="lp-window-bar">
              <i />
              <i />
              <i />
              <span className="dm-url">relaytext.io/messages</span>
            </div>
            <div className="dm-desk-body">
              <aside className="dm-list">
                <img src="/relay-text-logo.png" alt="" className="dm-logo" />
                <div className="dm-row on">
                  <Avatar who={PARENT} size={34} />
                  <div>
                    <b>Lucia Rivera</b>
                    <span>{lastSeen || "Sofia Rivera’s mom"}</span>
                  </div>
                </div>
                {[
                  ["MH", "Maria Hernández", "Yes! We’ll be there at 5."],
                  ["AA", "Amina Abdi", "Thank you, Ayaan will bring it."],
                  ["TN", "Thanh Nguyen", "Picture day is Friday."],
                  ["SA", "Samir Al-Masri", "Can we meet Thursday?"],
                ].map(([i, n, p]) => (
                  <div className="dm-row" key={n}>
                    <span className="dm-av dm-av-fallback" style={{ width: 34, height: 34, fontSize: 12 }}>
                      {i}
                    </span>
                    <div>
                      <b>{n}</b>
                      <span>{p}</span>
                    </div>
                  </div>
                ))}
              </aside>
              <section className="dm-thread">
                <header className="dm-thread-h">
                  <Avatar who={PARENT} size={38} />
                  <div>
                    <b>Lucia Rivera</b>
                    <span>
                      Parent of Sofia Rivera · <span className="dm-chip">Spanish</span>
                    </span>
                  </div>
                </header>
                <div className="dm-msgs" ref={deskRef}>
                  {idx === 0 && <p className="dm-empty">New conversation with Lucia Rivera</p>}
                  {SCRIPT.map((m, i) => {
                    const s = stateOf(i);
                    if (m.from === "teacher") {
                      if (s === "hidden") return null;
                      return (
                        <div className="dm-b dm-b-me dm-in" key={i}>
                          {m.en}
                          <small>{s === "both" ? "Delivered in Spanish ✓" : "Translating to Spanish…"}</small>
                        </div>
                      );
                    }
                    if (s === "hidden") return null;
                    if (s === "sender")
                      return (
                        <div className="dm-b dm-b-them dm-in" key={i}>
                          <Dots />
                        </div>
                      );
                    return (
                      <div className="dm-b dm-b-them dm-in" key={i}>
                        {m.en}
                        <small>Original: {m.es}</small>
                      </div>
                    );
                  })}
                </div>
                <div className={`dm-compose${teacherTyping ? " live" : ""}`}>
                  <span className="dm-compose-box">{teacherTyping || <span className="ph">Write in English…</span>}</span>
                  <span className={`dm-send${teacherTyping && cur && typed >= cur.en.length ? " press" : ""}`}>Send</span>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* the translation bridge */}
        <div className="dm-bridge" aria-hidden>
          <div className="dm-wire" />
          {flying && (
            <div key={idx} className={`dm-pill ${flying === "teacher" ? "to-right" : "to-left"}`}>
              <span className="g">🌐</span>
              {flying === "teacher" ? "English → Español" : "Español → English"}
            </div>
          )}
        </div>

        {/* parent's phone */}
        <div className="dm-screen-col phone">
          <div className="dm-phone">
            <div className="dm-island" />
            <div className="dm-status">
              <b>3:49</b>
              <span>
                <svg viewBox="0 0 18 12" width="17" height="11">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="5" width="3" height="7" rx="1" />
                  <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" />
                </svg>
                <span className="dm-batt">
                  <i />
                </span>
              </span>
            </div>
            <div className="dm-ph-head">
              <span className="dm-back">‹</span>
              <Avatar who={TEACHER} size={46} />
              <span className="dm-ph-name">
                Mrs. Anton (Escuela) <i>›</i>
              </span>
            </div>
            <div className="dm-ph-msgs" ref={phoneRef}>
              <p className="dm-ph-meta">
                Text Message · SMS
                <br />
                Today 3:24 PM
              </p>
              {SCRIPT.map((m, i) => {
                const s = stateOf(i);
                if (m.from === "parent") {
                  if (s === "hidden") return null;
                  return (
                    <div className="dm-sms out dm-in" key={i}>
                      {m.es}
                    </div>
                  );
                }
                if (s === "hidden") return null;
                if (s === "sender")
                  return (
                    <div className="dm-sms in dm-in" key={i}>
                      <Dots />
                    </div>
                  );
                return (
                  <div className="dm-sms in dm-in" key={i}>
                    {m.es}
                    {i === 0 && <span className="dm-disc">{DISCLOSURE}</span>}
                  </div>
                );
              })}
              {(() => {
                const last = [...SCRIPT.keys()].filter((i) => stateOf(i) === "both").pop();
                return last !== undefined && SCRIPT[last].from === "parent" ? <p className="dm-delivered">Delivered</p> : null;
              })()}
            </div>
            <div className="dm-ph-compose">
              <span className="dm-plus">+</span>
              <span className={`dm-ph-box${parentTyping ? " live" : ""}`}>
                {parentTyping || <span className="ph">Text Message</span>}
                {parentTyping && <span className="dm-up">↑</span>}
              </span>
            </div>
            <div className="dm-home" />
          </div>
        </div>
      </div>

    </div>
  );
}
