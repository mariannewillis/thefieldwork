import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/** The sign-in page must never require a sign-in, or it redirects to itself. */
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  // Reset is for people who CANNOT sign in. Requiring a session here would
  // make the whole flow unreachable by the only people who need it.
  "/admin/forgot-password",
  "/admin/reset-password",
]);

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

  /**
   * THE PATH, HANDED TO THE LAYOUT THAT NEEDS IT.
   *
   * A layout is not told which route it is wrapping — that is the framework's
   * design, and normally the right one. The site's "coming soon" gate is the
   * exception: it has to let a payment link through while turning a browsable
   * page away, and that is a decision about the PATH made in the one place that
   * wraps every path (`(site)/layout.tsx`).
   *
   * The header is set here rather than the gate being here, because this file
   * runs on the edge and cannot reach the database. Middleware knows the path
   * and not the switch; the layout knows the switch and not the path. One
   * header joins them.
   */
  const carrying = new Headers(request.headers);
  carrying.set("x-pathname", pathname);
  const onward = () => NextResponse.next({ request: { headers: carrying } });

  if (!pathname.startsWith("/admin")) return onward();

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return onward();

  const payload = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (payload) return onward();

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

/**
 * EVERY PATH, NOT JUST THE ADMIN'S.
 *
 * It was `/admin/:path*` while the only job here was the session gate. It now
 * also carries the path to the site's layout, so it has to run on the pages
 * that layout wraps. Everything a browser fetches but nobody reads — the build
 * output, the images, the icon — is excluded: they are not pages, they are the
 * majority of requests, and running anything on them is cost for nothing.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|media/|favicon.ico).*)"],
};
