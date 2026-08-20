import type {
  PageAnchor,
  PageBlockKind,
  PageItemKind,
  PageItemTone,
  PagePictureShape,
  PageState,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  BEATS,
  type BeatKey,
  isBeatKey,
  seededPicture,
  seededText,
} from "./slots";

/**
 * READING A PAGE, in one of its two copies.
 *
 * The public site reads `live`; the editor reads `draft`. Nothing else chooses,
 * and no caller passes a string — the state is the argument, so a page cannot
 * accidentally be served from the copy she is halfway through changing.
 *
 * THE SEED IS THE DEFAULT AND THE DATABASE HOLDS OVERRIDES. `src/content/home.ts`
 * is still the page as authored; a row exists here only where she has changed
 * something. That is why the site renders correctly against an empty database,
 * and why "put it back" is a delete rather than a copy of an original kept
 * somewhere else.
 */

export const HOME = "home";

// ── what a resolved page looks like ──────────────────────────────────────────

export type Picture = {
  ref: string;
  alt: string;
  brightness: number | null;
  focalX: string | null;
  focalY: string | null;
};

export type ResolvedItem = {
  id: number;
  kind: PageItemKind;
  /** Steps bigger or smaller than this kind of line is set at. 0 is authored. */
  size: number;
  /** Which edge this one line is set to. Null follows the box it is in. */
  align: PageAnchor | null;
  /** Which accent colour it is in. `auto` is whatever the ground gives it. */
  tone: PageItemTone;
  /** heading / paragraph / eyebrow / button / link: the words. */
  text: string;
  /** bullets: the same words, already split. */
  lines: string[];
  href: string | null;
};

export type ResolvedBlock = {
  id: number;
  kind: PageBlockKind;
  placement: PageAnchor;
  picture: { ref: string; alt: string } | null;
  /** picture only: the frame it is cut to, and what stays in frame. */
  shape: PagePictureShape;
  focusX: number;
  focusY: number;
  items: ResolvedItem[];
};

/** One of the seven, carrying its resolved words and pictures. */
export type ResolvedBeat = {
  id: number;
  kind: "beat";
  beatKey: BeatKey;
  hidden: boolean;
  /** Every text slot on this beat, keyed by its dotted path. */
  text: Record<string, string>;
  /** Every picture slot on this beat, keyed by its dotted path. */
  pictures: Record<string, Picture>;
  /** Steps bigger or smaller, per text slot. Absent means 0, which is authored. */
  sizes: Record<string, number>;
};

/** One she made. */
export type ResolvedFree = {
  id: number;
  kind: "free";
  hidden: boolean;
  picture: { ref: string; alt: string } | null;
  /** Where in the photograph the band is looking, top to bottom, 0–100. */
  focusY: number;
  /** Steps taller than the band sets itself, 0–6. */
  tall: number;
  blocks: ResolvedBlock[];
};

export type ResolvedSection = ResolvedBeat | ResolvedFree;

export type ResolvedPage = {
  page: string;
  state: PageState;
  sections: ResolvedSection[];
};

// ── reading ──────────────────────────────────────────────────────────────────

/** One line typed per line wanted, and no empty ones. */
export function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * A link slot is a label and a target, kept in one string with the target on
 * the second line — one row rather than two, and one field group in the editor.
 */
export function splitLink(value: string): { label: string; href: string } {
  const [label = "", href = ""] = value.split("\n");
  return { label: label.trim(), href: href.trim() };
}

function resolveBeat(
  beatKey: BeatKey,
  id: number,
  hidden: boolean,
  texts: Map<string, string>,
  pictures: Map<string, Picture>,
  sizes: Map<string, number>,
): ResolvedBeat {
  const text: Record<string, string> = {};
  const pics: Record<string, Picture> = {};
  const steps: Record<string, number> = {};

  for (const [key, value] of texts) {
    if (key.startsWith(`${beatKey}.`)) text[key] = value;
  }
  for (const [key, value] of pictures) {
    if (key.startsWith(`${beatKey}.`)) pics[key] = value;
  }
  for (const [key, value] of sizes) {
    if (key.startsWith(`${beatKey}.`)) steps[key] = value;
  }

  return {
    id,
    kind: "beat",
    beatKey,
    hidden,
    text,
    pictures: pics,
    sizes: steps,
  };
}

/**
 * Read one copy of one page.
 *
 * Four queries and no joins across the beat side, because the beat overrides
 * are two flat key/value tables and the page has at most a few dozen rows in
 * each. The sections and their blocks come back in one nested read.
 */
