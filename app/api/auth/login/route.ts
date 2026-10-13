import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/config";
import { json } from "@/lib/http";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";

export const dynamic = "force-dynamic";

// Staff sign in with a Supabase Auth email + password (users are created in the Supabase dashboard).
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return json({ error: "Enter your email and password." }, 400);
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return json({ error: "The app isn't connected to Supabase yet (missing environment variables)." }, 500);
  }
  const supa = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa.auth.signInWithPassword({ email: String(email).trim(), password });
  if (error || !data.user) return json({ error: "That email and password didn't match." }, 401);

  const token = await createSessionToken(data.user.email || String(email));
  const res = json({ ok: true });
  res.headers.append(
    "set-cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
  );
  return res;
}
