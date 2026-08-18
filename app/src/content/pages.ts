/**
 * EVERY PAGE ON THE SITE, and which of them she can edit yet.
 *
 * The panel lists all of them (operator, 2026-08-18). The six that are not
 * wired say so plainly rather than opening onto an editor that half-works —
 * D-9, the portal shows no state it cannot read. A page missing from this list
 * would be a page she cannot find, so this is the list rather than a scan of
 * the routes directory: the routes directory also contains `/pay/<token>` and
 * `/unsubscribe`, which are not pages anybody edits.
 *
 * `editable` is the only field the panel branches on. When a page is wired, its
 * entry flips and it gets a `/admin/pages/<key>` route; nothing else changes.
 */

export type SitePage = {
  /** The `page` column on every content row, and the last part of the URL. */
  key: string;
  /** Where it is on the site. */
  href: string;
  /** What she calls it. */
  label: string;
  /** One line about what it is for, so the list is readable rather than a menu. */
  note: string;
  editable: boolean;
  /**
   * Where its words live while it is not editable, said plainly. A page that
   * cannot be edited here can still be changed — by a developer, in a file —
   * and saying which file is more use than saying "coming soon".
   */
  authoredIn?: string;
};

export const SITE_PAGES: SitePage[] = [
  {
    key: "home",
    href: "/",
    label: "Home",
    note: "The front page. Seven sections as it was composed, and as many of your own as you like between them.",
    editable: true,
  },
  {
    key: "about",
    href: "/about",
    label: "About",
    note: "Who you are and what the work is.",
    editable: false,
    authoredIn: "src/content/about.ts",
  },
  {
    key: "contact",
    href: "/contact",
    label: "Contact",
    note: "How somebody reaches you, and what happens when they do.",
    editable: false,
    authoredIn: "src/content/contact.ts",
  },
  {
    key: "services",
    href: "/services",
    label: "Sessions",
    note: "The one-to-one hours. The sessions themselves are edited in Offerings; this is the words around them.",
    editable: false,
    authoredIn: "src/content/services.ts",
  },
  {
    key: "courses",
    href: "/courses",
    label: "Courses",
    note: "The courses index. The courses themselves are edited in Offerings.",
    editable: false,
    authoredIn: "src/content/courses.ts",
  },
  {
    key: "workshops",
    href: "/workshops",
    label: "Workshops",
    note: "The workshops index. The workshops themselves are edited in Offerings.",
    editable: false,
    authoredIn: "src/content/workshops.ts",
  },
  {
    key: "privacy",
    href: "/privacy",
    label: "Privacy",
    note: "What the site does with people's information. Changing this is a legal statement, not a piece of copy.",
    editable: false,
    authoredIn: "src/content/privacy.ts",
  },
];

export const sitePage = (key: string) =>
  SITE_PAGES.find((page) => page.key === key) ?? null;
