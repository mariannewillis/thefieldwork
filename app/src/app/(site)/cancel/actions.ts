"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBooking,
  findBookingByToken,
  placesLeft,
  placesSold,
} from "@/lib/bookings";
import {
  cancellationEmail,
  cancellationNoticeEmail,
  sendBookingMail,
} from "@/lib/email/bookings";

/**
 * Giving a place back.
 *
 * The token in the form is the whole credential — there is no session here and
 * there should not be one, because the person cancelling is a member of the
 * public who bought a place, not somebody with an account. It is looked up the
 * same way the page looked it up: by hash, refusing anything that does not
 * match, and refusing a link for a day that has been and gone.
 *
 * SAFE TO PRESS TWICE, which it will be — this link sits in an inbox and gets
 * clicked in a hurry, often from two devices. `cancelBooking` refunds through
 * Stripe under an idempotency key and then writes conditionally on the booking
 * still being paid, so exactly one call comes back as the one that cancelled
 * it, and only that one sends the emails. The rest fall through to the
 * "already cancelled" state, which the approved page draws as reassurance
 * rather than an error.
 *
 * No return value and no error state. Every outcome is readable from the
 * booking itself when the page re-renders — refunded, past the date, or owed —
 * so there is nothing to carry across in a query string that could go stale.
 */
export async function cancelPlace(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const booking = await findBookingByToken(token);
  if (!booking) return;

  const result = await cancelBooking(booking);

  // Both endings are told about: the ordinary one, and the one where the place
  // came back and the money did not. What each email SAYS is read off the
  // booking, so neither can claim a refund that failed. Only "alreadyCancelled"
  // stays silent — somebody has already had both of these.
  if (result.outcome === "cancelled" || result.outcome === "refundFailed") {
    const left = placesLeft(
      booking.workshop.capacity,
      await placesSold(booking.workshopId),
    );
    await sendBookingMail(cancellationEmail(result.booking), "cancellation");
    await sendBookingMail(
      cancellationNoticeEmail(result.booking, left),
      "cancellation notice",
    );
  }

  // The place is back, so every page that counts places is now wrong.
  revalidatePath("/workshops");
  revalidatePath(`/workshops/${booking.workshop.slug}`);
  revalidatePath("/");
}
