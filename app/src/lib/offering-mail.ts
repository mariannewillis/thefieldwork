import "server-only";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import {
  composeNewsletter,
  type ComposableBlock,
} from "@/lib/newsletter/compose";

/**
 * SENDING ONE MESSAGE TO THE PEOPLE ON ONE OFFERING.
 *
 * IT LOOKS LIKE HER MAIL BECAUSE IT IS HER MAIL. `composeNewsletter` is the
 * renderer, unchanged — the same masthead, the same plum plate, the same type.
 * There is one design for what arrives from this site and this uses it rather
 * than growing a second one that would drift.
 *
 * AND IT CARRIES NO UNSUBSCRIBE LINK. `composeNewsletter` already takes
 * `unsubscribe: string | null`, and null is not a shortcut here — it is the
 * whole difference between the two channels. A letter is marketing and every
 * copy must offer the way off the list; this goes to somebody holding a place
 * on a day she is running, and offering to unsubscribe them from a booking is
 * meaningless. Nothing in this file reads or writes `Subscriber`.
 *
 * ONE AT A TIME, IN ORDER, AND RECORDED BEFORE IT GOES. Every recipient gets a
 * row first, so a send that dies halfway leaves a record of exactly who was
 * reached and who was not — the same shape `sendBatch` uses on the letter, and
 * for the same reason: a partial send with no record is a send she has to guess
 * about.
 */

export type MessageBlock = {
  kind: "heading" | "paragraph" | "image" | "button";
  text: string | null;
  imageBasename: string | null;
  caption: string | null;
  alt: string | null;
  href: string | null;
};

/** Who one message is going to, decided by the screen and passed in whole. */
export type MessageRecipient = {
  attendeeKey: string;
  email: string;
  name: string | null;
};

export type SendMessageResult =
  | { outcome: "sent"; delivered: number; failed: number }
  | { outcome: "refused"; reason: string };

/**
 * The message's blocks in the shape the renderer wants.
 *
 * `offerings` is absent from this model deliberately — a note about the room
 * has no business carrying a list of everything else she runs — so the mapping
 * is total and there is no default case to get wrong.
 */
function composable(blocks: MessageBlock[]): ComposableBlock[] {
  return blocks.map((block) => ({
    kind: block.kind,
    text: block.text,
    imageBasename: block.imageBasename,
    caption: block.caption,
    alt: block.alt,
    href: block.href,
    count: null,
  }));
}

export async function sendOfferingMessage(input: {
  messageId: number;
  recipients: MessageRecipient[];
}): Promise<SendMessageResult> {
  const message = await prisma.offeringMessage.findUnique({
    where: { id: input.messageId },
    include: { blocks: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
  });

  if (!message) return { outcome: "refused", reason: "That message is gone." };

  // ONCE SENT IT IS CLOSED, for the reason a letter is: the people it went to
  // are holding a copy of what it said, and a record that can be sent again
  // under the same id is not a record of anything.
  if (message.sentAt) {
    return {
      outcome: "refused",
      reason:
        "This one has already gone. Write a new message rather than sending this again — the people who got it are holding what it said.",
    };
  }

  if (message.blocks.length === 0) {
    return {
      outcome: "refused",
      reason:
        "There is nothing written in it yet. An empty message is worse than none: it arrives, and says nothing.",
    };
  }

  if (input.recipients.length === 0) {
    return {
      outcome: "refused",
      reason: "Choose at least one person for it to go to.",
    };
  }

  const composed = await composeNewsletter({
    subject: message.subject,
    // The preheader is the subject on a message this short — there is no second
    // line to write, and an empty one shows the first words of the body in an
    // inbox list, which is worse than saying the subject twice.
    preheader: message.subject,
    mastheadLabel: "A message about your booking",
    backgroundBasename: null,
    blocks: composable(message.blocks),
    attachments: [],
    // THE WHOLE DIFFERENCE BETWEEN THIS AND A LETTER. See the note above.
    unsubscribe: null,
  });

  // Written BEFORE anything is sent, so a send that dies halfway leaves a
  // record of who was reached rather than a guess.
  await prisma.offeringMessageSend.createMany({
    data: input.recipients.map((person) => ({
      messageId: message.id,
      email: person.email,
      name: person.name,
      attendeeKey: person.attendeeKey,
    })),
    skipDuplicates: true,
  });

  let delivered = 0;
  let failed = 0;

  for (const person of input.recipients) {
    const result = await sendMail({
      to: person.email,
      subject: composed.subject,
      text: composed.text,
      html: composed.html,
    });

    await prisma.offeringMessageSend.updateMany({
      where: { messageId: message.id, email: person.email },
      data: result.delivered
        ? { outcome: "delivered", sentAt: new Date(), error: null }
        : { outcome: "failed", error: result.error ?? "It would not send." },
    });

    if (result.delivered) delivered += 1;
    else failed += 1;
  }

  await prisma.offeringMessage.update({
    where: { id: message.id },
    data: { sentAt: new Date(), recipientCount: input.recipients.length },
  });

  return { outcome: "sent", delivered, failed };
}
