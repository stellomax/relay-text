import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import { BRAND, COMPANY_DISPLAY } from "@/lib/brand";
import SiteNav from "@/components/SiteNav";
import DemoModal from "@/components/DemoModal";
import "../landing.css";
import "../demo/demo.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "Why it works | Relay",
  description:
    "What the research says about teachers texting parents, and practical, proven ways to do it: short, personal, actionable messages in each family's language.",
};

// Each number is tied to a source in SOURCES below (by key).
const STATS = [
  { n: "41%", what: "fewer students failed to earn course credit", how: "when teachers sent parents one-sentence messages each week", src: "kraft-rogers" },
  { n: "38%", what: "fewer course failures, and 17% more class attendance", how: "when parents got texts about missed work, grades and absences", src: "bergman-chan" },
  { n: "40%", what: "more homework completed", how: "when teachers were in frequent contact with families", src: "kraft-dougherty" },
  { n: "98%", what: "of U.S. adults own a cellphone", how: "so a text reaches nearly every parent, no app needed", src: "pew" },
];

const STRATEGIES = [
  {
    title: "Keep it short, personal and regular",
    research:
      "In a summer credit-recovery program, teachers sent each family one individualized sentence a week. That alone cut the share of students who failed to earn credit from 15.8% to 9.3%.",
    src: "kraft-rogers",
    practice: "Pick a day each week. Send each family one sentence about their own child. It takes a minute per family.",
    sample: "Hi Ms. Rivera, Sofia solved a tough fraction problem in front of the class today. Ask her to show you how!",
  },
  {
    title: "Make it something parents can act on",
    research:
      "Messages about what a student could improve had the biggest effect, more than praise alone. The best ones pointed to something specific a parent could follow up on, like a missed quiz.",
    src: "kraft-rogers",
    practice: "Name one thing, and say what fixes it and by when. Parents can't help with “needs to try harder.” They can help with “turn in Tuesday's worksheet.”",
    sample: "Hi Mr. Nguyen, Bao is missing Tuesday's math worksheet. If he turns it in by Friday, he'll get full credit.",
  },
  {
    title: "Tell parents what they can't see",
    research:
      "Parents tend to overestimate their child's grades and underestimate missed assignments. Texts about missed work, grades and absences reduced course failures and raised attendance, with the biggest gains for students who were struggling.",
    src: "bergman-chan",
    practice: "Send a heads-up the day work goes missing or a student is absent, not weeks later on a report card.",
    sample: "Hi Mrs. Abdi, Ayaan wasn't in 3rd period today. Is everything OK? Here's what we covered so he can catch up.",
  },
  {
    title: "Open the line before you need it",
    research:
      "Frequent teacher-family contact built stronger teacher-student relationships and more parent involvement. Sixth graders' class participation rose 49%.",
    src: "kraft-dougherty",
    practice:
      "In the first two weeks of school, send every family a hello and one good thing. When a concern comes up later, you're not a stranger.",
    sample: "Hi! I'm Ms. Wright, Sofia's math teacher. She's off to a great start. You can text me here anytime, in Spanish.",
  },
  {
    title: "Give families one small thing to do",
    research:
      "In a program that texted preschool parents bite-size tips three times a week, parents did more learning activities at home and got more involved at school, and children's early literacy improved.",
    src: "york-loeb",
    practice: "Now and then, swap the update for a two-minute activity tied to what you're teaching.",
    sample: "Tonight at dinner, ask Sofia how she'd cut a pizza into 8 equal slices. That's this week's fractions lesson!",
  },
  {
    title: "Reach every family in their language",
    research:
      "About 1 in 10 U.S. public school students (5.3 million) is an English learner. Those families are the easiest to miss when every message goes out in English.",
    src: "nces",
    practice:
      "Set each parent's language once on the Parents list. Teachers write in English, parents read and reply in their own language, and replies come back in English.",
    caption: "What the parent reads",
    sample: "Hola, Sra. Rivera: Sofía resolvió un problema difícil de fracciones frente a la clase hoy. ¡Pídale que le muestre cómo!",
  },
];

const ROUTINE = [
  { day: "Monday", text: "Check for missing work and absences from last week. Send a quick heads-up to those families." },
  { day: "Midweek", text: "Send one personal sentence to five or six families, rotating so everyone hears from you each month." },
  { day: "Friday", text: "Answer replies, and give one family a small thing to try at home over the weekend." },
];

const SOURCES: Record<string, { cite: string; url: string }> = {
  "kraft-rogers": {
    cite: "Kraft, M. A., & Rogers, T. (2015). The underutilized potential of teacher-to-parent communication: Evidence from a field experiment. Economics of Education Review, 47, 49–63.",
    url: "https://www.hks.harvard.edu/publications/underutilized-potential-teacher-parent-communication-evidence-field-experiment",
  },
  "bergman-chan": {
    cite: "Bergman, P., & Chan, E. W. (2021). Leveraging parents through low-cost technology: The impact of high-frequency information on student achievement. Journal of Human Resources, 56(1), 125–158. (Effect sizes from the 2017 working paper.)",
    url: "https://www.povertyactionlab.org/node/2353",
  },
  "kraft-dougherty": {
    cite: "Kraft, M. A., & Dougherty, S. M. (2013). The effect of teacher–family communication on student engagement: Evidence from a randomized field experiment. Journal of Research on Educational Effectiveness, 6(3), 199–222.",
    url: "https://annenberg.brown.edu/publications/effect-teacher-family-communication-student-engagement-evidence-randomized-field",
  },
  "york-loeb": {
    cite: "York, B. N., Loeb, S., & Doss, C. (2019). One step at a time: The effects of an early literacy text-messaging program for parents of preschoolers. Journal of Human Resources, 54(3), 537–566.",
    url: "https://scale.stanford.edu/publications/one-step-time-effects-early-literacy-text-messaging-program-parents-preschoolers",
  },
  kraft2017: {
    cite: "Kraft, M. A. (2017). Engaging parents through better communication systems. Educational Leadership, 75(1), 58–62.",
    url: "https://scholar.harvard.edu/sites/scholar.harvard.edu/files/mkraft/files/kraft_2017_engaging_parents_through_better_communication_systems_el.pdf",
  },
  nces: {
    cite: "National Center for Education Statistics (2024). English Learners in Public Schools. Condition of Education.",
    url: "https://nces.ed.gov/programs/coe/indicator/cgf",
  },
  pew: {
    cite: "Pew Research Center. Mobile Fact Sheet.",
    url: "https://www.pewresearch.org/internet/fact-sheet/mobile/",
  },
};
const ORDER = ["kraft-rogers", "bergman-chan", "kraft-dougherty", "york-loeb", "kraft2017", "nces", "pew"];
const num = (k: string) => ORDER.indexOf(k) + 1;

