// Automated WCAG 2.1 A/AA check (axe-core) of Relay's public pages. Run by the "a11y" job in checks.yml.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "fs";

const BASE = process.env.BASE_URL || "https://relaytext.io";
const PAGES = ["/", "/about", "/why-it-works", "/trust", "/contact", "/teachers", "/student-data", "/privacy", "/terms", "/join", "/login", "/signup", "/forgot", "/demo"];

const browser = await chromium.launch();
const report = { base: BASE, at: new Date().toISOString(), pages: [] };
for (const path of PAGES) {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      report.pages.push({
        path,
        width,
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          examples: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 200), why: n.failureSummary?.slice(0, 300) })),
        })),
      });
    } catch (e) {
      report.pages.push({ path, width, error: String(e).slice(0, 300) });
    }
    await page.close();
  }
}
await browser.close();
writeFileSync("a11y-report.json", JSON.stringify(report, null, 2));
const total = report.pages.reduce((n, p) => n + (p.violations?.length || 0), 0);
console.log(`Checked ${report.pages.length} page views, ${total} rule violations.`);
