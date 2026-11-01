import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { BRAND, COMPANY } from "@/lib/brand";
import "./landing.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "Relay · Every family. Every language. One conversation.",
  description:
    "Relay helps schools reach every family. Teachers simply text, Relay handles the language barrier, and parents reply in their own language. No parent app.",
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

const STORY = [
  {
    title: "Reach",
    text: "Reach families traditional communication misses.",
    icon: (
      <>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4z" />
      </>
    ),
  },
  {
    title: "Connect",
    text: "Teachers and parents text naturally, each in their own language.",
    icon: (
      <>
        <path d="M4 4h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3.5V15H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <path d="M18 9h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v2.5L16 19h-4a2 2 0 0 1-1.8-1.1" />
      </>
    ),
  },
  {
    title: "Engage",
    text: "Remove the language barrier and make two-way family participation easier.",
    icon: (
      <>
        <circle cx="9" cy="7" r="3.2" />
        <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20" />
        <circle cx="17.5" cy="8.5" r="2.5" />
        <path d="M17 14h1a3.5 3.5 0 0 1 3.5 3.5V20" />
      </>
    ),
  },
  {
    title: "Succeed",
    text: "Build stronger school-family partnerships that support student success.",
    icon: (
      <>
        <path d="M2 9l10-5 10 5-10 5z" />
        <path d="M6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5" />
        <path d="M22 9v6" />
      </>
    ),
  },
];

const PROOF = ["No parent app", "Real-time translation", "Two-way texting", "Simple for teachers", "Secure & private"];

const CONTACT = "mailto:relay@stellomark.com?subject=Bringing%20Relay%20to%20our%20school";

const FAQ = [
  {
    q: "Do parents need an app?",
    a: "No. Families get regular text messages on the phone they already have, including older phones and flip phones. There’s no app, account or password.",
  },
  {
    q: "Is this more work for teachers?",
    a: "If teachers can text, they can use Relay. It looks and works like the Messages app. They write in English, and Relay handles the language barrier in both directions.",
  },
  {
    q: "Does IT need to be involved?",
    a: "Usually very little. Relay runs in a web browser, with nothing to install and no system integrations. We set up your school and give you a sign-up code for teachers. Your district may still want to review it.",
  },
  {
    q: "How quickly can we launch?",
    a: "Teachers can be texting families the same day your school is set up. They sign up with the school code, then share their parent sign-up link or add families who have agreed to receive texts.",
  },
  {
    q: "Is family information protected?",
    a: "Relay stores only what it needs to carry the conversation: each parent’s name, phone number and language, an optional child’s first name, and the messages. It holds no grades or student records. Only the teacher and your school’s administrators can see a family’s conversation, and family information is never sold or shared for marketing.",
  },
  {
    q: "What about FERPA and district approval?",
    a: "Relay doesn’t connect to your student information system or store education records. Texts are delivered through Twilio and translated with Google Cloud Translation. We’re glad to walk through your district’s privacy review and data agreement process.",
  },
  {
    q: "What does it cost?",
    a: "Pricing depends on the size of your school. Get in touch and we’ll set up a pilot that fits.",
  },
];

function TeacherPhone() {
  return (
    <div className="lp-phone lp-phone-teacher" aria-label="The teacher's view in Relay, in English">
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
          <img src="/relay-text-logo.png" alt="RelayText" />
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
            <h1>
              <span>Every family.</span> <span>Every language.</span> <span>One conversation.</span>
            </h1>
            <p className="lp-lede">
              Relay lets every teacher reach every family, and hear back. Teachers simply text. Relay handles the language
              barrier, and parents reply in their own language from the phone they already have.
            </p>
            <div className="lp-ctas">
              <a className="lp-btn" href={CONTACT}>
                Bring Relay to your school
              </a>
              <a className="lp-btn ghost" href="/signup">
                Teacher sign up
              </a>
            </div>
            <p className="lp-fine">
              Teachers: sign up with the code from your school, or <a href="/login">log in</a>.
            </p>
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

        <ul className="lp-proof" aria-label="What schools get with Relay">
          {PROOF.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>

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
            <h2>Every family can reach their child’s teacher.</h2>
            <p>
              Whatever language a family speaks and whatever phone they have, they can read their teacher’s messages and
              answer in their own words. Texts arrive in the app already on their phone. There’s nothing to install, no
              account to create and no password to forget.
            </p>
            <ul className="lp-checks">
              <li>Works on any phone that can text, including older phones and flip phones</li>
              <li>No data plan or Wi‑Fi needed</li>
              <li>Parents reply in their own words, in their own language</li>
              <li>Reply STOP anytime to opt out</li>
            </ul>
          </div>
        </section>

        <section className="lp-benefits" aria-labelledby="benefits">
          <h2 id="benefits">More than translation: a connection with every family</h2>
          <ul>
            {STORY.map((b) => (
              <li key={b.title}>
                <span className="lp-benefit-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {b.icon}
                  </svg>
                </span>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-schools" aria-labelledby="schools">
          <div className="lp-schools-copy">
            <h2 id="schools">Simple for teachers. Clear for principals.</h2>
            <dl>
              <div>
                <dt>Teachers just text</dt>
                <dd>It looks and works like the Messages app they already use. No new platform to learn, no extra burden.</dd>
              </div>
              <div>
                <dt>Real conversations, both ways</dt>
                <dd>Parents reply in their own language. Teachers read it in English and answer naturally.</dd>
              </div>
              <div>
                <dt>Principals can see it working</dt>
                <dd>Add teachers with a school sign-up code and view any conversation, read-only, in one place.</dd>
              </div>
              <div>
                <dt>Private numbers, consent built in</dt>
                <dd>Each teacher texts from their own Relay number, consent is recorded, and STOP is honored automatically.</dd>
              </div>
            </dl>
          </div>

          <div className="lp-window" aria-label="The Relay inbox">
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
          <h2 id="langs">Whatever language a family speaks at home.</h2>
          <p>
            Real-time translation in 192 languages, including the home languages many tools skip, like Somali, Burmese,
            Kinyarwanda and Hmong.
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

        <section className="lp-faq" aria-labelledby="faq">
          <h2 id="faq">Questions principals ask</h2>
          <dl>
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="lp-final">
          <h2>Bring Relay to your school.</h2>
          <p>Start with a pilot. We’ll set up your school, and your teachers can be texting families the same day.</p>
          <div className="lp-ctas center">
            <a className="lp-btn light" href={CONTACT}>
              Contact us
            </a>
            <a className="lp-btn outline-light" href="/signup">
              Teacher sign up
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
