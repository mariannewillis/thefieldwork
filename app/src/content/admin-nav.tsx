import type { ReactNode } from "react";

/**
 * The admin rail — twelve sections, in the order the approved screens declare
 * them, plus Email templates, which the approved set had no screen for.
 *
 * TWELVE AND NOT THIRTEEN: the approved set drew Pictures and Documents as two
 * entries, and they are one screen now (Media, with three tabs — videos,
 * pictures, documents). That is a drift from the approved rail, recorded here
 * rather than made silently, and it is the operator's: two doors onto one
 * library would have meant two answers to "where is this picture used".
 *
 * The order is a claim about Marianne's day, not alphabetical filing:
 * what needs her attention first (Today, Calendar, Requests, Bookings) sits
 * above what she edits occasionally (the page, offerings, media) above what
 * she configures once (availability, settings).
 *
 * Requests and Bookings are two entries because they are two jobs (D-18).
 * Requests is somebody asking for an hour and waiting for an answer; Bookings
 * is money that has already moved. The approved screens put them next to each
 * other and give them separate rows, which is the shape this follows.
 *
 * Icon markup is copied verbatim from docs/screens/admin/*.html. Redrawing
 * them by hand is how an icon set quietly drifts out of one visual world. The
 * one exception is Email templates — there is no approved screen to copy from,
 * so its icon is the Documents page glyph with the two text lines kept and the
 * fold kept, drawn to the same 24×24 grid at the same 1.6 stroke.
 */

export type NavItem = {
  href: string;
  label: string;
  /** The inner children of a 24×24 stroke icon; the wrapper is in the shell. */
  icon: ReactNode;
};

export const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin/calendar",
    label: "Calendar",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
  },
  {
    href: "/admin/bookings",
    label: "Requests",
    icon: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
      </>
    ),
  },
  {
    href: "/admin/workshop-bookings",
    label: "Bookings",
    icon: (
      <>
        <path d="M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" />
        <path d="M13 5v2M13 11v2M13 17v2" strokeDasharray="0.1 4" />
      </>
    ),
  },
  {
    /* WAS "Home page", AND IT IS "Pages" NOW (D-34). One entry that opens onto
       the list of every page on the site, because the home page stopped being
       the only one worth naming the moment the panel could show the other six
       and say plainly which of them are not editable yet. */
    href: "/admin/pages",
    label: "Pages",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5" />
        <path d="m9.5 15.5 1-1 3-3 1.5 1.5-3 3-1 1H9.5v-1.5Z" />
      </>
    ),
  },
  {
    href: "/admin/offerings",
    label: "Offerings",
    icon: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
  },
  {
    /* ONE ENTRY WHERE THERE WERE TWO. This was "Pictures" and there was a
       separate "Documents" below Subscribers; both are this screen's tabs now,
       with Videos beside them, because they are one job — find the thing, know
       what it is, know where it is used. The icon is the Pictures glyph
       unchanged: it is the one of the three she opens most, and redrawing it as
       a compromise between a photograph, a film and a sheet of paper would have
       produced a shape that reads as none of them. */
    href: "/admin/media",
    label: "Media",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m3 17 5-4 4 3 3-2 6 5" />
      </>
    ),
  },
  {
    href: "/admin/newsletters",
    label: "Newsletter",
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="m2 7 10 6 10-6" />
      </>
    ),
  },
  {
    /* Under Newsletter and above Subscribers: the three of them are what the
       site sends, and this is the one she sets once and rarely opens again —
       the letter is written monthly, the list changes weekly, the wording on a
       confirmation is looked at when something about it reads wrong. */
    href: "/admin/email-templates",
    label: "Email templates",
    icon: (
      <>
        <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M15 4v5h5" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),
  },
  {
    href: "/admin/subscribers",
    label: "Subscribers",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.9 13.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.2-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
      </>
    ),
  },
];
