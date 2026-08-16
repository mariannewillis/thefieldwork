/**
 * Home page content — the editable surface.
 *
 * Per docs/DECISIONS-BUILD.md D-3: every string and every image on the home
 * page is a CONTENT VALUE with a seeded default, not a hardcoded literal.
 * These are the seeds. When the portal lands (D-2) they become rows in
 * `landing_section` / `landing_section_draft` and this module becomes the
 * seeder — the page component does not change.
 *
 * WHAT IS EDITABLE: eyebrow, headings, body copy, link labels/targets, and
 * the image in each beat (plus its alt text and focal point).
 *
 * WHAT IS NOT (fixed by §12 and the direction): the beat ORDER, the layout,
 * the alternating left/right anchor, the type scale, the palette, and the
 * shape law. The seven beats cannot be added to, deleted or reordered — §5
 * "The admin is not a CMS. Configurable content, fixed design."
 *
 * Beats 2-6 may be hidden; ROOT and CROWN are structural and always visible.
 */

/** A photographic plate: the image behind a beat, with its focal point. */
export type Plate = {
  /** basename under /media — the pipeline emits -2400/-1200 in avif/webp/jpg */
  src: string;
  alt: string;
  /** brightness multiplier the composition was tuned at */
  b: number;
  /** object-position x/y — where the subject sits once the plate is cropped */
  ox: string;
  oy: string;
};

export type LedgerRow = {
  href: string;
  date: string;
  price: string;
  title: string;
  meta: string;
};

/**
 * One of the three columns in the products block.
 *
 * The rows are NOT here. All three kinds are read from the database now, so
 * what this file carries is the frame around them: the column's name, where it
 * goes, and what it says on the months when she has none of that kind — which
 * for a practitioner running a course twice a year is most months.
 */
export type LedgerGroup = {
  label: string;
  /** The index this column is a sample of, and the way out of an empty one. */
  href: string;
  empty: string;
  emptyLink: string;
};

