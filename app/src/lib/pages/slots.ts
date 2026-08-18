import { home } from "@/content/home";

/**
 * WHAT IS EDITABLE ON THE SEVEN ORIGINAL BEATS, and what to call it.
 *
 * The keys are the dotted paths already marked with `data-slot` through
 * `app/(site)/page.tsx` — they were planted when the page was ported from the
 * approved mockup, for exactly this (D-3). The editor does not need a list of
 * them to WORK: it makes every `[data-slot]` on the rendered page selectable,
 * so the page itself is the index. What this file adds is the two things the
 * DOM cannot say — what to call a slot in a sentence she would use, and what
 * kind of field to put in front of it.
 *
 * A SLOT MISSING FROM THIS TABLE IS A SLOT WITH NO EDITOR, which is a bug
 * rather than a policy; `pages-smoke` walks the rendered page and fails if any
 * `data-slot` on it is unknown here.
 */

/** How to edit it, which is the only styling decision she is offered. */
export type SlotShape =
  /** One short line. A single-line field. */
  | "line"
  /** Prose. A textarea. */
  | "prose"
  /** Several lines, set as a run of spans — one per line typed. */
  | "lines"
  /** Several parts on one line, divided by a middot on the page. */
  | "parts"
  /** A label and where it goes. Two fields. */
  | "link";

export type TextSlot = {
  key: string;
  beat: BeatKey;
  shape: SlotShape;
  /** What she is looking at, said as she would say it. */
  label: string;
  /** One line under the field when the slot needs it. */
  hint?: string;
};

export type PictureSlot = {
  key: string;
  beat: BeatKey;
  label: string;
  hint?: string;
};

export type BeatKey =
  "root" | "sacral" | "method" | "throat" | "schedule" | "turn" | "crown";

/**
 * The seven, in the order they were composed in.
 *
 * This is the SEED order. Once a page has been opened in the editor its order
 * lives in `PageSection.position`, because she can now put a section of her own
 * between any two of them (D-34).
 */
export const BEATS: { key: BeatKey; label: string; note: string }[] = [
  {
    key: "root",
    label: "The opening",
    note: "The photograph, the three lines and the first link. What somebody sees before they have decided anything.",
  },
  {
    key: "sacral",
    label: "The hour",
    note: "What the hour is like, told from inside the chair.",
  },
  {
    key: "method",
    label: "The four words",
    note: "Clearing, charging, repairing, restructuring — standing on their own in the light.",
  },
  {
    key: "throat",
    label: "What this is not, and who you are",
    note: "The three refusals, and your portrait beside them.",
  },
  {
    key: "schedule",
    label: "What is on",
    note: "The three columns of dates and prices. The rows come from Offerings and are not edited here.",
  },
  {
    key: "turn",
    label: "Before and after",
    note: "The one paragraph about the person who waited six months.",
  },
  {
    key: "crown",
    label: "The letter",
    note: "The last beat, where somebody who is not ready is asked for an address instead of an hour.",
  },
];

export const BEAT_KEYS = BEATS.map((beat) => beat.key);

/** True of the seven; false of anything she has added. */
export function isBeatKey(value: string): value is BeatKey {
  return (BEAT_KEYS as string[]).includes(value);
}

export const TEXT_SLOTS: TextSlot[] = [
  // ── the opening ────────────────────────────────────────────────────────
  {
    key: "root.eyebrow",
    beat: "root",
    shape: "parts",
    label: "The small gold line",
    hint: "Three parts, divided by a dot on the page. One per line here.",
  },
  {
    key: "root.lines",
    beat: "root",
    shape: "lines",
    label: "The opening lines",
    hint: "One per line. Each gets its own line on the page, at the largest size on the site.",
  },
  {
    key: "root.note",
    beat: "root",
    shape: "line",
    label: "The line under them",
  },
  { key: "root.link", beat: "root", shape: "link", label: "The first link" },

  // ── the hour ───────────────────────────────────────────────────────────
  {
    key: "sacral.eyebrow",
    beat: "sacral",
    shape: "line",
    label: "The small gold line",
  },
  {
    key: "sacral.lead",
    beat: "sacral",
    shape: "line",
    label: "The opening sentence",
  },
  {
    key: "sacral.onPlateBody",
    beat: "sacral",
    shape: "prose",
    label: "The words on the photograph",
  },
  {
    key: "sacral.poolBody",
    beat: "sacral",
    shape: "prose",
    label: "The words in the box",
  },
  {
    key: "sacral.note",
    beat: "sacral",
    shape: "line",
    label: "The line under them",
  },
  { key: "sacral.link", beat: "sacral", shape: "link", label: "The link" },

  // ── the four words ─────────────────────────────────────────────────────
  {
    key: "method.verbs",
    beat: "method",
    shape: "lines",
    label: "The words",
    hint: "One per line. They are the whole of this beat — there is nothing else in it.",
  },

  // ── what this is not, and who you are ──────────────────────────────────
  {
    key: "throat.eyebrow",
    beat: "throat",
    shape: "line",
    label: "The small gold line",
  },
  {
    key: "throat.negations",
    beat: "throat",
    shape: "lines",
    label: "The refusals",
    hint: "One per line.",
  },
  {
    key: "throat.portraitEyebrow",
    beat: "throat",
    shape: "line",
    label: "The small line over your portrait",
  },
  {
    key: "throat.portraitLead",
    beat: "throat",
    shape: "line",
    label: "The sentence beside your portrait",
  },
  {
    key: "throat.portraitBody",
    beat: "throat",
    shape: "prose",
    label: "What it says about you",
  },
  {
    key: "throat.credential",
    beat: "throat",
    shape: "prose",
    label: "Your training",
    hint: "No years and no named qualification unless you have confirmed one — brief §20.1.",
  },

  // ── what is on ─────────────────────────────────────────────────────────
  {
    key: "schedule.eyebrow",
    beat: "schedule",
    shape: "line",
    label: "The small gold line",
  },
  {
    key: "schedule.lead",
    beat: "schedule",
    shape: "line",
    label: "The heading",
  },
  {
    key: "schedule.intro",
    beat: "schedule",
    shape: "prose",
    label: "The paragraph under it",
    hint: "The dates and prices below this come from Offerings and cannot be typed here.",
  },

  // ── before and after ───────────────────────────────────────────────────
  { key: "turn.eyebrow", beat: "turn", shape: "line", label: "The heading" },
  { key: "turn.body", beat: "turn", shape: "prose", label: "The paragraph" },
  { key: "turn.close", beat: "turn", shape: "line", label: "The closing line" },

  // ── the letter ─────────────────────────────────────────────────────────
  { key: "crown.ask", beat: "crown", shape: "line", label: "The heading" },
  {
    key: "crown.lines",
    beat: "crown",
    shape: "lines",
    label: "What the letter is",
    hint: "One paragraph per line.",
  },
];

