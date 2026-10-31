import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/config";
import { json, errorMessage } from "@/lib/http";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";

export const dynamic = "force-dynamic";

// Staff sign in with a Supabase Auth email + password (users are created in the Supabase dashboard).
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) return json({ error: "Enter your email and password." }, 400);
    if (!env.supabaseUrl || !env.supabaseServiceKey) {
      return json(
        { error: "The app isn't connected to Supabase yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy." },
        500
      );
    }

    const supa = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supa.auth.signInWithPassword({ email: String(email).trim(), password });

    if (error || !data.user) {
      const msg = (error?.message || "").toLowerCase();
      const code = (error as { code?: string } | null)?.code || "";
      console.error("Sign-in error:", error?.status, code, error?.message);
      if (msg.includes("invalid login") || code === "invalid_credentials") {
        return json({ error: "That email and password didn't match a Relay Text login." }, 401);
      }
      if (msg.includes("not confirmed") || code === "email_not_confirmed") {
        return json({ error: "This login hasn't been confirmed. In Supabase, re-create the user with Auto Confirm User ticked." }, 401);
      }
      if (msg.includes("api key") || msg.includes("apikey") || error?.status === 401) {
        return json({ error: "Supabase rejected the app's key. Check SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy." }, 500);
      }
      return json({ error: `Supabase: ${error?.message || "sign-in failed"}` }, 500);
    }

    const token = await createSessionToken(data.user.email || String(email));
    const res = json({ ok: true });
    res.headers.append(
      "set-cookie",
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
    );
    return res;
  } catch (e) {
    const msg = errorMessage(e);
    console.error("Sign-in crashed:", msg);
    if (/fetch failed|ENOTFOUND|getaddrinfo|Invalid (supabase)?URL/i.test(msg)) {
      return json({ error: "Couldn't reach Supabase. Check SUPABASE_URL in Vercel (it looks like https://xxxx.supabase.co), then redeploy." }, 500);
    }
    return json({ error: `Sign-in error: ${msg}` }, 500);
  }
}
