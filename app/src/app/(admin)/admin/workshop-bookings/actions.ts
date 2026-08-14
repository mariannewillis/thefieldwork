"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelBookingFromPortal,
  deleteBookingFromPortal,
  findBookingById,
  refundBookingFromPortal,
  type BookingWithWorkshop,
} from "@/lib/bookings";
import {
  cancellationEmail,
  refundFailedNoticeEmail,
  refundIssuedEmail,
  sendBookingMail,
} from "@/lib/email/bookings";
import { getSession } from "@/lib/auth/server";

/**
 * The three things Marianne can do to a booking somebody has paid for.
 *
 * Co-located with the page they are pressed from. Each one does the same four
 * things in the same order, and the order is the point:
 *
 *   1. Refuse anyone who is not signed in.
 *   2. Re-read the booking FROM THE DATABASE. What the browser posts is an id
 *      and nothing else — never an amount, never a status, never whether a
 *      refund is allowed. The row on the screen may be minutes old, and the
 *      rules are applied to what is true now.
 *   3. Do the thing, in `lib/bookings`, where the money lives.
 *   4. Tell the buyer what happened, in words read off the booking afterwards.
 *
 * EVERY ADMIN-INITIATED CANCELLATION AND REFUND SENDS THE BUYER AN EMAIL. They
 * paid for something and something has changed about it; finding out by turning
 * up, or by noticing a figure on a statement, is not a way to be told. The one
 * message that goes to Marianne is the refund Stripe refused, because that is
 * the one thing left needing doing when she closes the screen.
 *
 * Errors come back as a sentence rather than being thrown. Every one of these
 * is pressed inside a modal that says what it is about to do, and the same
 * modal is where the answer belongs if it could not.
 */

export type ActionState = {
  /** Drawn inside the modal that was open. Null when it worked. */
  error: string | null;
  /** Stamped on success so the modal knows to close itself. */
  done: number;
};

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  // The admin layout already turned away anyone without a session, but a server
  // action is a POST endpoint of its own: it can be called directly, and it
  // does not inherit the layout's check.
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** The booking as it is NOW, not as the page drew it. */
async function reread(formData: FormData): Promise<BookingWithWorkshop | null> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return null;
  return findBookingById(id);
}

const GONE = "That booking is no longer here.";

/**
 * Everything a released place changes.
 *
 * The public pages count places from the paid bookings and are prerendered, so
 * without this she cancels somebody and the workshop page keeps showing the
 * room as full.
 */
function revalidateEverywhere(booking: BookingWithWorkshop) {
  revalidatePath("/");
  revalidatePath("/workshops");
  revalidatePath(`/workshops/${booking.workshop.slug}`);
  revalidatePath("/admin/workshop-bookings");
  revalidatePath("/admin/offerings");
}

// ── cancel ───────────────────────────────────────────────────────────────────

/**
 * Release the place, and send the money back or don't.
 *
 * The choice arrives as a field because it is genuinely hers: the modal only
 * offers it while the booking is still inside its OWN workshop's refund period,
 * and `cancelBookingFromPortal` checks that again rather than believing the
 * form. Past the period the modal has one button and this receives
 * `refund=no`, which is the only thing it could mean there.
 */
export async function cancelPlace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const booking = await reread(formData);
  if (!booking) return { error: GONE, done: 0 };

  const result = await cancelBookingFromPortal(booking, {
    refund: formData.get("refund") === "yes",
  });

  if (result.outcome === "refused") {
    return { error: result.reason, done: 0 };
  }

  // The email is composed from the booking AFTER the write, so what it says
  // about the money is what the ledger says. Both endings are told about — the
  // ordinary one, and the one where the place came back and the money did not.
  await sendBookingMail(
    cancellationEmail(result.booking, "marianne"),
    "cancellation (from the portal)",
  );

  if (result.outcome === "refundFailed") {
    await sendBookingMail(
      refundFailedNoticeEmail(result.booking, result.error),
      "refund-failed notice",
    );
    revalidateEverywhere(booking);
    return {
      error: `The place is released and ${result.booking.buyerName} has been told, but Stripe would not send the money back: ${result.error}. The booking says the money has not gone, and an email is in your inbox with what refunding it by hand needs.`,
      done: 0,
    };
  }

  revalidateEverywhere(booking);
  return { error: null, done: Date.now() };
}

// ── refund ───────────────────────────────────────────────────────────────────

/**
 * Send the money back on its own.
 *
 * Reachable two ways and the same either way: on a booking she cancelled
 * earlier and kept the money for, and on one that is still live, where it means
 * she has decided not to charge somebody who is still coming. The second leaves
 * the place held, which is what the email tells them in as many words.
 */
export async function refundPlace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const booking = await reread(formData);
  if (!booking) return { error: GONE, done: 0 };

  const result = await refundBookingFromPortal(booking);

  if (result.outcome === "refused") {
    return { error: result.reason, done: 0 };
  }
  if (result.outcome === "failed") {
    // Nothing was written, so nothing on the screen changes and nothing claims
    // a refund happened. She gets the durable copy as well as the sentence.
    await sendBookingMail(
      refundFailedNoticeEmail(booking, result.error),
      "refund-failed notice",
    );
    return {
      error: `Stripe would not send the money back: ${result.error}. Nothing has changed — the booking says the money is still with you. There is an email in your inbox with what refunding it by hand needs.`,
      done: 0,
    };
  }

  await sendBookingMail(refundIssuedEmail(result.booking), "refund");
  revalidateEverywhere(booking);
  return { error: null, done: Date.now() };
}

// ── delete ───────────────────────────────────────────────────────────────────

/**
 * Take the record away for good.
 *
 * No email. Deleting changes nothing for the buyer — their place was released
 * when it was cancelled and they were told then — and a message saying "your
 * cancelled booking has been removed from our records" would be a message about
 * our filing arriving in somebody else's inbox.
 *
 * Refused on a booking that is still `paid`, here as well as in the button that
 * is drawn disabled. A disabled button is a courtesy; this is the rule.
 */
export async function deletePlace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const booking = await reread(formData);
  if (!booking) return { error: GONE, done: 0 };

  const result = await deleteBookingFromPortal(booking);
  if (!result.ok) return { error: result.reason, done: 0 };

  // The place was already released by the cancellation, so nothing public
  // changes — but the workshop can now be deletable where it was not, and that
  // is read on the offerings screen.
  revalidateEverywhere(booking);
  return { error: null, done: Date.now() };
}
