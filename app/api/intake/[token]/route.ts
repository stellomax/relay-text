import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { AUTHORIZATION_TEXT, cleanAnswers, submitProblems } from "@/lib/intake";
import { clientIp } from "@/lib/ratelimit";
import { intakeByToken, publicView } from "@/lib/intakeStore";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

// Public (the link is the key): load the district's intake form.
export async function GET(req: Request, { params }: Ctx) {
  const { token } = await params;
  const r = await intakeByToken(req, token);
  if (!r.intake) return json({ error: r.error }, r.status);
  return json({ intake: publicView(r.intake) });
}

// Save some answers (the form saves as people type). Only the fields sent are changed,
// so two people filling in different sections don't overwrite each other.
export async function PATCH(req: Request, { params }: Ctx) {
  const { token } = await params;
  const r = await intakeByToken(req, token);
  if (!r.intake) return json({ error: r.error }, r.status);
  if (r.intake.status !== "draft") return json({ error: "This form has been submitted. Contact Relay to make changes." }, 409);
  const b = await req.json().catch(() => ({}));
  const changes = cleanAnswers(b.answers);
  if (!Object.keys(changes).length) return json({ ok: true });
  const answers = { ...(r.intake.answers || {}), ...changes };
  const updated_at = new Date().toISOString();
  const { error } = await db().from("district_intakes").update({ answers, updated_at }).eq("id", r.intake.id).eq("status", "draft");
  if (error) {
    console.error("intake save", error.message);
    return json({ error: "Couldn't save. Check your connection and try again." }, 500);
  }
  return json({ ok: true, updated_at });
}

// Submit the form: everything required must be filled in.
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const r = await intakeByToken(req, token);
  if (!r.intake) return json({ error: r.error }, r.status);
  if (r.intake.status !== "draft") return json({ error: "This form has already been submitted." }, 409);
  const b = await req.json().catch(() => ({}));
  const answers = { ...(r.intake.answers || {}), ...cleanAnswers(b.answers) };
  const problems = submitProblems(answers);
  if (Object.keys(problems).length) return json({ error: "Some required answers are missing or need fixing.", problems }, 400);
  const now = new Date().toISOString();
  // Keep the exact authorization wording agreed to, and when and from where.
  answers.auth_text = AUTHORIZATION_TEXT;
  answers.auth_at = now;
  answers.auth_ip = clientIp(req);
  const { error } = await db()
    .from("district_intakes")
    .update({ answers, status: "submitted", submitted_at: now, updated_at: now })
    .eq("id", r.intake.id)
    .eq("status", "draft");
  if (error) {
    console.error("intake submit", error.message);
    return json({ error: "Couldn't submit. Please try again, or email relay@stellomark.com." }, 500);
  }
  return json({ ok: true, submitted_at: now });
}
