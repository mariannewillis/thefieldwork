"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/content/site";
import {
  coursePlacesSold,
  findBookingByBalanceToken,
  hasLapsed,
  isSettled,
  offeringOf,
  outstandingPence,
  placesLeft,
} from "@/lib/bookings";
import {
  paymentsConfigured,
  SITE_METADATA_KEY,
  stripe,
  thisSite,
} from "@/lib/stripe";

/**
 * Paying the rest.
 *
 * The token in the form is the whole credential — there is no session here and
 * there should not be one, because the person paying is a member of the public
 * who bought a place, not somebody with an account. It is looked up the same
 * way the page looked it up: by hash, refusing anything that does not match.
 *
 * A FRESH CHECKOUT SESSION ON EVERY PRESS, and that is the reason the link
 * points here rather than at Stripe. A Checkout URL expires within a day; this
 * page is still correct in six weeks, because the session is made at the moment
 * somebody decides to pay. It also means the amount charged is worked out now,
 * from the booking and its payments, rather than fixed at the moment the
 * confirmation email was written.
 *
 * EVERY RULE THE PAGE DREW IS APPLIED AGAIN HERE. A server action is a POST
 * endpoint of its own, so a page that no longer offers the button is not a
 * rule — and between the page rendering and the button being pressed, the
 * booking can have been cancelled, settled in another tab, or lapsed and lost
 * its chair.
 */

export type PayState = { error: string | null };

export async function payBalance(
  _previous: PayState,
  formData: FormData,
): Promise<PayState> {
  const token = String(formData.get("token") ?? "");
  const booking = await findBookingByBalanceToken(token);

  if (!booking) {
    return { error: "This link no longer works." };
  }
  if (!paymentsConfigured()) {
    return { error: "Payments cannot be taken on this site yet." };
  }
  if (booking.status !== "paid") {
    return {
      error:
        "This place has been cancelled, so there is nothing left to pay. Nothing has been charged.",
    };
  }
  if (isSettled(booking)) {
    return {
      error: "This one is already paid in full. Nothing has been charged.",
    };
  }

  const offering = offeringOf(booking);
  const owed = outstandingPence(booking);

  // A place whose balance went unpaid stopped counting the day after it was
  // due, so paying now is asking for it back — which is only ours to give
  // while nobody else has taken it. Checked here and again under the lock in
  // the webhook, where a race between two people is actually decided.
  if (hasLapsed(booking) && booking.courseId !== null) {
    const sold = await coursePlacesSold(booking.courseId);
    if (booking.places > placesLeft(offering.capacity, sold)) {
      return {
        error:
          "The balance on this one was overdue, so the place was released — and it has since gone to somebody else. Nothing has been charged. Write to Marianne if you would still like a place.",
      };
    }
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          // PENCE, worked out from the booking's own total less what has
          // actually arrived. Not a figure from the form, and not the figure
          // written into the email weeks ago.
          unit_amount: owed,
          product_data: {
            name: `${offering.name} — balance`,
            description: `${booking.places === 1 ? "One place" : `${booking.places} places`} · the rest of ${offering.name}`,
          },
        },
      },
    ],
    billing_address_collection: "required",
    // The same confirmation page a first payment lands on. It looks the
    // booking up by session id and draws what it finds, so it says "paid in
    // full" here without knowing which of the two payments brought it there.
    success_url: `${SITE_URL}/courses/${offering.slug}/booked?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/pay/${token}`,
    // WHICH BOOKING THIS SETTLES. The webhook branches on this key before it
    // reads anything else, so a balance can never be mistaken for a new place
    // — and the site stamp keeps a preview's balance out of the live site's
    // ledger (D-19).
    metadata: {
      balanceFor: String(booking.id),
      offeringName: offering.name,
      [SITE_METADATA_KEY]: thisSite,
    },
  });

  if (!session.url) {
    console.error(
      `[stripe] balance session ${session.id} came back with no url; nobody was sent to pay.`,
    );
    return {
      error:
        "Stripe did not give us a checkout page. Nothing has been charged.",
    };
  }

  // Outside every try/catch on purpose: redirect() works by throwing, and a
  // catch around it would turn a successful redirect into an error message.
  redirect(session.url);
}
