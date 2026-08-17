/**
 * The canonical origin. Every absolute URL the app emits — canonical tags,
 * social-share previews, the sitemap, and the links inside emails — is built
 * from this one value, so there is exactly one place to change it.
 *
 * The default is the real domain rather than a placeholder: if the env var is
 * ever missing in production, the site falls back to being correct instead of
 * quietly advertising a replit.app address to Google. NEXT_PUBLIC_SITE_URL
 * overrides it for previews and local work.
 *
 * That override is also what tells one deployment from another, which is why
 * the real domain is named separately below rather than left inline: the Stripe
 * webhook compares the two to decide whether a payment was made here or on a
 * preview sharing the same Stripe account (D-19).
 */
export const CANONICAL_SITE_URL = "https://thefieldwork.co.uk";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? CANONICAL_SITE_URL;

/**
 * The five public sections, in the order every masthead carries them.
 *
 * One list rather than one per section, because two lists had already drifted:
 * the home page carried five in-page anchors and the workshops, courses and
 * services pages carried four links to elsewhere, so moving from the home page
 * into a workshop changed the tabs under the visitor (2026-08-15).
 *
 * The first three are the three kinds of offering, each with its own index.
 *
 * ABOUT POINTS AT /about AGAIN (2026-08-17). It stood at `/#not` — the beat of
 * the home page where her portrait and what she has trained in sit — for the
 * fortnight in which /about was an approved screen that had not been built,
 * because a shorter real answer beats a nav entry that 404s. The page exists
 * now, so the tab does what it says and the standing note that this would
 * "revert to /about and nothing else changes" is discharged.
 *
 * CONTACT IS NEW, and it is the fifth. `.site-head__nav` wraps, so five entries
 * drop to a second row rather than overflowing; below 760px the whole nav is
 * already under the mark. There is no menu button on this site and never was —
 * a hidden nav would leave a phone with no way out of an interior page.
 *
 * The label reads Services because that is what the operator calls the section
 * (2026-08-15); the page's own copy still calls the thing a session.
 */
export const siteNav = [
  { label: "Workshops", href: "/workshops" },
  { label: "Courses", href: "/courses" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * The footer, which is the home page's footer on every page (2026-08-15).
 *
 * WHY THE HREFS LOOK LIKE THIS. These columns were written for the home page,
 * where an in-page anchor like `#the-hour` works and where four of the entries
 * pointed at pages — /about, /contact, /subscribe, /privacy — that have never
 * been built. On the home page alone that was one page carrying four dead
 * links. Putting this footer on every page would have put four dead links
 * under every workshop, every course, and both of the pages where somebody is
 * part-way through paying. So, without inventing any page:
 *
 *  - the three in-page anchors are now root-relative (`/#the-hour`), so they
 *    work from a workshop page rather than silently doing nothing;
 *  - "Ask a question" went to `/#ask`, the beat that asked for an hour. That
 *    beat now asks for an email address instead (2026-08-16 — see
 *    content/home.ts::crown), so the anchor no longer meant what the label
 *    promised. It was sent to /services as the nearest true destination, with
 *    a note that this read as a repetition of "One-to-one sessions" above it
 *    and was one. IT NOW GOES TO /contact (2026-08-17), which is literally
 *    where somebody asks a question, and the repetition is gone;
 *  - "Monthly letter" now goes to /subscribe, which was built on 2026-08-16;
 *  - "Who she is" NOW GOES TO /about (2026-08-17). It carried no href for the
 *    fortnight in which /about did not exist and rendered as plain text, which
 *    is what the note here said would happen and what would be undone the day
 *    the page was built. It has been;
 *  - "Privacy" NOW GOES TO /privacy (2026-08-17), and it is the last of the
 *    four to get its href back. It was the one entry left rendering as plain
 *    text, on the standing note that a §14 obligation wants a real page rather
 *    than an empty route to satisfy a link. The page is written — from what
 *    this app actually does with people's details, see content/privacy.ts —
 *    so the entry is a link, the wording is unchanged exactly as the note
 *    promised, and nothing else changes.
 *
 * EVERY ENTRY NOW CARRIES AN HREF, and `.site-foot__soon` in site-chrome.css
 * consequently has nothing left to style. Both it and the href-less branch in
 * `SiteFooter` are KEPT rather than deleted: `href` stays optional on the type
 * below, so the next entry added before its page exists renders as the honest
 * dimmed word instead of a link to a 404. The mechanism is idle, not dead.
 */
export const siteFooter = {
  /** The altar in low light, behind the whole band at 38% brightness. */
  plate: { src: "marianne-altar-light", alt: "" },

  cols: [
    {
      heading: "The work",
      links: [
        { label: "What the hour is like", href: "/#the-hour" },
        { label: "The four verbs", href: "/#method" },
        { label: "What this is not", href: "/#not" },
        { label: "Who she is", href: "/about" },
      ],
    },
    {
      heading: "Dates",
      links: [
        { label: "Courses", href: "/courses" },
        { label: "Workshops", href: "/workshops" },
        { label: "One-to-one sessions", href: "/services" },
      ],
    },
    {
      heading: "Practicalities",
      links: [
        { label: "Ask a question", href: "/contact" },
        { label: "Monthly letter", href: "/subscribe" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ] as readonly {
    heading: string;
    links: readonly { label: string; href?: string }[];
  }[],

  /**
   * The name and the place. It is the one thing the interior pages' old footer
   * line carried that the home page's footer did not, and dropping it when the
   * two merged would have taken the practice's location off eight pages.
   */
  place: "The Field Work · Frome, Somerset",

  /** §14 compliance surface — this wording is load-bearing, not decorative. */
  legal:
    "Complementary work. Not a substitute for medical care, and never a reason to delay it. Nothing here treats, cures, diagnoses or prevents any condition.",
} as const;
