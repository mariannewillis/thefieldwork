import "server-only";
import { prisma } from "@/lib/db";
import {
  EMAIL_TEMPLATE_KEYS,
  isTemplateKey,
  type Slots,
  type TemplateKey,
  type Wording,
} from "./wording";

/**
 * Reading and writing the wording Marianne owns.
 *
 * ONE READ PER SEND, and it is a nine-row table with a unique index on the key,
 * so it costs nothing worth optimising. It is deliberately NOT cached across
 * requests: she changes a sentence and expects the next confirmation to carry
 * it, and a cache that held the old one for a minute would be indistinguishable
 * from the save having failed.
 *
 * A MISSING TABLE, A MISSING ROW AND A DEAD DATABASE ALL FALL BACK TO THE APP'S
 * OWN WORDING. That is the whole reason `loadWording` swallows its error rather
 * than throwing: this is called on the path that confirms a booking somebody
 * has just paid for, and refusing to send a confirmation because a cosmetic
 * table could not be read would be the wrong end of the problem entirely — the
 * same judgement `sendBookingMail` already makes about a bounce.
 */

/** Every template's stored slots. Empty when nothing has been saved yet. */
export async function loadWording(): Promise<Wording> {
  try {
    const rows = await prisma.emailTemplate.findMany({
      select: { key: true, subject: true, opening: true, signOff: true },
    });

    const wording: Wording = {};
    for (const row of rows) {
      // A key that is not one of the nine is ignored rather than trusted. The
      // column is a string so the definition can live in one file; that means
      // the read has to be the place the set is enforced.
      if (!isTemplateKey(row.key)) continue;
      wording[row.key] = {
        subject: row.subject,
        opening: row.opening,
        signOff: row.signOff,
      };
    }
    return wording;
  } catch (error) {
    console.error(
      `[email] could not read the templates; sending the app's own wording — ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return {};
  }
}

/** One template's stored slots, for the screen that edits it. */
export async function loadSlots(key: TemplateKey): Promise<Slots> {
  const row = await prisma.emailTemplate.findUnique({
    where: { key },
    select: { subject: true, opening: true, signOff: true },
  });
  return {
    subject: row?.subject ?? null,
    opening: row?.opening ?? null,
    signOff: row?.signOff ?? null,
  };
}

/**
 * Save what she typed.
 *
 * BLANK IS STORED AS NULL, not as an empty string, because the two would
 * otherwise be a distinction the database kept and nobody could see: null and
 * "" both mean "as the app writes it" everywhere downstream, and keeping one
 * canonical shape is what makes "reset to the original wording" a single
 * update rather than a special case.
 *
 * Upsert rather than update: the nine rows are seeded by the migration, but a
 * database restored from before it must not turn a save into an error.
 */
export async function saveSlots(key: TemplateKey, slots: Slots): Promise<void> {
  const data = {
    subject: blankToNull(slots.subject),
    opening: blankToNull(slots.opening),
    signOff: blankToNull(slots.signOff),
  };
  await prisma.emailTemplate.upsert({
    where: { key },
    update: data,
    create: { key, ...data },
  });
}

/** Give a template back its original wording — all three slots at once. */
export async function resetSlots(key: TemplateKey): Promise<void> {
  await saveSlots(key, { subject: null, opening: null, signOff: null });
}

function blankToNull(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/** Which of the nine she has actually changed. Drawn on the index. */
export async function customisedKeys(): Promise<Set<TemplateKey>> {
  const rows = await prisma.emailTemplate.findMany({
    select: { key: true, subject: true, opening: true, signOff: true },
  });
  const customised = new Set<TemplateKey>();
  for (const row of rows) {
    if (!isTemplateKey(row.key)) continue;
    if (row.subject || row.opening || row.signOff) customised.add(row.key);
  }
  return customised;
}

export { EMAIL_TEMPLATE_KEYS };
