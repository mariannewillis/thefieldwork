"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/content/site";
import { placesLeft, placesSold } from "@/lib/bookings";
import { formatDayLong, isPast } from "@/lib/format";
import {
  paymentsConfigured,
  SITE_METADATA_KEY,
  stripe,
  thisSite,
} from "@/lib/stripe";
import { getPublishedWorkshopBySlug } from "@/lib/workshops";

/**
 * Opening a checkout.
 *
 * Co-located with the panel it is submitted from, the way the portal's form
 * and its rules live together. The browser sends TWO things and neither is
 * trusted: which workshop, and how many places. Everything else — the price,
 * the currency, the total, whether there is room — is worked out here from the
 * database. A price that arrives from a browser is a price somebody can edit.
 *
 * The capacity check here is the FIRST of two (D-16). It stops somebody being
 * sent to a checkout for a place that has already gone, which is the common
 * case. It cannot stop two people paying for the last place at the same moment
 * — nothing at this end can, because neither of them has paid yet — and that
 * is what the second check, under a lock in the webhook, is for.
 *
 * Nothing here throws when Stripe is unconfigured. The panel does not draw a
 * button in that state, so reaching this at all means a form was posted
 * directly; it gets a sentence back, not a stack trace.
 */

export type CheckoutState = { error: string | null };

export async function startCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const workshop = await getPublishedWorkshopBySlug(slug);

  if (!workshop) {
    return { error: "That workshop is no longer on the site." };
  }
  if (isPast(workshop.date)) {
    return { error: "That day has been and gone." };
  }
  if (!paymentsConfigured()) {
    return { error: "Places cannot be bought on this site yet." };
  }

  const left = placesLeft(workshop.capacity, await placesSold(workshop.id));
  if (left === 0) {
    return {
      error:
        "The last place went while this page was open. Nothing has been charged.",
    };
  }

  const asked = Number(formData.get("places"));
  if (!Number.isInteger(asked) || asked < 1) {
    return { error: "Choose how many places you would like." };
  }
  if (asked > left) {
    return {
      error:
        left === 1
          ? "There is one place left, and you have asked for more than that."
          : `There are ${left} places left, and you have asked for more than that.`,
    };
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: asked,
        price_data: {
          currency: "gbp",
          // PENCE, straight from the row. The stepper's running total is a
          // courtesy; this is the figure that gets charged.
          unit_amount: workshop.priceGBP,
          product_data: {
            name: workshop.name,
            description: `${formatDayLong(workshop.date)} · ${workshop.venueName}`,
          },
        },
      },
    ],
    // The buyer's name comes back with the billing address, and their email
    // Stripe always collects. Asking for either on our own page would be
    // asking twice, and the panel as approved does not ask at all.
    billing_address_collection: "required",
    success_url: `${SITE_URL}/workshops/${workshop.slug}/booked?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/workshops/${workshop.slug}#book`,
    // What the webhook needs to turn a payment into a place. The name is
    // carried too, so the rare payment for a workshop that has since been
    // taken down can still be written about in words.
    //
    // And which site opened it. The live endpoint is sent every completed
    // session on the account, including the ones bought on a preview whose
    // workshops the live database has never held; without this stamp it read
    // those as a workshop withdrawn mid-checkout and refunded a stranger's
    // payment (D-19).
    metadata: {
      workshopId: String(workshop.id),
      workshopName: workshop.name,
      places: String(asked),
      [SITE_METADATA_KEY]: thisSite,
    },
  });

  if (!session.url) {
    // Stripe has always given one; if it ever does not, saying so is better
    // than redirecting to the word "null".
    console.error(
      `[stripe] session ${session.id} came back with no url; nobody was sent to pay.`,
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
