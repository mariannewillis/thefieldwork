"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/content/site";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { confirmEmail } from "@/lib/newsletter/confirm-email";
import { confirmToken } from "@/lib/newsletter/subscribers";

/**
 * The two things she can do to somebody on the list.
 *
 * WHAT IS NOT HERE IS THE POINT. There is no "add a subscriber" and no "mark
 * this one confirmed", and neither is an oversight. An address gets onto this
 * list one way — its owner asks for it on the site and then presses a link in
 * a message sent to that address — and a portal button that could put somebody
 * on it, or confirm on their behalf, would make the confirmation step theatre.
 * The evidence of consent is only evidence if nobody in this building can
 * manufacture it.
 */

async function requireSession() {
  // A server action is a POST endpoint of its own and does not inherit the
  // admin layout's check.
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type SubscriberState = { error: string | null; done: number };

/**
 * Taking somebody off the list.
 *
 * THE ROW IS DELETED, which is what "remove them" means and what the modal in
 * front of it says. `NewsletterSend.subscriberId` is `onDelete: SetNull`, so
 * every record of a letter they were sent survives with the address frozen on
 * it — the history of what went out is not theirs to take with them, and it is
 * the evidence that the sending was legitimate.
 *
 * `deleteMany` rather than `delete` so pressing it twice is not an error. The
 * second press means the same thing as the first.
 */
export async function removeSubscriber(
  _prev: SubscriberState,
  formData: FormData,
): Promise<SubscriberState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id))
    return { error: "They are already gone.", done: 0 };

  await prisma.subscriber.deleteMany({ where: { id } });
  revalidatePath("/admin/subscribers");
  return { error: null, done: Date.now() };
}

/**
 * Sending somebody their confirmation link again.
 *
 * The only thing the portal can do about an address that has been asked for
 * and never confirmed — which is usually a message that went to junk. It is
 * the same link, not a new one: the token is derived from the row rather than
 * stored, so there is no stack of live links accumulating in an inbox.
 */
export async function resendConfirmation(
  _prev: SubscriberState,
  formData: FormData,
): Promise<SubscriberState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id))
    return { error: "They are already gone.", done: 0 };

  const row = await prisma.subscriber.findUnique({ where: { id } });
  if (!row) return { error: "They are already gone.", done: 0 };
  if (row.confirmedAt && !row.unsubscribedAt) {
    return {
      error: "They have already confirmed — nothing was sent.",
      done: 0,
    };
  }

  const link = `${SITE_URL}/subscribe/confirm?id=${row.id}&token=${encodeURIComponent(
    confirmToken(row.id, row.email),
  )}`;
  const result = await sendMail({
    to: row.email,
    ...confirmEmail(link, row.name),
  });

  revalidatePath("/admin/subscribers");
  return result.delivered
    ? { error: null, done: Date.now() }
    : {
        error:
          "The confirmation did not go. Nothing about their record has changed.",
        done: 0,
      };
}

// ── what she has looked at ───────────────────────────────────────────────────

/**
 * Mark every subscriber as seen.
 *
 * A SUBSCRIBER HAS NO ROW TO OPEN, and that is why this is the only control of
 * the three. A booking and a request each have a sheet full of things she needs
 * — a message, a refund period, an amount — so opening one is a real act and
 * marking it seen means something. A subscriber is a name, an address and a
 * date, and all three are already on the line: there is nothing behind it to
 * open, so "I have read these" is the honest gesture and the only one.
 *
 * The rail's badge is what it clears.
 */
export async function markAllSubscribersSeen(): Promise<void> {
  await requireSession();
  await prisma.subscriber.updateMany({
    where: { seenAt: null },
    data: { seenAt: new Date() },
  });
  revalidatePath("/admin/subscribers");
}
