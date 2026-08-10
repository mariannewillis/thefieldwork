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
    /** DERIVED, not authored: once the offerings module lands these come from
     *  the database, not this file. The portal must show them as read-only in
     *  editing mode (D-2 open question). */
    groups: [
      {
        label: "Courses",
        rows: [
          {
            href: "/courses/aura-healing-foundations",
            date: "15 Sep–20 Oct",
            price: "£480",
            title: "Aura Healing: Foundations",
            meta: "Six evenings, 19:00–21:00, Tuesdays · Garden room · 6 places",
          },
          {
            href: "/courses/aura-healing-practitioner-pathway",
            date: "7 Nov–12 Dec",
            price: "£650",
            title: "Aura Healing: Practitioner Pathway",
            meta: "Six Saturdays, 10:00–16:00 · Garden room · 6 places",
          },
          {
            href: "/courses/working-with-the-field-evening-series",
            date: "From 21 Oct",
            price: "£320",
            title: "Working with the Field: An Evening Series",
            meta: "Four evenings, 19:00–21:00, Wednesdays · Garden room · 8 places",
          },
        ] satisfies LedgerRow[],
      },
      {
        label: "Workshops",
        rows: [
          {
            href: "/workshops/the-hour-explained",
            date: "Sat 26 Sep",
            price: "£45",
            title: "The Hour, Explained",
            meta: "10:00–13:00 · Garden room · 12 places",
          },
          {
            href: "/workshops/reading-the-field",
            date: "Sat 24 Oct",
            price: "£95",
            title: "Reading the Field",
            meta: "10:00–16:00 · Garden room · 10 places",
          },
          {
            href: "/workshops/grounding-for-beginners",
            date: "Sat 14 Nov",
            price: "£35",
            title: "Grounding for Beginners",
            meta: "10:00–13:00 · Garden room · 12 places",
          },
        ] satisfies LedgerRow[],
      },
      {
        label: "Services",
        rows: [
          {
            href: "/services/first-session",
            date: "By arrangement",
            price: "£95",
            title: "First session, with time to ask",
            meta: "90 minutes · Garden room · clothed and seated throughout",
          },
          {
            href: "/services/one-to-one-session",
            date: "By arrangement",
            price: "£75",
            title: "One-to-one session",
            meta: "60 minutes · Garden room · for anyone who has been before",
          },
          {
            href: "/services/follow-up-session",
            date: "By arrangement",
            price: "£60",
            title: "Follow-up session",
            meta: "45 minutes · Garden room · booked after a first visit",
          },
        ] satisfies LedgerRow[],
      },
    ],
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

  crown: {
    id: "ask",
    hidden: false,
    structural: true,
    ask: "Ask for an hour in the clearing, where nothing has crossed the edge since the first page you read.",
    ctaLabel: "Ask for an hour",
    ctaHref: "#ask",
    footPlate: {
      src: "marianne-altar-light",
      alt: "",
    },
    footCols: [
      {
        heading: "The work",
        links: [
          { label: "What the hour is like", href: "#the-hour" },
          { label: "The four verbs", href: "#method" },
          { label: "What this is not", href: "#not" },
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
    ],
    /** §14 compliance surface — this wording is load-bearing, not decorative */
    legal:
      "Complementary work. Not a substitute for medical care, and never a reason to delay it. Nothing here treats, cures, diagnoses or prevents any condition.",
  },

  nav: [
    { label: "What happens", href: "#what-happens", current: true },
    { label: "The hour", href: "#the-hour" },
    { label: "What this is not", href: "#not" },
    { label: "Dates & prices", href: "#dates" },
    { label: "Ask for an hour", href: "#ask" },
  ],
} as const;

export type HomeContent = typeof home;
