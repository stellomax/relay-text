import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

// The home page is public (signed-in admins go to the teacher list, teachers to their inbox).
// Everything else requires a staff login except sign-in, teacher sign-up, the public parent sign-up,
// Privacy Policy and Terms pages, and Twilio's webhooks.
export async function middleware(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;

  if (path === "/") {
    if (!session) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = session.role === "admin" ? "/admin" : "/inbox";
    return NextResponse.redirect(url);
  }

  if (session) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/|favicon|icon-|icon\\.svg|apple-touch-icon|relay-text-logo|hero-teacher|testimonial-|team-|manifest|login|signup|forgot|reset-password|contact|demo|teachers|about|why-it-works|join|privacy|terms|landing/|api/auth/|api/sms/|api/optin|api/contact|api/signup|api/join-info|api/languages).*)",
  ],
};
