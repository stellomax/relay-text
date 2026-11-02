import { baseUrlFromRequest } from "@/lib/config";
import { json } from "@/lib/http";
import { authClient } from "@/lib/supabaseAuth";
import { staffByEmail } from "@/lib/staff";

export const dynamic = "force-dynamic";

// "Forgot password?": email a reset link (sent by Supabase Auth) to an active Relay account.
// The answer is the same whether or not the email has an account, so it can't be used to look people up.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter the email you sign in with." }, 400);

  try {
    const me = await staffByEmail(email);
    if (me && me.status === "active") {
      const { error } = await authClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrlFromRequest(req)}/reset-password`,
      });
      if (error) {
        console.error("Password reset email failed:", error.status, error.message);
        if (error.status === 429 || /rate limit/i.test(error.message)) {
          return json({ error: "Too many reset emails were sent just now. Please wait a few minutes and try again, or ask your Relay admin to reset your password." }, 429);
        }
        return json({ error: "We couldn't send the email right now. Please ask your Relay admin to reset your password." }, 500);
      }
    }
  } catch (e) {
    console.error("Forgot password:", e);
    return json({ error: "We couldn't send the email right now. Please ask your Relay admin to reset your password." }, 500);
  }
  return json({ ok: true });
}