export const PICTURE_SLOTS: PictureSlot[] = [
  { key: "root.plate", beat: "root", label: "The opening photograph" },
  { key: "sacral.plate", beat: "sacral", label: "The photograph" },
  { key: "method.plate", beat: "method", label: "The photograph" },
  { key: "throat.plate", beat: "throat", label: "The photograph" },
  {
    key: "throat.portrait",
    beat: "throat",
    label: "Your portrait",
    hint: "The one circle on the site. A face near the middle of the frame works best.",
  },
  { key: "schedule.plate", beat: "schedule", label: "The photograph" },
  { key: "turn.plate", beat: "turn", label: "The photograph" },
];

const TEXT_BY_KEY = new Map(TEXT_SLOTS.map((slot) => [slot.key, slot]));
const PICTURE_BY_KEY = new Map(PICTURE_SLOTS.map((slot) => [slot.key, slot]));

export const textSlot = (key: string) => TEXT_BY_KEY.get(key) ?? null;
export const pictureSlot = (key: string) => PICTURE_BY_KEY.get(key) ?? null;

/**
 * WHAT THE PAGE SAYS BEFORE SHE HAS TOUCHED IT.
 *
 * Read straight off `src/content/home.ts`, which stays the authored default —
 * the database holds only what she has CHANGED (see `PageText` in the schema).
 * Three things come out of that: an empty database renders the page that was
 * signed off on, a field added in code appears without a migration, and "put it
 * back to how it was" is a delete.
 */
export function seededText(key: string): string {
  switch (key) {
    case "root.eyebrow":
      return [
        home.root.eyebrowLead,
        home.root.eyebrowMid,
        home.root.eyebrowEnd,
      ].join("\n");
    case "root.lines":
      return home.root.lines.join("\n");
    case "root.note":
      return home.root.note;
    case "root.link":
      return `${home.root.linkLabel}\n${home.root.linkHref}`;

    case "sacral.eyebrow":
      return home.sacral.eyebrow;
    case "sacral.lead":
      return home.sacral.lead;
    case "sacral.onPlateBody":
      return home.sacral.onPlateBody;
    case "sacral.poolBody":
      return home.sacral.poolBody;
    case "sacral.note":
      return home.sacral.note;
    case "sacral.link":
      return `${home.sacral.linkLabel}\n${home.sacral.linkHref}`;

    case "method.verbs":
      return home.method.verbs.join("\n");

    case "throat.eyebrow":
      return home.throat.eyebrow;
    case "throat.negations":
      return home.throat.negations.join("\n");
    case "throat.portraitEyebrow":
      return home.throat.portraitEyebrow;
    case "throat.portraitLead":
      return home.throat.portraitLead;
    case "throat.portraitBody":
      return home.throat.portraitBody;
    case "throat.credential":
      return home.throat.credential;

    case "schedule.eyebrow":
      return home.schedule.eyebrow;
    case "schedule.lead":
      return home.schedule.lead;
    case "schedule.intro":
      return home.schedule.intro;

    case "turn.eyebrow":
      return home.turn.eyebrow;
    case "turn.body":
      return home.turn.body;
    case "turn.close":
      return home.turn.close;

    case "crown.ask":
      return home.crown.ask;
    case "crown.lines":
      return home.crown.lines.join("\n");

    default:
      return "";
  }
}

export type SeededPicture = {
  ref: string;
  alt: string;
  brightness: number | null;
  focalX: string | null;
  focalY: string | null;
};

export function seededPicture(key: string): SeededPicture | null {
  const plate = (value: {
    src: string;
    alt: string;
    b: number;
    ox: string;
    oy: string;
  }): SeededPicture => ({
    ref: value.src,
    alt: value.alt,
    brightness: value.b,
    focalX: value.ox,
    focalY: value.oy,
  });

  switch (key) {
    case "root.plate":
      return plate(home.root.plate);
    case "sacral.plate":
      return plate(home.sacral.plate);
    case "method.plate":
      return plate(home.method.plate);
    case "throat.plate":
      return plate(home.throat.plate);
    case "schedule.plate":
      return plate(home.schedule.plate);
    case "turn.plate":
      return plate(home.turn.plate);
    // The portrait is not a plate: it is the one true circle in the system and
    // has no brightness or focal point of its own.
    case "throat.portrait":
      return {
        ref: home.throat.portrait.src,
        alt: home.throat.portrait.alt,
        brightness: null,
        focalX: null,
        focalY: null,
      };
    default:
      return null;
  }
}
