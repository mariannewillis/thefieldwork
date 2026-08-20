import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BEATS, type BeatKey, isBeatKey, textSlot, pictureSlot } from "./slots";

/**
 * PUBLISHING — the one moment anything she has done reaches a visitor.
 *
 * D-2's shape, kept when the rest of it was superseded (D-34): she edits the
 * draft, and the live copy is replaced by a copy of the draft in ONE
 * transaction. There is no moment at which half a page is new, and there is no
 * per-section publish — the page was composed as one thing and it goes out as
 * one thing.
 *
 * REPLACE, NOT MERGE. The live rows are deleted and rewritten rather than
 * diffed and patched. A merge would have to decide what to do about a section
 * that exists live and not in the draft, and the answer is always "the draft is
 * what she meant"; doing it by replacement means that answer is structural
 * rather than a rule somebody has to keep right.
 */

// ── what is waiting to go out ────────────────────────────────────────────────

export type PendingChange = {
  /** What she is looking at, in her words. */
  what: string;
  /** Which part of the page it is on. */
  where: string;
};

const BEAT_LABEL = new Map(
  BEATS.map((beat) => [beat.key as string, beat.label]),
);

function whereOf(key: string): string {
  const beat = key.split(".")[0];
  return BEAT_LABEL.get(beat) ?? "The page";
}

/**
 * EVERY CHANGE WAITING TO GO OUT, ITEMISED.
 *
 * D-2 asked for this by name — "one publish action covering everything pending,
 * with the pending set itemised before the irreversible control" — and it is
 * the reason `setText` deletes a row when she types back what was already
 * there. An override table that accumulated copies of the seed would report
 * changes she had not made, and a list that cries wolf is a list she stops
 * reading before pressing the button under it.
 *
 * The comparison is between the two copies as STORED, not as rendered: a slot
 * with no row in either copy is unchanged, and one that differs is named.
 */
