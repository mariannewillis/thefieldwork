import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/** The sign-in page must never require a sign-in, or it redirects to itself. */
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

/**
 * The early gate.
 *
 * This turns an unauthenticated request away before any admin page starts
 * rendering. It checks the session's signature and expiry only — it cannot
 * read the credential file, so it cannot tell whether a valid signature has
 * since been revoked. The admin layout does that, and it is the real gate.
 *
 * Both exist on purpose. If the layout check were ever removed by accident,
 * this still refuses forged and expired tokens; if this were removed, the
 * layout still refuses everything. Neither alone is the whole answer.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const payload = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (payload) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  // Remember where she was going, so signing in lands her there rather than
  // dumping her on Today. Only ever a path on this site — putting a
  // caller-supplied URL in here would turn the login page into an open
  // redirect, which is a phishing tool.
  if (pathname !== "/admin") {
    login.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
