import { getSession, SESSION_COOKIE } from "./session";
import type { Staff } from "./db";
import { isSuperAdmin, staffByEmail } from "./staff";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

// Wrap an API handler: require a signed-in, active staff member and turn thrown errors into JSON.
export function withAuth(handler: (req: Request, me: Staff) => Promise<Response>, opts: { admin?: boolean; superAdmin?: boolean } = {}) {
  return async (req: Request): Promise<Response> => {
    const session = await getSession(req);
    if (!session) return json({ error: "Please sign in." }, 401);
    try {
      const me = await staffByEmail(session.email);
      if (!me || me.status !== "active" || (session.sv ?? 0) !== (me.session_version ?? 0)) {
        // The cookie is signed but its account is gone or turned off: clear it, or the home page
        // keeps sending this browser to the inbox, which sends it back to Sign In.
        const res = json({ error: me && me.status === "active" ? "Please sign in again." : "Your account isn't active. Please sign in again." }, 401);
        res.headers.append("set-cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
        return res;
      }
      if (opts.admin && me.role !== "admin") return json({ error: "Admins only." }, 403);
      if (opts.superAdmin && (me.role !== "admin" || !isSuperAdmin(me.email))) return json({ error: "Super admins only." }, 403);
      return await handler(req, me);
    } catch (e) {
      console.error(e);
      return json({ error: errorMessage(e) }, 500);
    }
  };
}

export const withAdmin = (handler: (req: Request, me: Staff) => Promise<Response>) => withAuth(handler, { admin: true });
export const withSuper = (handler: (req: Request, me: Staff) => Promise<Response>) => withAuth(handler, { superAdmin: true });
