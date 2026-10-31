import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

// Everything requires a staff login except the login page, the public parent sign-up,
// Privacy Policy and Terms pages, and Twilio's webhooks.
export async function middleware(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon|icon-|apple-touch-icon|relay-text-logo|manifest|login|join|privacy|terms|api/auth/|api/sms/|api/optin).*)"],
};
