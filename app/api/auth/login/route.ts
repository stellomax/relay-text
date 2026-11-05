import { env, baseUrlFromRequest } from "@/lib/config";
import { db, Staff } from "@/lib/db";
import { json, errorMessage } from "@/lib/http";
import { createMfaTicket, createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { clientIp, limited, record, TOO_MANY } from "@/lib/ratelimit";
import { authClient } from "@/lib/supabaseAuth";
import { isBuiltInAdmin, newJoinCode, staffByEmail } from "@/lib/staff";
import { assignNumber } from "@/lib/numbers";

export const dynamic = "force-dynamic";

// Staff sign in with their Relay email + password.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return json({ error: "Enter your email and password." }, 400);
    const ip = `ip:${clientIp(req)}`;
    if (
      await limited([
        { kind: "login_fail", key: `email:${email}`, max: 5, minutes: 15 },
        { kind: "login_fail", key: ip, max: 20, minutes: 15 },
      ])
    ) {
      return json({ error: TOO_MANY }, 429);
    }
    if (!env.supabaseUrl || !env.supabaseServiceKey) {
      return json(
        { error: "The app isn't connected to Supabase yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy." },
        500
      );
    }

    const { data, error } = await authClient().auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const msg = (error?.message || "").toLowerCase();
      const code = (error as { code?: string } | null)?.code || "";
      console.error("Sign-in error:", error?.status, code, error?.message);
      if (msg.includes("invalid login") || code === "invalid_credentials") {
        await record("login_fail", `email:${email}`, ip);
        return json({ error: "That email and password didn't match a Relay login." }, 401);
      }
      if (msg.includes("not confirmed") || code === "email_not_confirmed") {
        return json({ error: "This login hasn't been confirmed yet. Ask a Relay admin for help." }, 401);
      }
      if (msg.includes("api key") || msg.includes("apikey") || error?.status === 401) {
        return json({ error: "Supabase rejected the app's key. Check SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy." }, 500);
      }
      return json({ error: "Sign-in isn't working right now. Please try again, or ask your Relay admin." }, 500);
    }

    // Find (or, for built-in admins, create) the staff record.
    let me = await staffByEmail(email);
    if (!me && isBuiltInAdmin(email)) {
      const { count } = await db().from("staff").select("id", { count: "exact", head: true });
      const ins = await db()
        .from("staff")
        .insert({ email, name: email.split("@")[0], role: "admin", status: "active", user_id: data.user.id, join_code: newJoinCode() })
        .select("*")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      me = ins.data as Staff;
      // The first person to set up gets the conversations created before teacher accounts existed.
      if (!count) {
        await db().from("contacts").update({ staff_id: me.id }).is("staff_id", null);
        await db().from("messages").update({ staff_id: me.id }).is("staff_id", null);
      }
      await assignNumber(me, baseUrlFromRequest(req)).catch((e) => console.error("number", e));
    }
    if (!me) {
      return json({ error: "There's no Relay account for this email. Teachers: create your account at relaytext.io/signup with the code from your admin." }, 403);
    }
    if (me.status === "pending") {
      return json({ error: "Your account is waiting for approval. You'll be able to sign in once an admin approves it." }, 403);
    }
    if (me.status === "disabled") {
      return json({ error: "This account has been turned off. Contact your Relay admin." }, 403);
    }
    if (isBuiltInAdmin(email) && me.role !== "admin") {
      await db().from("staff").update({ role: "admin" }).eq("id", me.id);
    }
    await db().from("staff").update({ user_id: data.user.id, last_seen_at: new Date().toISOString() }).eq("id", me.id);

    // Two-step sign-in: ask for the authenticator code before creating a session.
    if (me.mfa_enabled && me.mfa_secret) {
      return json({ mfa: true, ticket: await createMfaTicket(email) });
    }

    const role = isBuiltInAdmin(email) ? "admin" : me.role;
    const token = await createSessionToken(email, role, me.session_version ?? 0);
    // Admins start on the teacher list; teachers start in their inbox.
    const res = json({ ok: true, home: role === "admin" ? "/admin" : "/inbox" });
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
    if (/relation .*staff.* does not exist|staff.*schema cache/i.test(msg)) {
      return json({ error: "The database needs updating. Run the latest supabase/schema.sql in the Supabase SQL Editor." }, 500);
    }
    return json({ error: "Sign-in isn't working right now. Please try again, or ask your Relay admin." }, 500);
  }
}