function Ref({ k }: { k: string }) {
  return (
    <sup className="ww-ref">
      <a href={`#src-${k}`} aria-label={`Source ${num(k)}`}>
        {num(k)}
      </a>
    </sup>
  );
}

export default function WhyItWorksPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteNav />

      <main className="lp-about-main ww">
        <section className="lp-page-hero">
          <p className="lp-eyebrow">Why it works</p>
          <h1>Short, regular texts to parents. Big results for students.</h1>
          <p className="lp-lede">
            The research is clear and surprisingly practical: when teachers reach parents often, briefly and personally,
            students show up more, turn in more work and fail fewer classes. Here's what the studies found, and how to put
            it to work with {BRAND}.
          </p>
        </section>

        <section className="ww-stats" aria-label="What the research found">
          {STATS.map((s) => (
            <div className="ww-stat" key={s.n}>
              <b>{s.n}</b>
              <span className="ww-stat-what">
                {s.what}
                <Ref k={s.src} />
              </span>
              <span className="ww-stat-how">{s.how}</span>
            </div>
          ))}
        </section>

        <section className="lp-about-why" aria-labelledby="gap">
          <h2 id="gap">The gap most schools have</h2>
          <p>
            Most teachers want to stay in touch with families. But in a national survey, 59% of public school parents said
            they hadn't received a single phone call home from their child's school in the past year.
            <Ref k="kraft2017" /> Lower-income families were less likely to get individual emails, too.
          </p>
          <p>
            The families who are hardest to reach are often the ones who'd gain the most. About 1 in 10 public school students
            is an English learner.
            <Ref k="nces" /> When the newsletter, the portal and the robocall are all in English, those parents hear the least,
            and it isn't for lack of caring.
          </p>
        </section>

        <section className="ww-strats-wrap" aria-labelledby="strats">
          <h2 id="strats">Six proven strategies, made practical</h2>
          <ol className="ww-strats">
            {STRATEGIES.map((s, i) => (
              <li key={s.title}>
                <div className="ww-num" aria-hidden>
                  {i + 1}
                </div>
                <div className="ww-strat-body">
                  <h3>{s.title}</h3>
                  <p className="ww-research">
                    <strong>The research: </strong>
                    {s.research}
                    <Ref k={s.src} />
                  </p>
                  <p>
                    <strong>In practice: </strong>
                    {s.practice}
                  </p>
                </div>
                <figure className="ww-sample">
                  <figcaption>{s.caption ?? "Try a text like"}</figcaption>
                  <p>{s.sample}</p>
                </figure>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-about-why" aria-labelledby="routine">
          <h2 id="routine">A simple 15-minute weekly routine</h2>
          <p>Our suggestion for teachers who want a habit that sticks:</p>
          <ul className="ww-routine">
            {ROUTINE.map((r) => (
              <li key={r.day}>
                <b>{r.day}</b>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-about-why" aria-labelledby="measure">
          <h2 id="measure">Measure what matters</h2>
          <p>
            The studies point to the same few habits: reach every family, reach them often, and keep the conversation going.
            That's exactly what the {BRAND} dashboard tracks for principals: <strong>Parent Outreach</strong> (how many families
            teachers have contacted), <strong>Parent Engagement</strong> (how many wrote back) and{" "}
            <strong>Teacher Involvement</strong> (how many teachers are texting), each compared with the month before.
          </p>
          <p>
            A good first goal: every family hears from at least one teacher each month, in their own language.
          </p>
        </section>

        <section className="lp-about-why ww-sources" aria-labelledby="sources">
          <h2 id="sources">Sources</h2>
          <p className="ww-note">
            These are randomized studies of specific programs, schools and grade levels, so results at your school will differ.
            Texting parents is one piece of a bigger picture, not a cure-all. We've linked each study so you can read it yourself.
          </p>
          <ol>
            {ORDER.map((k) => (
              <li key={k} id={`src-${k}`}>
                {SOURCES[k].cite}{" "}
                <a href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">
                  Read it
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-final">
          <h2>Put the research to work.</h2>
          <p>See how a teacher and a parent text in two languages, or ask us about a pilot at your school.</p>
          <div className="lp-ctas center">
            <a className="lp-btn outline-light" href="/contact">
              Get Started
            </a>
            <DemoModal className="lp-btn light lp-hero-demo">See Relay in Action</DemoModal>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <span>
          {BRAND} is a service of {COMPANY_DISPLAY}.
        </span>
        <nav aria-label="Footer">
          <a href="/join">Parents: sign up for texts</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/student-data">Student Data</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </nav>
      </footer>
    </div>
  );
}
