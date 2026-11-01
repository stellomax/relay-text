import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { BRAND, COMPANY } from "@/lib/brand";
import "./landing.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "RelayText · Text every family in their own language",
  description:
    "Teachers write in English. Families get a regular text in their own language and reply the same way. No app to download.",
};

const HELLOS = [
  { t: "Hola", l: "Spanish" },
  { t: "مرحبا", l: "Arabic", rtl: true },
  { t: "Xin chào", l: "Vietnamese" },
  { t: "Salaan", l: "Somali" },
  { t: "你好", l: "Chinese" },
  { t: "မင်္ဂလာပါ", l: "Burmese" },
  { t: "سلام", l: "Dari", rtl: true },
  { t: "Привіт", l: "Ukrainian" },
  { t: "Bonjour", l: "French" },
  { t: "Bonjou", l: "Haitian Creole" },
  { t: "Olá", l: "Portuguese" },
  { t: "Jambo", l: "Swahili" },
  { t: "ሰላም", l: "Amharic" },
  { t: "नमस्ते", l: "Nepali" },
  { t: "Nyob zoo", l: "Hmong" },
  { t: "안녕하세요", l: "Korean" },
  { t: "Привет", l: "Russian" },
  { t: "Kumusta", l: "Tagalog" },
  { t: "こんにちは", l: "Japanese" },
  { t: "Muraho", l: "Kinyarwanda" },
  { t: "Salom", l: "Uzbek" },
];

function TeacherPhone() {
  return (
    <div className="lp-phone lp-phone-teacher" aria-label="The teacher's view in RelayText, in English">
      <div className="lp-screen">
        <div className="lp-statusbar">
          <span>9:41</span>
        </div>
        <div className="lp-threadhead">
          <span className="lp-avatar">MH</span>
          <span className="lp-who">Maria Hernández</span>
          <span className="lp-lang">Spanish</span>
        </div>
        <div className="lp-msgs">
          <div className="lp-stamp">Today 3:12 PM</div>
          <div className="lp-b out lp-seq1">
            Hi Mrs. Hernández, this is Ms. Rivera from Sagewood Middle School. Conferences are Thursday, 4 to 7 pm. Can you come?
            <span className="lp-tr">Sent in Spanish</span>
          </div>
          <div className="lp-receipt lp-seq1">Delivered</div>
          <div className="lp-b in lp-seq4">
            Yes! We’ll be there at 5. Thank you.
            <span className="lp-tr" lang="es">Original: ¡Sí! Estaremos allí a las 5. Gracias.</span>
          </div>
          <div className="lp-b out lp-seq5">
            Wonderful, see you then!
            <span className="lp-tr">Sent in Spanish</span>
          </div>
        </div>
        <div className="lp-compose">
          <span>Text Message · Spanish</span>
        </div>
      </div>
      <p className="lp-caption">Ms. Rivera writes and reads in English</p>
    </div>
  );
}

