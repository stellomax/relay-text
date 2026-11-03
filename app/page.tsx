import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY } from "@/lib/brand";
import DemoModal from "@/components/DemoModal";
import SiteNav from "@/components/SiteNav";
import "./landing.css";
import "./demo/demo.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "Relay · Text any parent, in their language.",
  description:
    "Relay is two-way texting with built-in translation. Teachers write in English, and parents read and reply in their own language. No parent app.",
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

// Sample testimonials: placeholder photos, names and lorem ipsum until real quotes come in.
const TESTIMONIALS = [
  {
    quote:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    name: "Jennifer A.",
    role: "Assistant Principal",
    photo: "/testimonial-jennifer-2.jpg",
  },
  {
    quote:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.",
    name: "Pamela H.",
    role: "ELD Facilitator",
    photo: "https://images.unsplash.com/photo-1758873268223-f61976493498?w=240&h=240&q=80&auto=format&fit=crop&crop=faces",
  },
];


const CONTACT = "/contact";

const FAQ = [
  {
    q: "Will parents see our personal numbers?",
    a: "Never. Every text goes out from a Relay number, never from a teacher’s own phone, so parents never see a teacher’s personal cell number. Protecting the privacy of teachers and families is at the heart of how Relay is built.",
  },
  {
    q: "Is this more work for teachers?",
    a: "Simplicity guided every decision we made. If teachers can text, they can use Relay. It looks and works like the Messages app. They write in English, and Relay handles the language barrier in both directions.",
  },
  {
    q: "Do parents need an app?",
    a: "No. In our experience, if you ask someone to download an app you lose half of them instantly. Families get regular text messages on the phone they already have, including older phones and flip phones. There’s no app, account or password.",
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
    a: "Relay stores only what it needs to carry the conversation, nothing more. Only the teacher and your school’s administrators can see a family’s conversation, and family information is strictly protected.",
  },
  {
    q: "What about FERPA and district approval?",
    a: "Relay doesn’t connect to your student information system or store education records. Texts are delivered through Twilio and translated with Google Cloud Translation. We’re glad to walk through your district’s privacy review and data agreement process.",
  },
  {
    q: "What does it cost?",
    a: "Surprisingly affordable for the value Relay provides. Pricing depends on the size of your school. Get in touch and we’ll set up a pilot that fits.",
  },
];

export default function Landing() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteNav />

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <h1>
              <span>Text any parent,</span> <span>in their language.</span>
            </h1>
            <p className="lp-lede">
              Relay is two-way texting with built-in translation. Teachers write in English, and parents read and reply in their
              own language.
            </p>
            <ul className="lp-hero-checks">
              <li>Build stronger partnerships with marginalized families</li>
              <li>Empower teachers with simplified communications</li>
              <li>Watch student connection and performance increase!</li>
            </ul>
            <div className="lp-ctas">
              <DemoModal className="lp-btn lp-hero-demo">See Relay in action</DemoModal>
              <a className="lp-btn outline" href={CONTACT}>
                Bring Relay to your school
              </a>
            </div>
            <p className="lp-fine">
              Teachers: sign up with the code from your school, or <a href="/login">log in</a>.
            </p>
          </div>

          <figure className="lp-photo lp-hero-photo">
            <img
              src="/hero-teacher-3.jpg"
              alt="A teacher smiling as she types a message on her laptop at her classroom desk"
              width={1254}
              height={1254}
            />
            <div className="lp-notif lp-photo-notif lp-sent-notif" aria-hidden>
              <div className="lp-notif-top">
                <span className="lp-notif-app">Relay</span>
                <span>now</span>
              </div>
              <div className="lp-notif-from">To: Ms. Rivera</div>
              <div className="lp-notif-body">Hi! Reminder: the field trip is this Friday. Please send back the signed permission form.</div>
            </div>
          </figure>
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
                <span className="lp-notif-app">Messages app</span>
                <span>now</span>
              </div>
              <div className="lp-notif-from">From: Mrs. Wright</div>
              <div className="lp-notif-body" lang="es">
                ¡Hola! Recordatorio: la excursión es este viernes. Por favor, envíe el formulario de permiso firmado.
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
            <h2>Families can reach their child’s teacher, no app required.</h2>
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

        <section className="lp-benefits" id="about" aria-labelledby="benefits">
          <h2 id="benefits">What educators are saying</h2>
          <div className="lp-testimonials">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="lp-quote">
                <span className="lp-quote-mark" aria-hidden>
                  “
                </span>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <img src={t.photo} alt="" width={64} height={64} loading="lazy" />
                  <span>
                    <b>{t.name}</b>
                    {t.role}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="lp-schools" id="for-teachers" aria-labelledby="schools">
          <div className="lp-schools-copy">
            <h2 id="schools">Simple for teachers. Insightful for admin.</h2>
            <dl>
              <div>
                <dt>What matters most to parents</dt>
                <dd>Is my child fitting in? Are they falling behind? I know it’s tough, how do I communicate with the teachers to help my child?</dd>
              </div>
              <div>
                <dt>What matters most to teachers</dt>
                <dd>Are parents aware of the assignments and opportunities? How can I help them, while protecting my cell number (and my sanity)?</dd>
              </div>
              <div>
                <dt>What matters most to admins</dt>
                <dd>Are our teachers empowered to effectively educate? Are parents being pulled in? What does the data show?</dd>
              </div>
            </dl>
          </div>

          {/* Switches back and forth: a teacher's inbox, then the administrator dashboard. */}
          <div className="lp-swap">
            <div className="lp-window lp-slide lp-slide-a" aria-label="The Relay inbox">
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
            <div className="lp-window lp-slide lp-slide-b" aria-label="The administrator dashboard">
              <div className="lp-window-bar">
                <i />
                <i />
                <i />
              </div>
              <img
                className="lp-dash-shot"
                src="/demo-dashboard.jpg"
                alt="Relay's administrator dashboard: parent outreach, engagement and teacher involvement, messages each day, languages families speak, and conversation topics and sentiment"
                loading="lazy"
              />
            </div>
            <div className="lp-swap-labels" aria-hidden>
              <span className="a">Teacher inbox</span>
              <span className="b">Administrator dashboard</span>
            </div>
          </div>
        </section>

        <section className="lp-hellos" aria-labelledby="langs">
          <h2 id="langs">Connect with families in 192 languages.</h2>
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
          <h2 id="faq">What admin and teachers want to know.</h2>
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
