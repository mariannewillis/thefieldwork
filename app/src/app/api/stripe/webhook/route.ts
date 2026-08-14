import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import {
  bookingReference,
  confirmPaidBooking,
  placesLeft,
  placesSold,
  refundSoldOut,
} from "@/lib/bookings";
import {
  bookingNoticeEmail,
  cannotHonourEmail,
  cannotHonourNoticeEmail,
  confirmationEmail,
  sendBookingMail,
} from "@/lib/email/bookings";
import { formatDayLong } from "@/lib/format";
import {
  paymentsConfigured,
  SITE_METADATA_KEY,
  stripe,
  thisSite,
  webhookSecret,
  whoseSession,
} from "@/lib/stripe";

/**
 * Stripe's word that a payment happened.
 *
 * THIS IS WHAT CONFIRMS A BOOKING — NEVER THE BROWSER REDIRECT. The success
 * URL Stripe sends somebody back to can be typed by anybody, kept from a
 * previous purchase, or never reached at all because the payment finished on a
 * phone that then lost signal. None of that is evidence. A signature-verified
 * `checkout.session.completed`, arriving here from Stripe's own servers, is
 * the only thing this app will make a paid Booking out of.
 *
 * Everything below follows from that:
 *
 *  - The signature is checked against STRIPE_WEBHOOK_SECRET before the payload
 *    is looked at. An unverified body is refused with a 400 and read no
 *    further; anyone can POST to this address.
 *  - Delivery happens more than once. Stripe retries until it gets a 2xx, and
 *    sends duplicates of its own accord. The event id is written inside the
 *    same transaction as the booking, so a redelivery cannot make a second
 *    booking or a second pair of emails (see confirmPaidBooking).
 *  - Capacity is counted again HERE, under a lock, not trusted from when the
 *    checkout was opened (D-16).
 *  - A session opened by a DIFFERENT deployment is put down untouched. One
 *    Stripe account serves the live site and every preview of it, and every
 *    endpoint on the account is sent every completed session, so "this event is
 *    not mine" is an ordinary thing that happens and not an error (D-19).
 *  - An unexpected failure is left to become a 500 on purpose, so Stripe
 *    retries it. Swallowing it into a 200 would lose the payment quietly.
 */
