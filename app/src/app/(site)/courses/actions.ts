"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/content/site";
import { coursePlacesSold, offeredWays, placesLeft } from "@/lib/bookings";
import { chargeForChoice, type PayChoice } from "@/lib/instalments-shape";
import { runShape } from "@/lib/course-run";
import { getPublishedCourseBySlug } from "@/lib/courses";
import { isPast } from "@/lib/format";
import {
  paymentsConfigured,
  SITE_METADATA_KEY,
  stripe,
  thisSite,
} from "@/lib/stripe";

/**
 * Opening a checkout for a place on a course.
 *
 * The workshop's sibling (`../workshops/actions.ts`) and deliberately the same
 * shape: the browser sends TWO things and neither is trusted — which course,
 * and how many places. The price, the deposit, the total, the balance date and
 * whether there is room are all worked out here from the database. A price that
 * arrives from a browser is a price somebody can edit.
 *
 * The capacity check here is the FIRST of two (D-16). It stops somebody being
 * sent to a checkout for a place that has already gone, which is the common
 * case. It cannot stop two people paying for the last place at the same moment
 * — nothing at this end can, because neither of them has paid yet — and that
 * is what the second check, under a lock in the webhook, is for.
 *
 * WHAT IS CHARGED IS WHAT THE BUYER CHOSE, of the ways this course offers
 * (operator, 2026-08-21). Three things now arrive from the browser rather than
 * two, and the third is trusted exactly as little as the others: the choice is
 * checked against `offeredWays` — the same function the panel drew its buttons
 * from and the webhook applies again under its lock — and a choice the course
 * does not offer is refused rather than quietly downgraded, because somebody
 * who picked a plan and was charged the lot has a complaint, not a checkout.
 *
 * The rest, whichever way they chose, is asked for by a link the buyer already
 * holds rather than by a second checkout opened now: nothing here runs on a
 * schedule, and a link needs no scheduler to be correct.
 */

export type CheckoutState = { error: string | null };

export async function startCourseCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const course = await getPublishedCourseBySlug(slug);

  if (!course) {
    return { error: "That course is no longer on the site." };
  }

  const run = runShape(course.sessions);
  if (!run) {
    return { error: "That course has no dates on it yet." };
  }
  // The whole run, not the first date: a course is bought once and covers every
  // date, so it is over when the last of them has been.
  if (isPast(run.last)) {
    return { error: "That run has finished." };
  }
  if (!paymentsConfigured()) {
    return { error: "Places cannot be bought on this site yet." };
  }

  const left = placesLeft(course.capacity, await coursePlacesSold(course.id));
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

  // ── WHICH WAY THEY CHOSE ────────────────────────────────────────────────
  //
  // ONE RULE, USED IN THREE PLACES. `offeredWays` is the same function the
  // panel drew its buttons from and the webhook applies again under its lock;
  // the figure on the button and the figure the card is charged cannot come
  // apart, because there is only one test.
  const wanted = String(formData.get("payment") ?? "full");
  const ways = offeredWays(course);
  if (wanted !== "full" && wanted !== "deposit" && wanted !== "plan") {
    return { error: "Choose how you would like to pay." };
  }
  const choice: PayChoice = wanted;

  if (!ways.includes(choice)) {
    // The page was open while she changed the course, or the deposit's day
    // passed between the load and the press. Said plainly and charged nothing
    // — the alternative is taking the whole price from somebody who asked to
    // pay a sixth of it.
    return {
      error:
        choice === "deposit"
          ? "That course is no longer taking a deposit. Nothing has been charged — reload the page for the ways to pay it does take."
          : "That course is no longer offering a payment plan. Nothing has been charged — reload the page for the ways to pay it does take.",
    };
  }

  const money = chargeForChoice({
    choice,
    pricePence: course.priceGBP,
    places: asked,
    depositPence: course.depositGBP,
    parts: course.instalments,
    interestBps: course.planInterestBps,
  });

  // A PLAN'S SHARE IS FOR THE WHOLE BOOKING, not for one place: the rounding
  // penny lives on the last part of the plan and does not divide by places. So
  // its line is a single item that says what it is, where a full price and a
  // deposit stay per-place and keep the quantity Stripe shows on its own page.
  const line =
    choice === "plan"
      ? {
          quantity: 1,
          price_data: {
            currency: "gbp" as const,
            unit_amount: money.chargePence,
            product_data: {
              name: `${course.name} — payment 1 of ${course.instalments}`,
              description: `${asked} ${asked === 1 ? "place" : "places"} · ${run.words} · ${run.span}`,
            },
          },
        }
      : {
          quantity: asked,
          price_data: {
            currency: "gbp" as const,
            unit_amount: Math.round(money.chargePence / asked),
            product_data: {
              name:
                choice === "deposit" ? `${course.name} — deposit` : course.name,
              description: `${run.words} · ${run.span} · ${course.venueName}`,
            },
          },
        };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [line],
    // The buyer's name comes back with the billing address, and their email
    // Stripe always collects. Asking for either on our own page would be
    // asking twice, and the panel as approved does not ask at all.
    billing_address_collection: "required",
    success_url: `${SITE_URL}/courses/${course.slug}/booked?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/courses/${course.slug}#book`,
    // What the webhook needs to turn a payment into a place, and which site
    // opened it (D-19). The name is carried too, so the rare payment for a
    // course that has since been taken down can still be written about in
    // words. `payment` is the way they chose — checked again at the far end.
    metadata: {
      courseId: String(course.id),
      offeringName: course.name,
      places: String(asked),
      payment: choice,
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
