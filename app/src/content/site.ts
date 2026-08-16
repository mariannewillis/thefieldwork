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
 * The four public sections, in the order every masthead carries them.
 *
 * One list rather than one per section, because two lists had already drifted:
 * the home page carried five in-page anchors and the workshops, courses and
 * services pages carried four links to elsewhere, so moving from the home page
 * into a workshop changed the tabs under the visitor (2026-08-15).
 *
 * The first three are the three kinds of offering, each with its own index.
 * About has no page yet — /about is an approved screen that has not been built
 * — so until it is, it goes to the beat of the home page that introduces her
 * (`#not`, where her portrait and what she has trained in sit). That is a
 * shorter answer to "who is this person" than the page will eventually give,
 * and it is a real one; a nav entry that 404s is not. When /about is built this
 * reverts to `/about` and nothing else changes.
 *
 * The label reads Services because that is what the operator calls the section
 * (2026-08-15); the page's own copy still calls the thing a session.
 */
export const siteNav = [
  { label: "Workshops", href: "/workshops" },
  { label: "Courses", href: "/courses" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/#not" },
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
 *    content/home.ts::crown), so the anchor no longer means what the label
 *    promises. It goes to /services, which is where somebody actually asks
 *    for an hour: the index names each session, and each session's page
 *    carries the form. "One-to-one sessions" above points there too, which
 *    reads as a repetition and is one — but a label that goes where it says
 *    beats a label that goes somewhere unrelated, and /about does not exist
 *    to take it instead;
 *  - "Monthly letter" now goes to /subscribe, which was built on 2026-08-16;
 *  - "Who she is" and "Privacy" still have NO destination that exists, so
 *    they carry no href and render as plain text. The wording stays, so the
 *    day /about and /privacy are built each one gets its href back and
 *    nothing else changes.
 *
 * "Who she is" could have gone to `/#not` like the About tab does, but that is
 * the same beat "What this is not" already links to one line above it, and two
 * entries landing in the same place reads as a bug.
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
        { label: "Who she is" },
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
        { label: "Ask a question", href: "/services" },
        { label: "Monthly letter", href: "/subscribe" },
        { label: "Privacy" },
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