export async function POST(request: Request): Promise<Response> {
  if (!paymentsConfigured() || !webhookSecret) {
    // Not an error in the request — an unconfigured server. 503 so Stripe
    // retries later rather than treating the endpoint as broken for good.
    console.warn(
      "[stripe] a webhook arrived but Stripe is not fully configured; it has not been acted on.",
    );
    return new Response("Stripe is not configured on this server.", {
      status: 503,
    });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature ?? "",
      webhookSecret,
    );
  } catch (error) {
    console.warn(
      `[stripe] refused an unverified webhook: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return new Response("Signature could not be verified.", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Everything else on the account is somebody else's business. Answering
    // 200 stops Stripe retrying an event we are never going to act on.
    return Response.json({ received: true, acted: false });
  }

  const session = event.data.object;

  // WHOSE CHECKOUT WAS THIS. Asked before anything else about the session,
  // because a payment made somewhere else is not ours to read, count, book or
  // refund. The stamp is the opening site's own host, written at
  // checkout.sessions.create.
  //
  // Nothing is written for a foreign event, so its id never reaches StripeEvent
  // and a redelivery lands here again — which is fine: doing nothing twice is
  // doing nothing.
  const origin = whoseSession(session.metadata?.[SITE_METADATA_KEY]);

  if (origin === "elsewhere") {
    // 200, not an error. Stripe delivered it correctly; it simply belongs to
    // another deployment, which will have had its own copy and dealt with it.
    // A 4xx or 5xx here would have Stripe retrying an event we will never act
    // on until it gives up days later.
    console.warn(
      `[stripe] NOT THIS SITE'S EVENT — session ${session.id} was opened by ${session.metadata?.[SITE_METADATA_KEY]}, and this is ${thisSite}. Ignored: no booking, no refund, no email. Its own site has it. If that address is a preview taking real payments, give the preview its own test-mode Stripe keys.`,
    );
    return Response.json({ received: true, acted: false, foreign: true });
  }

  if (origin === "unstamped") {
    // Opened before the stamp existed, so there is no way to tell — and a
    // real payment is likelier than a foreign one. Treated as ours, and said
    // out loud, because these should stop appearing within a day of the deploy.
    console.info(
      `[stripe] session ${session.id} carries no ${SITE_METADATA_KEY} stamp; it predates the guard. Treating it as this site's (${thisSite}).`,
    );
  }

  // A session can complete before the money has actually arrived — bank
  // debits and other delayed methods. Only `paid` is a payment.
  if (session.payment_status !== "paid") {
    console.info(
      `[stripe] session ${session.id} completed with payment_status ${session.payment_status}; waiting for the money before booking anything.`,
    );
    return Response.json({ received: true, acted: false });
  }

  const workshopId = Number(session.metadata?.workshopId);
  const places = Number(session.metadata?.places);
  const workshopName = session.metadata?.workshopName ?? "a workshop";

  if (
    !Number.isInteger(workshopId) ||
    !Number.isInteger(places) ||
    places < 1
  ) {
    // A completed session on this account that this app did not open — a
    // payment link, or an invoice she made in the dashboard. Deliberately NOT
    // refunded: automatically returning money we cannot account for is worse
    // than leaving it for a person to look at.
    console.error(
      `[stripe] session ${session.id} completed with no usable metadata (workshopId=${session.metadata?.workshopId}, places=${session.metadata?.places}). No booking written. If this was a workshop payment it needs sorting out by hand.`,
    );
    return Response.json({ received: true, acted: false });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const result = await confirmPaidBooking({
    eventId: event.id,
    eventType: event.type,
    workshopId,
    places,
    // What they were CHARGED, from Stripe. Never a figure the browser sent.
    amountPence: session.amount_total ?? 0,
    currency: session.currency ?? "gbp",
    buyerName: session.customer_details?.name?.trim() || "Someone",
    buyerEmail:
      session.customer_details?.email?.trim() || session.customer_email || "",
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    paidAt: new Date(event.created * 1000),
  });

  switch (result.outcome) {
    case "alreadyHandled":
      console.info(
        `[stripe] event ${event.id} had already been acted on; nothing done twice.`,
      );
      return Response.json({ received: true, acted: false });

    case "confirmed": {
      const { booking, token } = result;
      const left = placesLeft(
        booking.workshop.capacity,
        await placesSold(booking.workshopId),
      );
      console.info(
        `[stripe] ${bookingReference(booking.id)} — ${booking.places} place(s) on ${booking.workshop.slug}, ${left} left.`,
      );
      // A place has gone, so every page that prints how many are left is now
      // out of date. The public pages are cached and would otherwise keep
      // serving the old count until something else happened to change them.
      revalidatePath("/workshops");
      revalidatePath(`/workshops/${booking.workshop.slug}`);
      revalidatePath("/");
      await sendBookingMail(confirmationEmail(booking, token), "confirmation");
      await sendBookingMail(
        bookingNoticeEmail(booking, left),
        "booking notice",
      );
      return Response.json({ received: true, acted: true });
    }

    case "noPlace": {
      const { booking } = result;
      const { refunded, error } = await refundSoldOut(booking);
      await sendBookingMail(
        cannotHonourEmail({
          to: booking.buyerEmail,
          workshopName: booking.workshop.name,
          workshopDay: formatDayLong(booking.workshop.date),
          amountPence: booking.amountPence,
          why: "soldOut",
          refunded,
        }),
        "sold-out refund",
      );
      await sendBookingMail(
        cannotHonourNoticeEmail({
          workshopName: booking.workshop.name,
          workshopDay: formatDayLong(booking.workshop.date),
          buyerEmail: booking.buyerEmail,
          amountPence: booking.amountPence,
          why: "soldOut",
          refunded,
          reference: bookingReference(booking.id),
          error,
        }),
        "sold-out notice",
      );
      return Response.json({ received: true, acted: true });
    }

    case "workshopGone": {
      // Rare: the day was taken off the site while somebody was at the
      // checkout. There is no Booking to write — the workshop it would point
      // at is gone — so the refund is issued straight against the payment and
      // the log plus these two emails are the whole record of it.
      //
      // THIS SITE'S OWN SESSION, on a workshop this site no longer has. The
      // foreign-event case above looks identical from in here — a workshopId
      // the database cannot find — and refunding one as if it were the other
      // is exactly what went wrong (D-19). The stamp is what separates them,
      // and the log lines below are written to be told apart at a glance.
      const amount = session.amount_total ?? 0;
      const buyer = session.customer_details?.email ?? session.customer_email;
      let refunded = false;
      let error: string | undefined;
      try {
        if (!paymentIntentId) throw new Error("the session has no payment");
        await stripe().refunds.create(
          { payment_intent: paymentIntentId },
          { idempotencyKey: `refund-session-${session.id}` },
        );
        refunded = true;
      } catch (e) {
        error = e instanceof Error ? e.message : "unknown error";
      }
      console.error(
        `[stripe] WORKSHOP WITHDRAWN — session ${session.id} was opened by this site (${thisSite}) and paid for workshop ${workshopId}, which has since been taken off it. Refund ${refunded ? "issued" : `FAILED: ${error}`}, and the buyer has been written to.`,
      );
      if (buyer) {
        await sendBookingMail(
          cannotHonourEmail({
            to: buyer,
            workshopName,
            workshopDay: "the day you booked",
            amountPence: amount,
            why: "workshopGone",
            refunded,
          }),
          "withdrawn-workshop refund",
        );
      }
      await sendBookingMail(
        cannotHonourNoticeEmail({
          workshopName,
          workshopDay: "the day it was taken down",
          buyerEmail: buyer ?? "an address Stripe did not give us",
          amountPence: amount,
          why: "workshopGone",
          refunded,
          reference: null,
          error,
        }),
        "withdrawn-workshop notice",
      );
      return Response.json({ received: true, acted: true });
    }
  }
}