export async function pendingChanges(page: string): Promise<PendingChange[]> {
  const [
    draftText,
    liveText,
    draftPictures,
    livePictures,
    draftSections,
    liveSections,
  ] = await Promise.all([
    prisma.pageText.findMany({ where: { page, state: "draft" } }),
    prisma.pageText.findMany({ where: { page, state: "live" } }),
    prisma.pagePicture.findMany({ where: { page, state: "draft" } }),
    prisma.pagePicture.findMany({ where: { page, state: "live" } }),
    prisma.pageSection.findMany({
      where: { page, state: "draft" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: { blocks: { include: { items: true } } },
    }),
    prisma.pageSection.findMany({
      where: { page, state: "live" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: { blocks: { include: { items: true } } },
    }),
  ]);

  const changes: PendingChange[] = [];

  // ── words ──────────────────────────────────────────────────────────────
  const liveByKey = new Map(liveText.map((row) => [row.key, row.value]));
  const draftByKey = new Map(draftText.map((row) => [row.key, row.value]));
  for (const key of new Set([...liveByKey.keys(), ...draftByKey.keys()])) {
    if (liveByKey.get(key) === draftByKey.get(key)) continue;
    const slot = textSlot(key);
    changes.push({
      what: slot ? slot.label.toLowerCase() : "some words",
      where: whereOf(key),
    });
  }

  // ── pictures ───────────────────────────────────────────────────────────
  const asLine = (row: {
    ref: string;
    alt: string;
    brightness: number | null;
    focalX: string | null;
    focalY: string | null;
  }) => [row.ref, row.alt, row.brightness, row.focalX, row.focalY].join("|");
  const livePic = new Map(livePictures.map((row) => [row.key, asLine(row)]));
  const draftPic = new Map(draftPictures.map((row) => [row.key, asLine(row)]));
  for (const key of new Set([...livePic.keys(), ...draftPic.keys()])) {
    if (livePic.get(key) === draftPic.get(key)) continue;
    const slot = pictureSlot(key);
    changes.push({
      what: slot ? slot.label.toLowerCase() : "a photograph",
      where: whereOf(key),
    });
  }

  // ── the shape of the page ──────────────────────────────────────────────
  //
  // Compared as a SHAPE rather than row by row, because publishing rewrites
  // every live row and their ids therefore never match. What is compared is
  // what she would see: what is hidden, what she has added, what is in it, and
  // the order the beats come in.

  // WHAT IS HIDDEN, DEFAULTING TO NOT. A beat with no live row at all has never
  // been published, and "not on the site yet" and "not hidden" are the same
  // thing from a visitor's side — so hiding one on a page that has never been
  // published is still a change, and is still said. Reading the live row and
  // skipping when it is missing was the first version, and it left the whole of
  // a first publish described as "the order of the page".
  const liveHidden = new Map(
    liveSections
      .filter((row) => row.kind === "beat" && row.beatKey)
      .map((row) => [row.beatKey as string, row.hidden]),
  );
  for (const row of draftSections) {
    if (row.kind !== "beat" || !row.beatKey || !isBeatKey(row.beatKey))
      continue;
    if ((liveHidden.get(row.beatKey) ?? false) === row.hidden) continue;
    changes.push({
      what: row.hidden ? "taken off the page" : "put back on the page",
      where: BEAT_LABEL.get(row.beatKey) ?? "The page",
    });
  }

  // SECTIONS SHE MADE, counted and then compared. They have no names, so they
  // are named by where they are — "the third section" — which is what she would
  // say pointing at one.
  const draftFree = draftSections.filter((row) => row.kind === "free");
  const liveFree = liveSections.filter((row) => row.kind === "free");
  if (draftFree.length > liveFree.length) {
    const added = draftFree.length - liveFree.length;
    changes.push({
      what: added === 1 ? "a section you added" : `${added} sections you added`,
      where: "The page",
    });
  } else if (liveFree.length > draftFree.length) {
    const gone = liveFree.length - draftFree.length;
    changes.push({
      what: gone === 1 ? "a section deleted" : `${gone} sections deleted`,
      where: "The page",
    });
  } else {
    // Same number, so anything different is a change to what is IN them.
    for (const [index, row] of draftFree.entries()) {
      if (shapeOf(row) === shapeOf(liveFree[index])) continue;
      changes.push({
        what: "what is in it",
        where: `The ${ordinal(draftSections.indexOf(row) + 1)} section`,
      });
    }
  }

  // THE ORDER, and only the order. Compared on the sequence of names rather
  // than on the whole shape, so that changing a word inside a section does not
  // also report that the page has been rearranged.
  const nameOf = (row: SectionWithBlocks) =>
    row.kind === "beat" ? (row.beatKey ?? "?") : "yours";
  if (
    liveSections.length > 0 &&
    draftSections.map(nameOf).join(",") !== liveSections.map(nameOf).join(",")
  ) {
    changes.push({ what: "the order of the page", where: "The page" });
  }

  return changes;
}

/** "first", "second" — she counts sections by eye, not from zero. */
function ordinal(n: number): string {
  const words = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  return words[n - 1] ?? `${n}th`;
}

type SectionWithBlocks = Prisma.PageSectionGetPayload<{
  include: { blocks: { include: { items: true } } };
}>;

/** Everything about a section except which copy it is in and what its id is. */
function shapeOf(section: SectionWithBlocks): string {
  const blocks = [...section.blocks]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((block) => {
      const items = [...block.items]
        .sort((a, b) => a.position - b.position || a.id - b.id)
        .map((item) => [item.kind, item.text, item.href].join("~"))
        .join(";");
      return [
        block.kind,
        block.placement,
        block.imageRef,
        block.imageAlt,
        items,
      ].join("/");
    })
    .join("|");
  return [
    section.kind,
    section.beatKey ?? "",
    section.hidden,
    section.imageRef ?? "",
    section.imageAlt ?? "",
    blocks,
  ].join("::");
}

// ── publishing ───────────────────────────────────────────────────────────────

export type PublishResult =
  { outcome: "published"; count: number } | { outcome: "nothing" };

/**
 * Put the draft out.
 *
 * FOUR DELETES AND FOUR COPIES, in one transaction. The section tree is copied
 * top-down because a block needs its section's new id and an item needs its
 * block's; the two override tables are flat and go across in one statement
 * each.
 *
 * A PAGE WITH NOTHING PENDING IS NOT REPUBLISHED. The button is drawn spent in
 * that case, and this is the same rule applied on the server — pressing it from
 * a page that was drawn before somebody else published must not rewrite every
 * live row for no reason.
 */
export async function publishPage(page: string): Promise<PublishResult> {
  const pending = await pendingChanges(page);
  if (pending.length === 0) return { outcome: "nothing" };

  await prisma.$transaction(async (tx) => {
    // Blocks and items go with their sections — both relations cascade.
    await tx.pageSection.deleteMany({ where: { page, state: "live" } });
    await tx.pageText.deleteMany({ where: { page, state: "live" } });
    await tx.pagePicture.deleteMany({ where: { page, state: "live" } });

    const draft = await tx.pageSection.findMany({
      where: { page, state: "draft" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: {
        blocks: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
        },
      },
    });

    for (const [position, section] of draft.entries()) {
      await tx.pageSection.create({
        data: {
          page,
          state: "live",
          position,
          kind: section.kind,
          beatKey: section.beatKey,
          hidden: section.hidden,
          imageRef: section.imageRef,
          imageAlt: section.imageAlt,
          /* EVERY FIELD, NOT THE ONES THAT EXISTED WHEN THIS WAS WRITTEN.
             `size` was already being dropped here before 2026-08-20: a line
             she made bigger went out at the size she had not chosen, and
             nothing said so — the draft looked right, the live page was wrong,
             and the difference was one column. Adding four more fields to the
             model without adding them here would have made four more of those.

             This is the copy that has to be TOTAL, and the honest way to keep
             it so is to add to it in the same commit that adds to the schema. */
          focusY: section.focusY,
          tall: section.tall,
          blocks: {
            create: section.blocks.map((block, blockPosition) => ({
              position: blockPosition,
              kind: block.kind,
              placement: block.placement,
              imageRef: block.imageRef,
              imageAlt: block.imageAlt,
              shape: block.shape,
              focusX: block.focusX,
              focusY: block.focusY,
              items: {
                create: block.items.map((item, itemPosition) => ({
                  position: itemPosition,
                  kind: item.kind,
                  text: item.text,
                  href: item.href,
                  size: item.size,
                  align: item.align,
                })),
              },
            })),
          },
        },
      });
    }

    const texts = await tx.pageText.findMany({
      where: { page, state: "draft" },
    });
    if (texts.length > 0) {
      await tx.pageText.createMany({
        data: texts.map((row) => ({
          page,
          state: "live" as const,
          key: row.key,
          value: row.value,
        })),
      });
    }

    const pictures = await tx.pagePicture.findMany({
      where: { page, state: "draft" },
    });
    if (pictures.length > 0) {
      await tx.pagePicture.createMany({
        data: pictures.map((row) => ({
          page,
          state: "live" as const,
          key: row.key,
          ref: row.ref,
          alt: row.alt,
          brightness: row.brightness,
          focalX: row.focalX,
          focalY: row.focalY,
        })),
      });
    }
  });

  return { outcome: "published", count: pending.length };
}

/**
 * Throw the draft away and start again from what is live.
 *
 * The counterpart of publishing, and the reason the confirmation on it can be
 * plain: nothing she has done is unrecoverable while the live copy still holds
 * what visitors are seeing. A page that has never been published discards back
 * to the composition as authored, which is the same thing said in the other
 * direction — the seed is the default and an empty draft renders it.
 */
export async function discardDraft(page: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.pageSection.deleteMany({ where: { page, state: "draft" } });
    await tx.pageText.deleteMany({ where: { page, state: "draft" } });
    await tx.pagePicture.deleteMany({ where: { page, state: "draft" } });

    const live = await tx.pageSection.findMany({
      where: { page, state: "live" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: {
        blocks: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
        },
      },
    });

    for (const [position, section] of live.entries()) {
      await tx.pageSection.create({
        data: {
          page,
          state: "draft",
          position,
          kind: section.kind,
          beatKey: section.beatKey,
          hidden: section.hidden,
          imageRef: section.imageRef,
          imageAlt: section.imageAlt,
          /* EVERY FIELD, NOT THE ONES THAT EXISTED WHEN THIS WAS WRITTEN.
             `size` was already being dropped here before 2026-08-20: a line
             she made bigger went out at the size she had not chosen, and
             nothing said so — the draft looked right, the live page was wrong,
             and the difference was one column. Adding four more fields to the
             model without adding them here would have made four more of those.

             This is the copy that has to be TOTAL, and the honest way to keep
             it so is to add to it in the same commit that adds to the schema. */
          focusY: section.focusY,
          tall: section.tall,
          blocks: {
            create: section.blocks.map((block, blockPosition) => ({
              position: blockPosition,
              kind: block.kind,
              placement: block.placement,
              imageRef: block.imageRef,
              imageAlt: block.imageAlt,
              shape: block.shape,
              focusX: block.focusX,
              focusY: block.focusY,
              items: {
                create: block.items.map((item, itemPosition) => ({
                  position: itemPosition,
                  kind: item.kind,
                  text: item.text,
                  href: item.href,
                  size: item.size,
                  align: item.align,
                })),
              },
            })),
          },
        },
      });
    }

    const texts = await tx.pageText.findMany({
      where: { page, state: "live" },
    });
    if (texts.length > 0) {
      await tx.pageText.createMany({
        data: texts.map((row) => ({
          page,
          state: "draft" as const,
          key: row.key,
          value: row.value,
        })),
      });
    }

    const pictures = await tx.pagePicture.findMany({
      where: { page, state: "live" },
    });
    if (pictures.length > 0) {
      await tx.pagePicture.createMany({
        data: pictures.map((row) => ({
          page,
          state: "draft" as const,
          key: row.key,
          ref: row.ref,
          alt: row.alt,
          brightness: row.brightness,
          focalX: row.focalX,
          focalY: row.focalY,
        })),
      });
    }
  });
}

export type { BeatKey };