export async function readPage(
  page: string,
  state: PageState,
): Promise<ResolvedPage> {
  const [sectionRows, textRows, pictureRows] = await Promise.all([
    prisma.pageSection.findMany({
      where: { page, state },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: {
        blocks: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
        },
      },
    }),
    prisma.pageText.findMany({ where: { page, state } }),
    prisma.pagePicture.findMany({ where: { page, state } }),
  ]);

  const texts = new Map(textRows.map((row) => [row.key, row.value]));
  const sizes = new Map(textRows.map((row) => [row.key, row.size]));
  const pictures = new Map<string, Picture>(
    pictureRows.map((row) => [
      row.key,
      {
        ref: row.ref,
        alt: row.alt,
        brightness: row.brightness,
        focalX: row.focalX,
        focalY: row.focalY,
      },
    ]),
  );

  if (sectionRows.length === 0) {
    // Never opened. The seven, as composed — with any stray overrides still
    // applied, which is the honest reading of a half-written database.
    return {
      page,
      state,
      sections: BEATS.map((beat, index) =>
        resolveBeat(beat.key, -(index + 1), false, texts, pictures, sizes),
      ),
    };
  }

  const sections: ResolvedSection[] = [];

  for (const row of sectionRows) {
    if (row.kind === "beat") {
      // A row whose beatKey is not one of the seven is a beat that was renamed
      // or removed in code. It is skipped rather than crashed on: the page
      // survives a rename, and the orphan row is cleared by the next publish.
      if (!row.beatKey || !isBeatKey(row.beatKey)) continue;
      sections.push(
        resolveBeat(row.beatKey, row.id, row.hidden, texts, pictures, sizes),
      );
      continue;
    }

    sections.push({
      id: row.id,
      kind: "free",
      hidden: row.hidden,
      picture:
        row.imageRef === null
          ? null
          : { ref: row.imageRef, alt: row.imageAlt ?? "" },
      focusY: row.focusY,
      tall: row.tall,
      blocks: row.blocks.map((block) => ({
        id: block.id,
        kind: block.kind,
        placement: block.placement,
        picture:
          block.imageRef === null
            ? null
            : { ref: block.imageRef, alt: block.imageAlt ?? "" },
        shape: block.shape,
        focusX: block.focusX,
        focusY: block.focusY,
        items: block.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          size: item.size,
          align: item.align,
          tone: item.tone,
          text: item.text ?? "",
          lines: splitLines(item.text ?? ""),
          href: item.href,
        })),
      })),
    });
  }

  // A BEAT MISSING FROM THE ROWS IS STILL ON THE PAGE. Rows are written the
  // first time she saves, and a beat added in code afterwards has none — so it
  // is appended rather than silently dropped. The seven are the site's spine;
  // the absence of a row is not an instruction to remove one.
  const present = new Set(
    sections.filter((s) => s.kind === "beat").map((s) => s.beatKey),
  );
  for (const beat of BEATS) {
    if (present.has(beat.key)) continue;
    sections.push(resolveBeat(beat.key, -1, false, texts, pictures, sizes));
  }

  return { page, state, sections };
}

// ── reading one value ────────────────────────────────────────────────────────

/**
 * The words in a slot: what she saved, or what was authored.
 *
 * Every beat's renderer goes through this, so there is exactly one place where
 * "the database wins, and the seed is what it falls back to" is decided.
 */
export function textOf(beat: ResolvedBeat, key: string): string {
  const saved = beat.text[key];
  return saved !== undefined && saved !== "" ? saved : seededText(key);
}

export function linesOf(beat: ResolvedBeat, key: string): string[] {
  return splitLines(textOf(beat, key));
}

export function linkOf(beat: ResolvedBeat, key: string) {
  return splitLink(textOf(beat, key));
}

/**
 * The picture in a slot.
 *
 * The three numbers fall back FIELD BY FIELD rather than all together: swapping
 * a photograph without saying how bright it should be leaves the composition's
 * own dimming in place, which is nearly always what she meant.
 */
/** Steps bigger or smaller than the composition set this slot at. */
export function sizeOf(beat: ResolvedBeat, key: string): number {
  return beat.sizes[key] ?? 0;
}

export function pictureOf(beat: ResolvedBeat, key: string): Picture {
  const seed = seededPicture(key);
  const saved = beat.pictures[key];
  if (!saved) {
    return (
      seed ?? { ref: "", alt: "", brightness: null, focalX: null, focalY: null }
    );
  }
  return {
    ref: saved.ref,
    alt: saved.alt,
    brightness: saved.brightness ?? seed?.brightness ?? null,
    focalX: saved.focalX ?? seed?.focalX ?? null,
    focalY: saved.focalY ?? seed?.focalY ?? null,
  };
}
