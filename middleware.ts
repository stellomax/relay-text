import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

// The home page is public (signed-in staff go straight to their inbox).
// Everything else requires a staff login except sign-in, teacher sign-up, the public parent sign-up,
// Privacy Policy and Terms pages, and Twilio's webhooks.
export async function middleware(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;

  if (path === "/") {
    if (!session) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/inbox";
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
    "/((?!_next/|favicon|icon-|icon\\.svg|apple-touch-icon|relay-text-logo|manifest|login|signup|join|privacy|terms|landing/|api/auth/|api/sms/|api/optin|api/signup|api/join-info).*)",
  ],
};
