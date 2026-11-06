import { db } from "./db";
import { clientIp, limited, record } from "./ratelimit";
import type { Answers, IntakeFile } from "./intake";

// Server side of the district intake form (see lib/intake.ts and supabase/schema.sql).

export const BUCKET = "district-intake";
export const NEEDS_SQL = "The intake form isn't set up in the database yet. Run supabase/schema.sql in Supabase (SQL Editor), then reload.";
export const missingTable = (m: string) => /district_intakes|does not exist|schema cache/i.test(m);

export type Intake = {
  id: string;
  token: string;
  district_id: string | null;
  district_name: string;
  answers: Answers;
  files: IntakeFile[];
  status: "draft" | "submitted" | "reviewed";
  submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// A long random secret for the link (about 190 bits).
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Look up an intake by its link. Wrong links count toward a per-IP limit, so links can't be guessed.
export async function intakeByToken(req: Request, token: string): Promise<{ intake?: Intake; error?: string; status?: number }> {
  const ip = `ip:${clientIp(req)}`;
  if (await limited([{ kind: "intake_bad", key: ip, max: 20, minutes: 15 }])) {
    return { error: "Too many attempts. Please wait a few minutes and try again.", status: 429 };
  }
  const t = String(token || "").trim();
  if (t.length < 20 || t.length > 64 || !/^[A-Za-z0-9_-]+$/.test(t)) {
    await record("intake_bad", ip);
    return { error: "This link isn't working. Please ask Relay for a new one.", status: 404 };
  }
  const { data, error } = await db().from("district_intakes").select("*").eq("token", t).maybeSingle();
  if (error) {
    console.error("intake lookup", error.message);
    return { error: missingTable(error.message) ? NEEDS_SQL : "Sorry, the form isn't working right now. Please email relay@stellomark.com.", status: 500 };
  }
  if (!data) {
    await record("intake_bad", ip);
    return { error: "This link isn't working. Please ask Relay for a new one.", status: 404 };
  }
  return { intake: data as Intake };
}

// What the district sees: no internal ids or who created it.
export function publicView(i: Intake) {
  return {
    district_name: i.district_name,
    answers: i.answers || {},
    files: (i.files || []).map(({ name, kind, size, uploaded_at, path }) => ({ name, kind, size, uploaded_at, path })),
    status: i.status,
    submitted_at: i.submitted_at,
    updated_at: i.updated_at,
  };
}

// The bucket is created by schema.sql; create it here too if that step was missed.
export async function ensureBucket() {
  const storage = db().storage;
  const { data } = await storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10 * 1024 * 1024 });
  if (error && !/exist/i.test(error.message)) throw new Error(error.message);
}

export async function removeFiles(paths: string[]) {
  if (!paths.length) return;
  const { error } = await db().storage.from(BUCKET).remove(paths);
  if (error) console.error("intake file remove", error.message);
}
