import { db } from "./db";

// Simple rate limits backed by the security_events table (see supabase/schema.sql).
// If the table hasn't been created yet, limits are skipped (and logged) rather than blocking everyone.

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}

let warned = false;
function missingTable(message: string) {
  if (/security_events/.test(message) && /exist|schema cache|relation/i.test(message)) {
    if (!warned) console.warn("Rate limits are off: run the latest supabase/schema.sql to create security_events.");
    warned = true;
    return true;
  }
  return false;
}

// How many times `kind` happened for `key` in the last `minutes`.
export async function recentCount(kind: string, key: string, minutes: number): Promise<number> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count, error } = await db()
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("key", key)
    .gte("created_at", since);
  if (error) {
    if (!missingTable(error.message)) console.error("rate limit check", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function record(kind: string, ...keys: string[]): Promise<void> {
  const rows = keys.filter(Boolean).map((key) => ({ kind, key }));
  if (!rows.length) return;
  const { error } = await db().from("security_events").insert(rows);
  if (error && !missingTable(error.message)) console.error("rate limit record", error.message);
  // Now and then, clear out rows older than a day.
  if (Math.random() < 0.02) {
    await db().from("security_events").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  }
}

// True if any of the checks is over its limit.
export async function limited(checks: { kind: string; key: string; max: number; minutes: number }[]): Promise<boolean> {
  const counts = await Promise.all(checks.map((c) => recentCount(c.kind, c.key, c.minutes)));
  return counts.some((n, i) => n >= checks[i].max);
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