export const home = {
  root: {
    id: "what-happens",
    hidden: false,
    structural: true,
    plate: {
      src: "work-wide-the-room",
      alt: "A woman stands over a client resting under a white cover, her hands hovering with a clear gap above him; her own room — a bookshelf, a plant, a window — sits in shadow behind them.",
      b: 0.52,
      ox: "46%",
      oy: "40%",
    } satisfies Plate,
    eyebrowLead: "Aura healing",
    eyebrowMid: "hands-off",
    eyebrowEnd: "one hour",
    /** three lines, set as three spans — the hero's type IS the composition */
    lines: [
      "You keep your clothes on.",
      "Nobody touches you.",
      "Nothing is asked of your beliefs.",
    ],
    note: "Nothing crosses this edge.",
    linkLabel: "Read what the hour is like",
    linkHref: "#the-hour",
  },

  sacral: {
    id: "the-hour",
    hidden: false,
    plate: {
      src: "marianne-room-aglow",
      alt: "Her attic practice room at dusk: a warm pool of lamplight lying across the kilim, no one in the frame.",
      b: 0.5,
      ox: "58%",
      oy: "54%",
    } satisfies Plate,
    eyebrow: "The hour, from inside the chair",
    lead: "You sit down. Nothing else is required of you.",
    onPlateBody:
      "You arrive with your coat on and you can keep it on. There is a chair, a lamp turned low, and a person who works in the air a little way above your shoulders, your head and your hands. She does not touch you at any point.",
    poolBody:
      "Some describe warmth, some a heaviness in the arms, some notice very little and say so afterwards — that is an ordinary report, not a failure. It takes an hour, and you go home after with a large glass of water.",
    note: "No music, no oils, no incense. Nothing to lie down on unless you would rather.",
    linkLabel: "See what's on this month",
    linkHref: "#dates",
  },

  method: {
    id: "method",
    hidden: false,
    plate: {
      src: "aura-seated-figure",
      alt: "A woman sits cross-legged on bare floorboards, seen from behind, silhouetted against a tall arch of gold and magenta light.",
      b: 0.58,
      ox: "62%",
      oy: "50%",
    } satisfies Plate,
    /** the four verbs — type as the entire content of the light */
    verbs: ["Clearing.", "Charging.", "Repairing.", "Restructuring."],
  },

  throat: {
    id: "not",
    hidden: false,
    plate: {
      src: "work-close-hands",
      alt: "Close on her two hands hovering above a client under a white cover — the shadow of her hand falls on the cover beneath, the gap plainly visible.",
      b: 0.32,
      ox: "58%",
      oy: "45%",
    } satisfies Plate,
    eyebrow: "What this is not",
    negations: [
      "Not therapy.",
      "Not medicine.",
      "Not a replacement for either.",
    ],
    /** the practitioner enters here — merged into THROAT at the operator's
     *  request so her portrait sits beside the hands you can already see */
    portrait: {
      src: "marianne-portrait-in-the-light",
      alt: "Marianne, lit from behind by a soft ring of gold light falling to plum.",
    },
    portraitEyebrow: "The person whose hands these are",
    portraitLead: "She has sat where you are sitting.",
    portraitBody:
      "On the other side of the same question, in somebody else's quiet room, deciding whether to book and not wanting to ask what it involved. She was not asked to believe anything then, and she does not ask it of you now. That is the hour she runs.",
    /** UNVERIFIED per brief §20.1 — no years, no named qualification. Do not
     *  add a number here without the client confirming it. */
    credential:
      "Trained in aura healing before she taught it, and teaching the same work to other practitioners now.",
  },

  schedule: {
    id: "dates",
    hidden: false,
    plate: {
      src: "window-last-light",
      alt: "A window at dusk, cold blue outside meeting warm gold inside.",
      b: 0.34,
      ox: "56%",
      oy: "45%",
    } satisfies Plate,
    eyebrow: "What is on, with dates and prices",
    lead: "Everything runs here, in three groups, with the date and the price on every line.",
    intro:
      "Courses, workshops and one-to-one sessions, at the same billing. If a date has gone, ask — most of them run again.",
    /** DERIVED, not authored. All three columns are read from the database
     *  (see the products beat in app/(site)/page.tsx). What is here is the
     *  frame: the name of each column, the page it is a sample of, and what
     *  it says on a month when she has none of that kind — which is an
     *  ordinary month rather than a fault. The portal must show the rows as
     *  read-only in editing mode (D-2 open question). */
    groups: [
      {
        label: "Courses",
        href: "/courses",
        empty:
          "No course running just now. One runs two or three times a year, and the dates go up about two months ahead.",
        emptyLink: "The courses page",
      },
      {
        label: "Workshops",
        href: "/workshops",
        empty:
          "Nothing in the diary just now. The next dates usually go up a couple of months ahead.",
        emptyLink: "The workshops page",
      },
      {
        label: "Services",
        href: "/services",
        empty:
          "The one-to-one hours are not listed at the moment. That is not the same as being fully booked.",
        emptyLink: "The sessions page",
      },
    ] satisfies LedgerGroup[],
  },

  turn: {
    hidden: false,
    plate: {
      src: "aura-light-in-a-room",
      alt: "A woman sitting alone in an armchair inside an enormous bloom of warm light that fills the whole room.",
      b: 0.52,
      ox: "50%",
      oy: "72%",
    } satisfies Plate,
    eyebrow: "Six months of imagining it. One hour of it.",
    body: "Before: a practitioner’s contact page open in another tab since March, never once scrolled to the bottom, waiting for a sentence that never came. After: an hour in a chair with her coat over the back of it, and a person who can say exactly what happened and exactly what did not — a good deal less strange than the version she had been carrying around since the spring.",
    close: "Nothing was cured. The bracing for it stopped.",
  },

  /*
   * THE LAST BEAT ASKS FOR AN ADDRESS RATHER THAN FOR AN HOUR (operator,
   * 2026-08-16).
   *
   * It used to read "Ask for an hour" over a link to `#ask` — which was this
   * section's own id, so the one call to action on the home page scrolled to
   * itself and did nothing. The page's ask was already made twice above this
   * beat, on two dates blocks that go straight to the thing being asked for;
   * asking a third time at the bottom was the weakest of the three and the
   * only one with nowhere to go.
   *
   * WHAT REPLACES IT IS NOT A SMALLER ASK, IT IS A SLOWER ONE. Somebody at the
   * foot of this page who was going to book has already booked. What is left
   * is the person who is not ready — six months of reading a contact page is
   * the character this page has been describing since the Turn — and the thing
   * to offer them is not another button that costs ninety pounds. It is a way
   * to stay in the room's company until they are ready, which is what the
   * letter is.
   *
   * The wording follows that: a reason, not an invitation to "sign up for
   * updates". It names what the letter contains and what it costs her to say
   * yes to it, which is nothing.
   */
  crown: {
    id: "letter",
    hidden: false,
    structural: true,
    ask: "Not ready to book anything. That is most people, and it is what the letter is for.",
    /** The lines under the ask, above the form. */
    lines: [
      "Once a month, one page: what is open and when, and whatever the room has actually been like — the chair moved nearer the window, what people have been arriving with this autumn.",
      "It is not a way of asking you again. Nothing is sold to you twice, nothing is passed to anybody else, and every letter carries a link at the bottom that takes you off in one press.",
    ],
    /*
     * The plate, the link columns and the legal paragraph moved to
     * src/content/site.ts on 2026-08-15. This footer is now the whole site's
     * footer, not this page's — see siteFooter there, including why three of
     * its entries no longer carry an href.
     */
  },
} as const;

export type HomeContent = typeof home;
