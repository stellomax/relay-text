import { getSession } from "./session";
import type { Staff } from "./db";
import { staffByEmail } from "./staff";

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
export function withAuth(handler: (req: Request, me: Staff) => Promise<Response>, opts: { admin?: boolean } = {}) {
  return async (req: Request): Promise<Response> => {
    const session = await getSession(req);
    if (!session) return json({ error: "Please sign in." }, 401);
    try {
      const me = await staffByEmail(session.email);
      if (!me || me.status !== "active") return json({ error: "Your account isn't active. Please sign in again." }, 401);
      if (opts.admin && me.role !== "admin") return json({ error: "Admins only." }, 403);
      return await handler(req, me);
    } catch (e) {
      console.error(e);
      return json({ error: errorMessage(e) }, 500);
    }
  };
}

export const withAdmin = (handler: (req: Request, me: Staff) => Promise<Response>) => withAuth(handler, { admin: true });
