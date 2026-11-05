import { json } from "@/lib/http";
import { runRetention } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily message clean-up, called by Vercel Cron (vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "Not allowed." }, 401);
  try {
    return json({ ok: true, results: await runRetention() });
  } catch (e) {
    console.error("retention", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}
