"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { balanceLink, issueLinkToken, withOffering } from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { paymentReminderEmail } from "@/lib/email/bookings";
import { sendMail } from "@/lib/email";
import { loadWording } from "@/lib/email/templates";
import { dueNowPence, nextDue } from "@/lib/instalments";

/**
 * SENDING SOMEBODY A REMINDER THAT A PAYMENT IS DUE.
 *
 * ── WHY THIS IS A BUTTON AND NOT A SCHEDULE ──────────────────────────────
 *
 * Nothing in this application runs on a timer, and that is a decision rather
 * than a gap: a place released by an unpaid balance happens by the passing of a
 * date, so there is no moment at which anything could send a message. Adding a
 * scheduler means a deployed host, a secret and a job that runs whether or not
 * anybody is looking — worth doing, and not something to invent on the way past
 * while building a table.
 *
 * So the reminder is hers to send, from the row that shows her it is late. The
 * portal tells her the moment she opens it; she presses once. When a scheduler
 * does land, it calls THIS function — which is why the sending, the recording
 * and the rules all live here rather than in the button.
 *
 * ── IT ISSUES A FRESH LINK ───────────────────────────────────────────────
 *
 * The same rule the confirmation follows: resending a link issues a NEW one and
 * retires the old, so a forwarded email cannot pay somebody else's instalment
 * and an address that leaked stops working the moment she sends again.
 *
 * ── AND IT REFUSES WHEN THERE IS NOTHING TO ASK FOR ──────────────────────
 *
 * A plan with nothing due yet is not a plan in arrears. Reminding somebody
 * about a payment that is not due is how a practice teaches people to ignore
 * its email.
 */

export type ReminderState = { error: string | null; sent: number };

export async function sendPaymentReminder(
  _prev: ReminderState,
  form: FormData,
): Promise<ReminderState> {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const id = Number(String(form.get("booking") ?? ""));
  if (!Number.isInteger(id)) {
    return { error: "That booking is no longer here.", sent: 0 };
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: withOffering,
  });
  if (!booking) return { error: "That booking is no longer here.", sent: 0 };

  if (booking.status !== "paid") {
    return {
      error:
        "That place is not live any more, so there is nothing to ask for. Nothing has been sent.",
      sent: 0,
    };
  }

  const due = dueNowPence(booking.instalments);
  if (due <= 0) {
    const next = nextDue(booking.instalments);
    return {
      error: next
        ? "Nothing is due on that one yet. Nothing has been sent."
        : "That one is paid in full. Nothing has been sent.",
      sent: 0,
    };
  }

  // The oldest unpaid instalment whose day has come — the one the reminder is
  // about, and the one whose date makes the sentence true.
  const oldest = [...booking.instalments]
    .filter((one) => one.paidAt === null)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];

  const link = issueLinkToken();
  const mail = paymentReminderEmail(
    booking,
    { amountPence: due, dueAt: oldest.dueAt },
    balanceLink(link.token),
    await loadWording(),
  );

  const result = await sendMail(mail);

  /**
   * THE LOG ADAPTER IS NOT A FAILED SEND.
   *
   * `sendMail` returns `delivered: false, via: "log"` when no provider is
   * configured, and it is right to: it never claims a success that did not
   * happen. But that is a state of the DEPLOYMENT, not of this message — with
   * no key set, no message on this site is ever delivered, and treating it as a
   * failure here would mean the reminder is the one action in the portal that
   * cannot be used on a machine without a mail provider.
   *
   * A real refusal from Resend still fails, which is the case that matters.
   */
  if (!result.delivered && result.via !== "log") {
    // NOT RECORDED AS SENT, and the new link is not stored — so the old one in
    // their inbox still works and pressing again is a clean retry rather than a
    // second dead address.
    return {
      error: `That did not send${result.error ? ` — ${result.error}` : ""}. Nothing has changed; try again.`,
      sent: 0,
    };
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { balanceTokenHash: link.hash },
    }),
    prisma.instalment.updateMany({
      where: { bookingId: booking.id, paidAt: null, id: oldest.id },
      data: { remindedAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/workshop-bookings");
  return { error: null, sent: Date.now() };
}