function ParentPhone() {
  return (
    <div className="lp-phone lp-phone-parent" aria-label="The parent's regular Messages app, in Spanish">
      <div className="lp-screen">
        <div className="lp-statusbar">
          <span>9:41</span>
        </div>
        <div className="lp-threadhead plain">
          <span className="lp-avatar gray">MR</span>
          <span className="lp-who">Ms. Rivera</span>
        </div>
        <div className="lp-msgs" lang="es">
          <div className="lp-stamp">Text Message · Today 3:12 PM</div>
          <div className="lp-b in lp-seq2">
            Hola Sra. Hernández, soy la Sra. Rivera de la Escuela Secundaria Sagewood. Las conferencias son el jueves, de 4 a 7
            pm. ¿Puede venir?
          </div>
          <div className="lp-b sms lp-seq3">¡Sí! Estaremos allí a las 5. Gracias.</div>
          <div className="lp-b in lp-seq6">¡Maravilloso, nos vemos entonces!</div>
        </div>
        <div className="lp-compose plain">
          <span>Text Message</span>
        </div>
      </div>
      <p className="lp-caption">Mrs. Hernández gets a normal text in Spanish</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <header className="lp-nav">
        <a href="/" className="lp-logo" aria-label={BRAND}>
          <img src="/relay-text-logo.png" alt={BRAND} />
        </a>
        <nav className="lp-nav-actions" aria-label="Account">
          <a className="lp-link" href="/login">
            Teacher Login
          </a>
          <a className="lp-btn small" href="/signup">
            Sign up
          </a>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <h1>Text every family in their own language.</h1>
            <p className="lp-lede">
              Teachers write in English. Parents get a regular text in Spanish, Arabic, Somali or any of 192 languages, and
              reply the same way. Nobody downloads an app.
            </p>
            <div className="lp-ctas">
              <a className="lp-btn" href="/signup">
                Create a teacher account
              </a>
              <a className="lp-btn ghost" href="/login">
                Log in
              </a>
            </div>
            <p className="lp-fine">Teachers sign up with the code from their school.</p>
          </div>

          <div className="lp-pair">
            <TeacherPhone />
            <div className="lp-bridge" aria-hidden>
              <span>English</span>
              <svg viewBox="0 0 64 24" width="64" height="24">
                <path d="M2 8h54l-6-6M62 16H8l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Español</span>
            </div>
            <ParentPhone />
          </div>
        </section>

        <section className="lp-noapp">
          <figure className="lp-photo">
            <img
              src="https://images.unsplash.com/photo-1700190828755-2965e99a7604?w=1000&q=80&auto=format&fit=crop"
              alt="A mother sitting in her kitchen, smiling as she reads a text on her phone"
              loading="lazy"
              width={1000}
              height={1250}
            />
            <div className="lp-notif lp-photo-notif" aria-hidden>
              <div className="lp-notif-top">
                <span className="lp-notif-app">Messages</span>
                <span>now</span>
              </div>
              <div className="lp-notif-from">Ms. Rivera</div>
              <div className="lp-notif-body" lang="es">
                ¡Hola! Recordatorio: el día de fotos es el viernes. Por favor envíe el formulario firmado.
              </div>
            </div>
            <figcaption>
              Photo:{" "}
              <a href="https://unsplash.com/photos/a-woman-sitting-on-a-stool-looking-at-a-cell-phone-3VV2RjB1cOc" rel="noopener" target="_blank">
                Rifki Kurniawan
              </a>{" "}
              on Unsplash
            </figcaption>
          </figure>
          <div className="lp-noapp-copy">
            <h2>Parents receive texts in their own language, nothing to install.</h2>
            <p>
              Messages arrive in the texting app already on their phone, from a regular phone number. There’s no account to
              create, no password to forget and no app to keep updated.
            </p>
            <ul className="lp-checks">
              <li>Works on any phone that can text, including older phones and flip phones</li>
              <li>No data plan or Wi‑Fi needed</li>
              <li>Parents reply in their own words, in their own language</li>
              <li>Reply STOP anytime to opt out</li>
            </ul>
          </div>
        </section>

        <section className="lp-steps" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol>
            <li>
              <h3>Write in English</h3>
              <p>Pick a family and type your message, the same way you’d text anyone.</p>
            </li>
            <li>
              <h3>RelayText translates and sends it</h3>
              <p>It goes out as a normal text in the family’s language, from your own RelayText number.</p>
            </li>
            <li>
              <h3>Read the reply in English</h3>
              <p>The parent answers in their language. You see it in English, with the original right underneath.</p>
            </li>
          </ol>
        </section>

        <section className="lp-schools" aria-labelledby="schools">
          <div className="lp-schools-copy">
            <h2 id="schools">Built for schools.</h2>
            <dl>
              <div>
                <dt>A number for every teacher</dt>
                <dd>Each teacher texts from their own RelayText number. Their personal cell stays private.</dd>
              </div>
              <div>
                <dt>Familiar from day one</dt>
                <dd>It looks and works like the Messages app teachers already use. There’s nothing to learn.</dd>
              </div>
              <div>
                <dt>Admins see the whole school</dt>
                <dd>Add teachers with a school sign-up code, view any conversation and manage numbers in one place.</dd>
              </div>
              <div>
                <dt>Consent and opt-outs handled</dt>
                <dd>Families sign up with a simple form, and STOP replies are honored automatically.</dd>
              </div>
            </dl>
          </div>

          <div className="lp-window" aria-label="The RelayText inbox">
            <div className="lp-window-bar">
              <i />
              <i />
              <i />
            </div>
            <div className="lp-window-body">
              <aside className="lp-wl">
                <img src="/relay-text-logo.png" alt="" className="lp-wl-logo" />
                {[
                  ["OK", "Olena Kovalenko", "Perfect, thank you so much.", "3:24 PM", false, true],
                  ["MH", "Maria Hernández", "Yes! We’ll be there at 5. Thank you.", "3:14 PM", true, false],
                  ["AA", "Amina Abdi", "Thank you, Ayaan will bring the form tomorrow.", "2:02 PM", true, false],
                  ["SA", "Samir Al-Masri", "Can we meet after school on Thursday?", "1:47 PM", false, false],
                  ["TN", "Thanh Nguyen", "Reminder: picture day is Friday.", "Yesterday", false, false],
                  ["JL", "Jean-Pierre Louis", "Thanks for letting us know about the field trip.", "Yesterday", false, false],
                  ["LC", "Li Chen", "Early release Wednesday at 1:00 PM.", "Monday", false, false],
                ].map(([i, n, m, t, u, sel]) => (
                  <div className={`lp-wl-row ${sel ? "sel" : ""}`} key={n as string}>
                    <span className={`lp-dot ${u ? "on" : ""}`} />
                    <span className="lp-avatar gray sm">{i}</span>
                    <span className="lp-wl-text">
                      <span className="lp-wl-top">
                        <b>{n}</b>
                        <em>{t}</em>
                      </span>
                      <span className="lp-wl-msg">{m}</span>
                    </span>
                  </div>
                ))}
              </aside>
              <div className="lp-wr">
                <div className="lp-wr-head">
                  <span className="lp-avatar sm">OK</span>
                  <span className="lp-who">Olena Kovalenko</span>
                  <span className="lp-lang">Ukrainian</span>
                </div>
                <div className="lp-wr-msgs">
                <div className="lp-b in">
                  Is there a bus on Monday?
                  <span className="lp-tr" lang="uk">
                    Original: Чи буде автобус у понеділок?
                  </span>
                </div>
                <div className="lp-b out">
                  Yes, buses run on the normal schedule Monday.
                  <span className="lp-tr">Sent in Ukrainian</span>
                </div>
                <div className="lp-b in">
                  Thank you! Is the field trip form due Friday?
                  <span className="lp-tr" lang="uk">
                    Original: Дякую! Дозвіл на екскурсію треба здати до п’ятниці?
                  </span>
                </div>
                <div className="lp-b out">
                  Yes, by Friday. I’ll send a copy home with Sofia tomorrow.
                  <span className="lp-tr">Sent in Ukrainian</span>
                </div>
                <div className="lp-b in">
                  Perfect, thank you so much.
                  <span className="lp-tr" lang="uk">
                    Original: Чудово, дуже дякую.
                  </span>
                </div>
                </div>
                <div className="lp-wr-compose" aria-hidden>
                  <span>Text Message</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-hellos" aria-labelledby="langs">
          <h2 id="langs">Real-time translation in 192 languages, so no communication gets lost.</h2>
          <p>
            RelayText covers the home languages most common in U.S. schools, including ones many tools skip, like Somali,
            Burmese, Kinyarwanda and Hmong.
          </p>
          <ul className="lp-hello-grid">
            {HELLOS.map((h) => (
              <li key={h.l}>
                <span className="lp-hello" dir={h.rtl ? "rtl" : undefined}>
                  {h.t}
                </span>
                <span className="lp-hello-lang">{h.l}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-final">
          <h2>Start texting families today.</h2>
          <p>Get your school’s sign-up code from your RelayText admin, then create your account in a minute.</p>
          <div className="lp-ctas center">
            <a className="lp-btn light" href="/signup">
              Sign up
            </a>
            <a className="lp-btn outline-light" href="/login">
              Log in
            </a>
          </div>
        </section>
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
