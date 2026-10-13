import { getSession, Session } from "./session";

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

// Wrap an API handler: require a logged-in staff member and turn thrown errors into JSON.
export function withAuth(handler: (req: Request, session: Session) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const session = await getSession(req);
    if (!session) return json({ error: "Please sign in." }, 401);
    try {
      return await handler(req, session);
    } catch (e) {
      console.error(e);
      return json({ error: errorMessage(e) }, 500);
    }
  };
}
