import { json } from "@/lib/http";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { endAllSessions, staffByEmail } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Sign out: clears this browser's cookie and ends the person's sessions on every other device too.
export async function POST(req: Request) {
  const session = await getSession(req).catch(() => null);
  if (session) {
    const me = await staffByEmail(session.email).catch(() => null);
    if (me && (session.sv ?? 0) === (me.session_version ?? 0)) await endAllSessions(me);
  }
  const res = json({ ok: true });
  res.headers.append("set-cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return res;
}
