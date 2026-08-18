import type {
  PageAnchor,
  PageBlockKind,
  PageItemKind,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { BEATS, seededPicture, seededText, textSlot } from "./slots";

/**
 * CHANGING A PAGE. Every one of these writes the DRAFT and nothing else.
 *
 * There is no state argument anywhere in this file, and that is deliberate:
 * `live` is only ever written by `publish`, in one transaction, from the draft.
 * A mutation that could be pointed at the live copy is a mutation that can put
 * a half-finished sentence in front of a visitor.
 *
 * POSITIONS ARE RENORMALISED ON EVERY STRUCTURAL CHANGE — 0, 1, 2, 3 across the
 * whole page, inside the same transaction. A page has about ten sections, so
 * the cost is nothing, and it removes the two problems the alternatives bring:
 * sparse gaps run out after a dozen insertions at the same spot, and unique
 * positions need a shuffle through a temporary value on every move.
 */

export type Outcome = { ok: true } | { ok: false; reason: string };

const OK: Outcome = { ok: true };
const GONE = "That part of the page is no longer there.";

// ── the draft's own rows ─────────────────────────────────────────────────────

/**
 * MATERIALISE THE DRAFT THE FIRST TIME SHE TOUCHES A PAGE.
 *
 * Until then the page has no `PageSection` rows at all and renders from the
 * seed — which is what makes an empty database render the composition that was
 * signed off on. The moment she moves, hides or adds anything, the order stops
 * being derivable from code and has to be written down; this is where that
 * happens, and it writes exactly what the page already looked like.
 *
 * CALLED WHEN SHE OPENS THE EDITOR, not when she first changes something.
 * That is not a nicety: until the rows exist, a section has no id to be
 * addressed by, and the editor would be drawing controls for things the server
 * could not find. It was built the other way round first and hiding a beat
 * silently did nothing — the insert ran, and the update that followed it looked
 * for the id the browser had been drawn with, which no longer described
 * anything.
 *
 * It costs the live copy nothing. Only the DRAFT is written, so an empty
 * database still serves the composition as authored to every visitor, and
 * `pendingChanges` knows that seven untouched beats in their composed order is
 * not a change to report.
 *
 * Idempotent, and safe under two tabs: the count and the insert are in the same
 * transaction as the change that needed them.
 */
export async function ensureDraft(page: string): Promise<void> {
  await prisma.$transaction((tx) => ensureSections(tx, page));
}

async function ensureSections(tx: Prisma.TransactionClient, page: string) {
  const existing = await tx.pageSection.count({
    where: { page, state: "draft" },
  });
  if (existing > 0) return;

  await tx.pageSection.createMany({
    data: BEATS.map((beat, index) => ({
      page,
      state: "draft" as const,
      position: index,
      kind: "beat" as const,
      beatKey: beat.key,
    })),
  });
}

/** 0, 1, 2, 3 — in the order they are already in. */
async function renumber(tx: Prisma.TransactionClient, page: string) {
  const rows = await tx.pageSection.findMany({
    where: { page, state: "draft" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  for (const [index, row] of rows.entries()) {
    await tx.pageSection.update({
      where: { id: row.id },
      data: { position: index },
    });
  }
}

async function renumberBlocks(tx: Prisma.TransactionClient, sectionId: number) {
  const rows = await tx.pageBlock.findMany({
    where: { sectionId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  for (const [index, row] of rows.entries()) {
    await tx.pageBlock.update({
      where: { id: row.id },
      data: { position: index },
    });
  }
}

async function renumberItems(tx: Prisma.TransactionClient, blockId: number) {
  const rows = await tx.pageItem.findMany({
    where: { blockId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  for (const [index, row] of rows.entries()) {
    await tx.pageItem.update({
      where: { id: row.id },
      data: { position: index },
    });
  }
}

// ── the seven beats: words and pictures ──────────────────────────────────────

/**
 * Change one of the seven beats' words.
 *
 * SAVING WHAT WAS ALREADY THERE DELETES THE ROW rather than writing a copy of
 * the seed into the database. That keeps the override table meaning what it
 * says — "these are the things she changed" — so the pending-changes list is
 * true, and so a later edit to the authored copy still reaches the page.
 */
export async function setText(
  page: string,
  key: string,
  words: string,
): Promise<Outcome> {
  if (!textSlot(key)) return { ok: false, reason: GONE };

  const next = words.replace(/\r\n/g, "\n").trim();
  if (!next) {
    return {
      ok: false,
      reason:
        "Words are wanted here. If you want this off the page, hide the whole section instead — an empty line leaves a gap that reads as a mistake.",
    };
  }

  // A LINK SLOT TYPED ON THE PAGE ARRIVES AS ITS LABEL ALONE, because the label
  // is the only part of it that is ON the page — where it goes is a fact about
  // it, not words in front of anybody. Storing that as the whole value would
  // throw the target away every time she corrected a typo in the label, so the
  // second line is carried over from what is already there.
  const slot = textSlot(key);
  let value = next;
  if (slot?.shape === "link" && !next.includes("\n")) {
    const existing =
      (
        await prisma.pageText.findUnique({
          where: { page_state_key: { page, state: "draft", key } },
        })
      )?.value ?? seededText(key);
    const href = existing.split("\n")[1] ?? "";
    value = href ? `${next}\n${href}` : next;
  }

  if (value === seededText(key).trim()) {
    await prisma.pageText.deleteMany({ where: { page, state: "draft", key } });
    return OK;
  }

  await prisma.pageText.upsert({
    where: { page_state_key: { page, state: "draft", key } },
    create: { page, state: "draft", key, value },
    update: { value },
  });
  return OK;
}

/** Put a slot back to the words it was written with. */
export async function clearText(page: string, key: string): Promise<Outcome> {
  await prisma.pageText.deleteMany({ where: { page, state: "draft", key } });
  return OK;
}

/**
 * Swap the photograph in one of the seven beats' picture slots.
 *
 * The alt text is REQUIRED, for the reason every other picture in this app
 * requires one: a photograph nobody can see is a photograph that says nothing
 * to the person who most needs it described.
 */
export async function setPicture(
  page: string,
  key: string,
  input: {
    ref: string;
    alt: string;
    brightness?: number | null;
    focalX?: string | null;
    focalY?: string | null;
  },
): Promise<Outcome> {
  const seed = seededPicture(key);
  if (!seed) return { ok: false, reason: GONE };

  const ref = input.ref.trim();
  const alt = input.alt.trim();
  if (!ref) return { ok: false, reason: "Choose a picture first." };

  const data = {
    ref,
    alt,
    brightness: input.brightness ?? null,
    focalX: input.focalX ?? null,
    focalY: input.focalY ?? null,
  };

  await prisma.pagePicture.upsert({
    where: { page_state_key: { page, state: "draft", key } },
    create: { page, state: "draft", key, ...data },
    update: data,
  });
  return OK;
}

export async function clearPicture(
  page: string,
  key: string,
): Promise<Outcome> {
  await prisma.pagePicture.deleteMany({ where: { page, state: "draft", key } });
  return OK;
}

/**
 * Bigger or smaller, in steps.
 *
 * BOUNDED AT BOTH ENDS, and clamped here rather than trusted from the browser:
 * this is the one control in the panel that can make the page unreadable, and
 * the range is what stops it. Six steps is enough to change a heading's weight
 * on the page and not enough to set anything to four pixels or to a size that
 * runs off the side.
 *
 * A step of 0 is the composition, so it DELETES the row when the words are
 * unchanged too — the override table goes on meaning "these are the things she
 * changed", which is what keeps the pending list honest.
 */
export const SIZE_STEPS = [-2, -1, 0, 1, 2, 3] as const;

function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(-2, Math.min(3, Math.round(step)));
}

export async function setTextSize(
  page: string,
  key: string,
  step: number,
): Promise<Outcome> {
  const slot = textSlot(key);
  if (!slot) return { ok: false, reason: GONE };
  const size = clampStep(step);

  const row = await prisma.pageText.findUnique({
    where: { page_state_key: { page, state: "draft", key } },
  });

  if (size === 0 && (!row || row.value === seededText(key).trim())) {
    await prisma.pageText.deleteMany({ where: { page, state: "draft", key } });
    return OK;
  }

  await prisma.pageText.upsert({
    where: { page_state_key: { page, state: "draft", key } },
    // A slot she has resized but not rewritten still needs a row, and the words
    // on it are the authored ones — copied in here because a row with an empty
    // value would render an empty paragraph.
    create: { page, state: "draft", key, value: seededText(key).trim(), size },
    update: { size },
  });
  return OK;
}

export async function setItemSize(
  page: string,
  itemId: number,
  step: number,
): Promise<Outcome> {
  const item = await prisma.pageItem.findFirst({
    where: { id: itemId, block: { section: { page, state: "draft" } } },
  });
  if (!item) return { ok: false, reason: GONE };
  await prisma.pageItem.update({
    where: { id: itemId },
    data: { size: clampStep(step) },
  });
  return OK;
}

// ── sections ─────────────────────────────────────────────────────────────────

/**
 * Take a section off the page, or put it back.
 *
 * ALL OF THEM, including the seven. D-2 allowed this for beats 2-6 only,
 * because the opening and the letter were structural; with sections of her own
 * now allowed anywhere, "structural" stopped meaning anything the code could
 * check. A hidden section is one she is not using this month rather than one
 * she has lost, and the editor still draws it, greyed, with its words intact.
 */
export async function setHidden(
  page: string,
  sectionId: number,
  hidden: boolean,
): Promise<Outcome> {
  return prisma.$transaction(async (tx) => {
    await ensureSections(tx, page);
    const row = await tx.pageSection.findFirst({
      where: { id: sectionId, page, state: "draft" },
    });
    if (!row) return { ok: false as const, reason: GONE };
    await tx.pageSection.update({ where: { id: sectionId }, data: { hidden } });
    return OK;
  });
}

/**
 * Add a section of her own, above or below the one she has selected.
 *
 * It arrives EMPTY and plum — no photograph, no words — because a new section
 * pre-filled with something is a new section she has to clear out first. The
 * toolbox is open on it the moment it lands.
 */
export async function addSection(
  page: string,
  input: { relativeTo: number; where: "above" | "below" },
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  return prisma.$transaction(async (tx) => {
    await ensureSections(tx, page);

    const rows = await tx.pageSection.findMany({
      where: { page, state: "draft" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { id: true },
    });

    const created = await tx.pageSection.create({
      // Parked past the end; the rewrite below decides where it actually goes.
      data: { page, state: "draft", position: rows.length, kind: "free" },
      select: { id: true },
    });

    // THE WHOLE ORDER IS REWRITTEN, rather than the new row being given a
    // position between two others. Giving it `anchor.position + 1` puts it on
    // the same number as the row it is meant to go before, and the tie is
    // settled by id — which the new row always loses, because it is the newest.
    // "Below the four words" landed one section too low every time. Deciding
    // the sequence and then numbering it cannot fail that way.
    const at = rows.findIndex((row) => row.id === input.relativeTo);
    const order = rows.map((row) => row.id);
    // An anchor the browser knew about and the database does not means the page
    // moved under her. She asked for a section and gets one, at the end.
    order.splice(
      at < 0 ? order.length : input.where === "above" ? at : at + 1,
      0,
      created.id,
    );

    for (const [position, id] of order.entries()) {
      await tx.pageSection.update({ where: { id }, data: { position } });
    }

    return { ok: true as const, id: created.id };
  });
}

/** Only one she made. The seven are hidden, never destroyed. */
export async function deleteSection(
  page: string,
  sectionId: number,
): Promise<Outcome> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.pageSection.findFirst({
      where: { id: sectionId, page, state: "draft" },
    });
    if (!row) return OK; // pressing it twice means the same thing as once
    if (row.kind === "beat") {
      return {
        ok: false as const,
        reason:
          "This is one of the page's original sections and it cannot be deleted. Hide it instead — it comes back when you want it, with everything still in it.",
      };
    }
    await tx.pageSection.delete({ where: { id: sectionId } });
    await renumber(tx, page);
    return OK;
  });
}

/** Up or down by one, and it stops at the ends rather than wrapping. */
export async function moveSection(
  page: string,
  sectionId: number,
  direction: "up" | "down",
): Promise<Outcome> {
  return prisma.$transaction(async (tx) => {
    await ensureSections(tx, page);
    const rows = await tx.pageSection.findMany({
      where: { page, state: "draft" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const index = rows.findIndex((row) => row.id === sectionId);
    if (index < 0) return { ok: false as const, reason: GONE };

    const to = direction === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= rows.length) {
      return {
        ok: false as const,
        reason:
          direction === "up"
            ? "This is already the first thing on the page."
            : "This is already the last thing on the page.",
      };
    }

    const reordered = [...rows];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(to, 0, moved);
    for (const [position, row] of reordered.entries()) {
      await tx.pageSection.update({
        where: { id: row.id },
        data: { position },
      });
    }
    return OK;
  });
}

/**
 * The photograph behind a section she made. Null takes it away and leaves the
 * band plum, which is what every beat is behind its own plate.
 */
export async function setSectionPicture(
  page: string,
  sectionId: number,
  input: { ref: string; alt: string } | null,
): Promise<Outcome> {
  const row = await prisma.pageSection.findFirst({
    where: { id: sectionId, page, state: "draft" },
  });
  if (!row) return { ok: false, reason: GONE };
  if (row.kind === "beat") {
    return {
      ok: false,
      reason:
        "The photograph on one of the page's original sections is swapped by selecting the photograph itself.",
    };
  }
  await prisma.pageSection.update({
    where: { id: sectionId },
    data: {
      imageRef: input?.ref.trim() || null,
      imageAlt: input ? input.alt.trim() : null,
    },
  });
  return OK;
}

// ── blocks ───────────────────────────────────────────────────────────────────

/**
 * Put a box of words, some words on the picture, or a picture, into a section.
 *
 * A NEW BOX OF WORDS ARRIVES WITH ONE PARAGRAPH IN IT. An empty box has no
 * height and nothing to click, so a box that arrived empty would look to her
 * like nothing had happened.
 */
export async function addBlock(
  page: string,
  input: { sectionId: number; kind: PageBlockKind; placement: PageAnchor },
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  return prisma.$transaction(async (tx) => {
    const section = await tx.pageSection.findFirst({
      where: { id: input.sectionId, page, state: "draft" },
    });
    if (!section) return { ok: false as const, reason: GONE };
    if (section.kind === "beat") {
      return {
        ok: false as const,
        reason:
          "The page's original sections are composed as they are. Add a section of your own above or below this one, and put what you like in that.",
      };
    }

    const last = await tx.pageBlock.findFirst({
      where: { sectionId: input.sectionId },
      orderBy: [{ position: "desc" }],
      select: { position: true },
    });

    const created = await tx.pageBlock.create({
      data: {
        sectionId: input.sectionId,
        position: (last?.position ?? -1) + 1,
        kind: input.kind,
        placement: input.placement,
        items:
          input.kind === "picture"
            ? undefined
            : {
                create: [{ position: 0, kind: "paragraph" as const, text: "" }],
              },
      },
      select: { id: true },
    });
    return { ok: true as const, id: created.id };
  });
}

export async function setBlockPlacement(
  page: string,
  blockId: number,
  placement: PageAnchor,
): Promise<Outcome> {
  const block = await findBlock(page, blockId);
  if (!block) return { ok: false, reason: GONE };
  await prisma.pageBlock.update({
    where: { id: blockId },
    data: { placement },
  });
  return OK;
}

export async function setBlockPicture(
  page: string,
  blockId: number,
  input: { ref: string; alt: string },
): Promise<Outcome> {
  const block = await findBlock(page, blockId);
  if (!block) return { ok: false, reason: GONE };
  if (block.kind !== "picture") {
    return { ok: false, reason: "That is not a picture." };
  }
  if (!input.ref.trim())
    return { ok: false, reason: "Choose a picture first." };
  await prisma.pageBlock.update({
    where: { id: blockId },
    data: { imageRef: input.ref.trim(), imageAlt: input.alt.trim() },
  });
  return OK;
}

export async function deleteBlock(
  page: string,
  blockId: number,
): Promise<Outcome> {
  const block = await findBlock(page, blockId);
  if (!block) return OK;
  await prisma.$transaction(async (tx) => {
    await tx.pageBlock.delete({ where: { id: blockId } });
    await renumberBlocks(tx, block.sectionId);
  });
  return OK;
}

// ── the lines inside a box ───────────────────────────────────────────────────

export async function addItem(
  page: string,
  input: { blockId: number; kind: PageItemKind },
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  const block = await findBlock(page, input.blockId);
  if (!block) return { ok: false, reason: GONE };
  if (block.kind === "picture") {
    return { ok: false, reason: "A picture has no words in it." };
  }

  const last = await prisma.pageItem.findFirst({
    where: { blockId: input.blockId },
    orderBy: [{ position: "desc" }],
    select: { position: true },
  });
  const created = await prisma.pageItem.create({
    data: {
      blockId: input.blockId,
      position: (last?.position ?? -1) + 1,
      kind: input.kind,
      text: "",
      href: input.kind === "link" || input.kind === "button" ? "/" : null,
    },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

/**
 * The words in one line, and where it goes if it is a link or a button.
 *
 * A LINK WITHOUT A TARGET IS REFUSED. The home page has already shipped one
 * call to action that pointed at its own section and therefore did nothing
 * (see the note on the crown beat in `content/home.ts`); a link that goes
 * nowhere is worse than no link, because somebody presses it.
 */
export async function setItem(
  page: string,
  itemId: number,
  input: { text: string; href?: string | null },
): Promise<Outcome> {
  const item = await prisma.pageItem.findUnique({
    where: { id: itemId },
    include: { block: { include: { section: true } } },
  });
  if (
    !item ||
    item.block.section.page !== page ||
    item.block.section.state !== "draft"
  ) {
    return { ok: false, reason: GONE };
  }

  const text = input.text.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return {
      ok: false,
      reason:
        "Words are wanted here. If you do not want this line, remove it rather than emptying it.",
    };
  }

  // AN ABSENT TARGET MEANS LEAVE IT ALONE; an empty one means she cleared it.
  // Typing a button's label on the page sends the label and nothing else — the
  // target is not on the page to be typed — and treating "not sent" as "set it
  // to nothing" refused every rename with "say where it goes".
  const wantsHref = item.kind === "link" || item.kind === "button";
  // `== null` on purpose: absent and null both mean "she did not send one".
  const given = input.href == null ? null : input.href.trim();
  const href = given === null ? (item.href ?? "") : given;
  if (wantsHref && !href) {
    return {
      ok: false,
      reason:
        "Say where it goes. A link with nowhere to go is worse than no link, because somebody presses it.",
    };
  }

  await prisma.pageItem.update({
    where: { id: itemId },
    data: { text, href: wantsHref ? href : null },
  });
  return OK;
}

export async function deleteItem(
  page: string,
  itemId: number,
): Promise<Outcome> {
  const item = await prisma.pageItem.findUnique({
    where: { id: itemId },
    include: { block: { include: { section: true } } },
  });
  if (!item) return OK;
  if (
    item.block.section.page !== page ||
    item.block.section.state !== "draft"
  ) {
    return { ok: false, reason: GONE };
  }
  await prisma.$transaction(async (tx) => {
    await tx.pageItem.delete({ where: { id: itemId } });
    await renumberItems(tx, item.blockId);
  });
  return OK;
}

// ── shared ───────────────────────────────────────────────────────────────────

async function findBlock(page: string, blockId: number) {
  return prisma.pageBlock.findFirst({
    where: { id: blockId, section: { page, state: "draft" } },
  });
}
