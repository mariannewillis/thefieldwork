"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import {
  sendOfferingMessage,
  type MessageRecipient,
} from "@/lib/offering-mail";

/**
 * WRITING TO THE PEOPLE ON ONE OFFERING.
 *
 * Shared by all three kinds, because the message is the same object whichever
 * it hangs off — only the recipients differ, and the screen decides those.
 *
 * NOTHING HERE READS `Subscriber`. Offering mail is transactional and its
 * recipients come from bookings and requests; the letter is the other channel
 * and the two must never see each other's lists. See `lib/offering-mail.ts`.
 */

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type MessageState = { error: string | null; done: number };

/** Which offering a message hangs off, as the three-nullable-keys shape. */
function keyFor(kind: string, id: number) {
  return kind === "workshop"
    ? { workshopId: id }
    : kind === "course"
      ? { courseId: id }
      : { serviceId: id };
}

function pathFor(kind: string, slug: string) {
  return `/admin/offerings/${kind}s/${slug}`;
}

/**
 * Save what she has written — creating the draft on the first save.
 *
 * ONE DRAFT AT A TIME PER OFFERING, and it is the unsent one. She is writing
 * "the room has moved", not keeping a folder of drafts about one Saturday; a
 * second unsent message would only ever be one she had forgotten.
 *
 * THE BLOCKS ARE REPLACED WHOLE rather than diffed. The form posts what is on
 * the screen, and rewriting four rows is cheaper than working out which of them
 * moved — the same decision `saveBlocks` made on the letter.
 */
export async function saveMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  await requireSession();

  const kind = String(formData.get("kind") ?? "");
  const id = Number(formData.get("offeringId"));
  const slug = String(formData.get("slug") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();

  if (
    !["workshop", "course", "service"].includes(kind) ||
    !Number.isInteger(id)
  ) {
    return { error: "That offering is no longer here.", done: 0 };
  }
  if (!subject) {
    return {
      error:
        "Give it a subject. It is the line they see in their inbox before they open anything, and a message without one reads as spam.",
      done: 0,
    };
  }

  // What she typed, in order, with the empty ones dropped: a block she added
  // and did not fill in is one she changed her mind about, not an empty
  // paragraph to send.
  const blocks: {
    kind: "heading" | "paragraph" | "image" | "button";
    text: string | null;
    imageBasename: string | null;
    caption: string | null;
    alt: string | null;
    href: string | null;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^block-(\d+)-kind$/.exec(key);
    if (!match) continue;
    const index = match[1];
    const blockKind = String(value) as (typeof blocks)[number]["kind"];
    const text = String(formData.get(`block-${index}-text`) ?? "").trim();
    const image = String(formData.get(`block-${index}-image`) ?? "").trim();
    const href = String(formData.get(`block-${index}-href`) ?? "").trim();
    const alt = String(formData.get(`block-${index}-alt`) ?? "").trim();

    if (blockKind === "image" ? !image : !text) continue;

    blocks.push({
      kind: blockKind,
      text: text || null,
      imageBasename: blockKind === "image" ? image : null,
      caption: null,
      alt: blockKind === "image" ? alt || null : null,
      href: blockKind === "button" ? href || null : null,
    });
  }

  const where = keyFor(kind, id);
  const existing = await prisma.offeringMessage.findFirst({
    where: { ...where, sentAt: null },
  });

  if (existing) {
    await prisma.offeringMessage.update({
      where: { id: existing.id },
      data: {
        subject,
        blocks: {
          deleteMany: {},
          create: blocks.map((block, position) => ({ ...block, position })),
        },
      },
    });
  } else {
    await prisma.offeringMessage.create({
      data: {
        ...where,
        subject,
        blocks: {
          create: blocks.map((block, position) => ({ ...block, position })),
        },
      },
    });
  }

  revalidatePath(pathFor(kind, slug));
  return { error: null, done: Date.now() };
}

/**
 * Send it, to the people she ticked.
 *
 * THE RECIPIENTS ARE POSTED AS KEYS AND RESOLVED HERE. What the browser sends
 * is `booking-12`, never an address — so a tampered form cannot mail somebody
 * who is not on this offering, and the addresses are read fresh at the moment
 * of sending rather than trusted from a page that may be minutes old.
 */
export async function sendMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  await requireSession();

  const kind = String(formData.get("kind") ?? "");
  const id = Number(formData.get("offeringId"));
  const slug = String(formData.get("slug") ?? "");
  const chosen = formData.getAll("to").map(String);

  if (
    !["workshop", "course", "service"].includes(kind) ||
    !Number.isInteger(id)
  ) {
    return { error: "That offering is no longer here.", done: 0 };
  }

  const message = await prisma.offeringMessage.findFirst({
    where: { ...keyFor(kind, id), sentAt: null },
  });
  if (!message) {
    return { error: "There is nothing written to send.", done: 0 };
  }

  const recipients = await resolveRecipients(kind, id, chosen);
  if (recipients.length === 0) {
    return {
      error:
        "Nobody was chosen — or the people chosen are no longer on this one. Tick at least one.",
      done: 0,
    };
  }

  const result = await sendOfferingMessage({
    messageId: message.id,
    recipients,
  });

  revalidatePath(pathFor(kind, slug));
  if (result.outcome === "refused") return { error: result.reason, done: 0 };

  return {
    error:
      result.failed > 0
        ? `${result.delivered} went, ${result.failed} would not. The ones that failed are listed below with what came back.`
        : null,
    done: Date.now(),
  };
}

/**
 * The addresses behind the keys she ticked, read from the offering itself.
 *
 * A KEY THAT IS NOT ON THIS OFFERING IS DROPPED, silently and on purpose: it
 * means the page was drawn before somebody cancelled, and the honest answer is
 * to send to the people who are actually on it rather than to refuse the whole
 * send over a row that has moved.
 */
async function resolveRecipients(
  kind: string,
  id: number,
  chosen: string[],
): Promise<MessageRecipient[]> {
  const wanted = new Set(chosen);

  if (kind === "service") {
    const requests = await prisma.serviceRequest.findMany({
      where: { serviceId: id },
      select: { id: true, email: true, name: true },
    });
    return requests
      .filter((row) => wanted.has(`request-${row.id}`))
      .map((row) => ({
        attendeeKey: `request-${row.id}`,
        email: row.email,
        name: row.name,
      }));
  }

  const bookings = await prisma.booking.findMany({
    where: kind === "workshop" ? { workshopId: id } : { courseId: id },
    select: { id: true, buyerEmail: true, buyerName: true },
  });
  return bookings
    .filter((row) => wanted.has(`booking-${row.id}`))
    .map((row) => ({
      attendeeKey: `booking-${row.id}`,
      email: row.buyerEmail,
      name: row.buyerName,
    }));
}
