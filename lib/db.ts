import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";

let cached: SupabaseClient | null = null;

// Server-only database client. Uses the service role key, so it must never reach the browser.
export function db(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.");
  }
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export type Contact = {
  id: string;
  parent_name: string;
  child_name: string | null;
  phone: string;
  language: string;
  opted_out: boolean;
  staff_id: string | null;
  parent_id?: string | null;
  groups?: string[] | null;
  consent_at?: string | null;
  consent_source?: string | null;
  created_at: string;
};

export type Staff = {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  school: string | null;
  school_id?: string | null;
  role: "admin" | "teacher";
  status: "pending" | "active" | "disabled";
  area_code: string | null;
  phone_number: string | null;
  phone_sid: string | null;
  phone_placeholder: boolean;
  join_code: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  contact_id: string;
  direction: "outbound" | "inbound";
  body_en: string;
  body_translated: string | null;
  language: string | null;
  status: string | null;
  error: string | null;
  twilio_sid: string | null;
  is_read: boolean;
  simulated: boolean;
  sent_by: string | null;
  staff_id?: string | null;
  from_number?: string | null;
  to_number?: string | null;
  created_at: string;
};

// Supabase returns at most 1,000 rows per request, whatever .limit() says.
// allRows pages through a query 1,000 rows at a time and returns every row.
// Build the query fresh in `page` (with a stable .order) and apply the given range.
export async function allRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  max = 200000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
