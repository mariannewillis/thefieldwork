"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV, type NavItem } from "@/content/admin-nav";
import { signOut } from "@/app/(admin)/actions";

/**
 * The portal chrome: a persistent rail, a utility header, and the working
 * pane. Every screen in the admin sits inside this.
 *
 * Two deliberate departures from docs/screens/admin/admin-dashboard.html:
 *
 *  1. A mobile drawer. The approved screen hides the rail below `lg` and puts
 *     nothing in its place, so on a phone there is no way to reach any of the
 *     eleven sections. That is the same defect the public homepage had at
 *     390px. Fixing it here rather than shipping it and finding it later.
 *
 *  2. No fabricated state. The approved screen shows "All changes published",
 *     a "2" badge on Requests, and "session ends 2 Sep". None of those have a
 *     source yet. A status light that is always green is worse than no status
 *     light: it trains the owner to trust a signal that isn't reading
 *     anything. They return when something real backs them.
 */

function isActive(pathname: string, href: string): boolean {
  // "/admin" is the Today page, not a prefix for the whole portal — without
  // the exact check every section would light up Today as well as itself.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      className="nav-item t"
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {item.icon}
      </svg>
      {item.label}
    </Link>
  );
}

/** The rail's contents — shared by the desktop aside and the mobile drawer. */
function RailBody({
  pathname,
  username,
  onNavigate,
}: {
  pathname: string;
  username: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link
        href="/admin"
        className="block w-full min-h-[44px]"
        aria-label="The Field Work admin — Today"
        onClick={onNavigate}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-horizontal.svg"
          alt="The Field Work"
          width={440}
          height={120}
          className="w-full h-auto"
        />
      </Link>
      <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold -mt-4">
        Admin
      </p>

      <nav className="relative flex flex-col gap-[2px]" aria-label="Admin">
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <p className="mt-auto fig font-mono text-[15px] leading-relaxed text-plate-soft">
        Signed in as {username}
        <br />
        Owner
      </p>
    </>
  );
}

/**
 * The header clock. Rendered empty on the server and filled after mount —
 * the server's clock and the browser's clock disagree, and a time that
 * silently corrects itself on hydration is a React error waiting to happen.
 * Marianne's timezone is fixed to London: her diary is in London, and a
 * booking shown in the browser's local time would be wrong for her the
 * moment she travels.
 */
function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/London",
        })
          .format(new Date())
          .toUpperCase()
          .replace(" AT ", " · "),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="fig font-mono text-[15px] tracking-[0.1em] text-plate-soft">
      {now ? `${now} · EUROPE/LONDON` : " "}
    </p>
  );
}

export default function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer whenever the route changes — otherwise tapping a section
  // leaves the overlay covering the page you just asked for.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="bg-ground text-plate-text font-body">
      <a
        href="#main"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to the main content
      </a>

      <div className="flex min-h-screen">
        {/* ---- the rail, desktop -------------------------------------- */}
        <aside
          className="relative hidden lg:flex w-[256px] shrink-0 flex-col gap-7 px-5 py-7 overflow-hidden"
          aria-label="Admin sections"
        >
          <div className="relative z-10 flex flex-col gap-7 h-full">
            <RailBody pathname={pathname} username={username} />
          </div>
        </aside>

        {/* ---- the main column ---------------------------------------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 px-6 lg:px-11 py-5 border-b border-plate-rule/40">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-controls="admin-drawer"
                className="t flex items-center gap-2 min-h-[44px] px-3 -ml-3 text-[17px] font-medium text-plate-text"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
                Menu
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-horizontal.svg"
                alt="The Field Work"
                width={300}
                height={82}
                className="h-[26px] w-auto"
              />
            </div>

            <Clock />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <a
                className="t flex items-center gap-1.5 min-h-[44px] text-[17px] font-medium text-gold underline decoration-gold hover:text-plate-text hover:decoration-plate-text"
                href="/"
              >
                View site
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
              <span className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gold fig font-mono text-[15px] font-bold text-ink"
                  aria-hidden="true"
                >
                  {username.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-left">
                  <span className="block text-[17px] font-semibold text-plate-text">
                    {username}
                  </span>
                  <span className="block text-[15px] text-plate-soft">
                    Owner
                  </span>
                </span>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="t min-h-[44px] text-[17px] font-medium text-plate-soft underline decoration-plate-rule hover:text-plate-text hover:decoration-plate-text"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <main id="main" className="relative flex-1 px-6 lg:px-11 pb-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/admin-field-1600.webp"
              alt=""
              aria-hidden="true"
              className="main-field"
            />
            <div className="relative z-10 max-w-[1280px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ---- the rail, mobile ----------------------------------------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 w-full bg-ground/80"
          />
          <div
            id="admin-drawer"
            className="relative flex h-full w-[290px] max-w-[85vw] flex-col gap-7 overflow-y-auto bg-surface px-5 py-7"
          >
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="t absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-plate-soft hover:text-plate-text"
              aria-label="Close the menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <RailBody
              pathname={pathname}
              username={username}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
