import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import {
  bookingReference,
  confirmBalancePayment,
  confirmPaidBooking,
  coursePlacesSold,
  findBookingBySession,
  offeringOf,
  placesLeft,
  placesSold,
  refundOnePayment,
  refundSoldOut,
} from "@/lib/bookings";
import {
  balanceNoticeEmail,
  balancePaidEmail,
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
 *  - Delivery happens more than once. Stripe retries until it gets a 2xx,
 *    sends duplicates of its own accord, and the dashboard can replay one by
 *    hand. The event id is written FIRST inside the transaction that confirms
 *    the payment, before the offering is looked for — so it is recorded on
 *    every path that goes on to act, not only the one that writes a Booking.
 *    A second delivery collides on it and this handler does nothing: no
 *    booking, no payment, no refund, no email (D-20).
 *  - Capacity is counted again HERE, under a lock, not trusted from when the
 *    checkout was opened (D-16).
 *  - A session opened by a DIFFERENT deployment is put down untouched. One
 *    Stripe account serves the live site and every preview of it, and every
 *    endpoint on the account is sent every completed session, so "this event is
 *    not mine" is an ordinary thing that happens and not an error (D-19).
 *  - An unexpected failure is left to become a 500 on purpose, so Stripe
 *    retries it. Swallowing it into a 200 would lose the payment quietly.
 *
 * THREE THINGS CAN BE BEING PAID FOR (D-23), and the session's own metadata
 * says which: a place on a workshop, a place on a course, or the balance on a
 * course place already held. Which one it is decides everything below, so it is
 * read once, at the top, from a field this app wrote when it opened the
 * session — never inferred from which other fields happen to be present.
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

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // What they were CHARGED, from Stripe. Never a figure the browser sent.
  const amountPence = session.amount_total ?? 0;
  const currency = session.currency ?? "gbp";

  if (session.metadata?.balanceFor) {
    return settleBalance({
      event,
      session,
      bookingId: Number(session.metadata.balanceFor),
      amountPence,
      currency,
      paymentIntentId,
    });
  }

  const workshopId = Number(session.metadata?.workshopId);
  const courseId = Number(session.metadata?.courseId);
  // `workshopName` is what this key was called before courses could be bought.
  // A Checkout Session lives for about a day, so for one day after the deploy
  // that carries this change there are real sessions in flight still carrying
  // the old spelling — and the one message that reads it is the apology for a
  // withdrawn offering, which is the worst place to print "an offering".
  const offeringName =
    session.metadata?.offeringName ??
    session.metadata?.workshopName ??
    "an offering";
  const places = Number(session.metadata?.places);

  const offering =
    Number.isInteger(workshopId) && workshopId > 0
      ? ({ kind: "workshop", id: workshopId } as const)
      : Number.isInteger(courseId) && courseId > 0
        ? ({ kind: "course", id: courseId } as const)
        : null;

  if (!offering || !Number.isInteger(places) || places < 1) {
    // A completed session on this account that this app did not open — a
    // payment link, or an invoice she made in the dashboard. Deliberately NOT
    // refunded: automatically returning money we cannot account for is worse
    // than leaving it for a person to look at.
    //
    // Nothing is written, for the same reason as the foreign guard above: this
    // branch takes no action, so there is no action to protect from happening
    // twice, and a redelivery landing here again is a second helping of
    // nothing. The same is true of the unpaid branch before it.
    console.error(
      `[stripe] session ${session.id} completed with no usable metadata (workshopId=${session.metadata?.workshopId}, courseId=${session.metadata?.courseId}, places=${session.metadata?.places}). No booking written. If this was a real payment it needs sorting out by hand.`,
    );
    return Response.json({ received: true, acted: false });
  }

  const result = await confirmPaidBooking({
    eventId: event.id,
    eventType: event.type,
    offering,
    places,
    amountPence,
    currency,
    buyerName: session.customer_details?.name?.trim() || "Someone",
    buyerEmail:
      session.customer_details?.email?.trim() || session.customer_email || "",
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    paidAt: new Date(event.created * 1000),
  });

  switch (result.outcome) {
    case "alreadyHandled":
      // Its own line, and its own opening words, because this is the one that
      // has to be findable after a backlog clears: it is the difference
      // between a wave of redeliveries costing nothing and a buyer being
      // apologised to twice. A retry, a duplicate and a dashboard replay all
      // arrive looking exactly like this.
      console.info(
        `[stripe] ALREADY SEEN — event ${event.id} (session ${session.id}) was acted on when it first arrived, so nothing has been done again: no booking, no refund, no email. Its outcome the first time is on the StripeEvent row.`,
      );
      return Response.json({ received: true, acted: false, replay: true });

    case "confirmed": {
      const { booking, cancelToken, balanceToken } = result;
      const own = offeringOf(booking);
      const left = placesLeft(own.capacity, await soldNow(offering));
      console.info(
        `[stripe] ${bookingReference(booking.id)} — ${booking.places} place(s) on ${own.slug}, ${left} left.`,
      );
      revalidateFor(own.kind, own.slug);
      await sendBookingMail(
        confirmationEmail(booking, {
          cancel: cancelToken,
          balance: balanceToken,
        }),
        "confirmation",
      );
      await sendBookingMail(
        bookingNoticeEmail(booking, left),
        "booking notice",
      );
      return Response.json({ received: true, acted: true });
    }

    case "noPlace": {
      const { booking } = result;
      const own = offeringOf(booking);
      const { refunded, error } = await refundSoldOut(booking);
      await sendBookingMail(
        cannotHonourEmail({
          to: booking.buyerEmail,
          offeringName: own.name,
          offeringDay: formatDayLong(own.firstDate),
          amountPence,
          why: "soldOut",
          refunded,
        }),
        "sold-out refund",
      );
      await sendBookingMail(
        cannotHonourNoticeEmail({
          offeringName: own.name,
          offeringDay: formatDayLong(own.firstDate),
          buyerEmail: booking.buyerEmail,
          amountPence,
          why: "soldOut",
          refunded,
          reference: bookingReference(booking.id),
          error,
        }),
        "sold-out notice",
      );
      return Response.json({ received: true, acted: true });
    }

    case "offeringGone": {
      // Rare: the day, or the run, was taken off the site while somebody was
      // at the checkout. There is no Booking to write — the thing it would
      // point at is gone — so the refund is issued straight against the
      // payment and the log, these two emails and the StripeEvent row are the
      // record.
      //
      // REACHED ONCE PER EVENT. The transaction that found it missing recorded
      // the event id and stamped the outcome before returning, so everything
      // below runs on the first delivery and on no other. The refund would
      // survive a repeat by itself — its idempotency key is the session — but
      // the emails would not, and an apology arriving twice is the thing a
      // buyer actually notices (D-20).
      //
      // THIS SITE'S OWN SESSION, on something this site no longer has. The
      // foreign-event case above looks identical from in here — an id the
      // database cannot find — and refunding one as if it were the other is
      // exactly what went wrong (D-19). The stamp is what separates them, and
      // the log lines below are written to be told apart at a glance.
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
        `[stripe] ${result.kind === "workshop" ? "WORKSHOP" : "COURSE"} WITHDRAWN — session ${session.id} was opened by this site (${thisSite}) and paid for ${result.kind} ${offering.id}, which has since been taken off it. Refund ${refunded ? "issued" : `FAILED: ${error}`}, and the buyer has been written to.`,
      );
      if (buyer) {
        await sendBookingMail(
          cannotHonourEmail({
            to: buyer,
            offeringName,
            offeringDay: "the day you booked",
            amountPence,
            why: "offeringGone",
            refunded,
          }),
          "withdrawn-workshop refund",
        );
      }
      await sendBookingMail(
        cannotHonourNoticeEmail({
          offeringName,
          offeringDay: "the day it was taken down",
          buyerEmail: buyer ?? "an address Stripe did not give us",
          amountPence,
          why: "offeringGone",
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

/**
 * The second half of a course place.
 *
 * The place was committed by the deposit and nothing about the room changes
 * here — what changes is that the booking stops being outstanding. So there is
 * no capacity check on the ordinary path, and one only where the booking had
 * already lapsed: see `confirmBalancePayment`.
 */
async function settleBalance(args: {
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
  bookingId: number;
  amountPence: number;
  currency: string;
  paymentIntentId: string | null;
}): Promise<Response> {
  const { event, session, bookingId, amountPence, currency } = args;

  if (!Number.isInteger(bookingId) || bookingId < 1) {
    console.error(
      `[stripe] session ${session.id} is stamped as a balance for "${session.metadata?.balanceFor}", which is not a booking. Nothing written; it needs sorting out by hand.`,
    );
    return Response.json({ received: true, acted: false });
  }

  const result = await confirmBalancePayment({
    eventId: event.id,
    eventType: event.type,
    bookingId,
    amountPence,
    currency,
    stripeSessionId: session.id,
    stripePaymentIntentId: args.paymentIntentId,
    paidAt: new Date(event.created * 1000),
  });

  switch (result.outcome) {
    case "alreadyHandled":
      console.info(
        `[stripe] ALREADY SEEN — event ${event.id} (session ${session.id}) was acted on when it first arrived, so nothing has been done again: no payment, no refund, no email.`,
      );
      return Response.json({ received: true, acted: false, replay: true });

    case "settled": {
      const { booking } = result;
      const own = offeringOf(booking);
      console.info(
        `[stripe] ${bookingReference(booking.id)} — balance paid on ${own.slug}. Nothing outstanding.`,
      );
      // The place was never released, so nothing about the count changes —
      // except on a booking that had lapsed, where paying takes the place back
      // and every page that counts places is now wrong. Revalidating either
      // way costs one render and is right in both.
      revalidateFor(own.kind, own.slug);
      await sendBookingMail(balancePaidEmail(booking), "balance receipt");
      await sendBookingMail(balanceNoticeEmail(booking), "balance notice");
      return Response.json({ received: true, acted: true });
    }

    case "bookingGone": {
      const buyer = session.customer_details?.email ?? session.customer_email;
      let refunded = false;
      let error: string | undefined;
      try {
        if (!args.paymentIntentId)
          throw new Error("the session has no payment");
        await stripe().refunds.create(
          { payment_intent: args.paymentIntentId },
          { idempotencyKey: `refund-session-${session.id}` },
        );
        refunded = true;
      } catch (e) {
        error = e instanceof Error ? e.message : "unknown error";
      }
      console.error(
        `[stripe] BALANCE FOR A BOOKING THAT IS GONE — session ${session.id} paid a balance on booking ${bookingId}, which no longer exists. Refund ${refunded ? "issued" : `FAILED: ${error}`}.`,
      );
      if (buyer) {
        await sendBookingMail(
          cannotHonourEmail({
            to: buyer,
            offeringName: "your course place",
            offeringDay: "the dates you booked",
            amountPence,
            why: "placeReleased",
            refunded,
          }),
          "unwanted-balance refund",
        );
      }
      await sendBookingMail(
        cannotHonourNoticeEmail({
          offeringName: "a course place that has been deleted",
          offeringDay: "—",
          buyerEmail: buyer ?? "an address Stripe did not give us",
          amountPence,
          why: "placeReleased",
          refunded,
          reference: null,
          error,
        }),
        "unwanted-balance notice",
      );
      return Response.json({ received: true, acted: true });
    }

    case "unwanted": {
      // The place had been cancelled, or it had lapsed and the chair had gone
      // to somebody else while they were paying. ONLY THIS PAYMENT goes back —
      // the deposit is a separate question and it is Marianne's, which is what
      // her notice says.
      const { booking, why } = result;
      const own = offeringOf(booking);
      const { refunded, error } = await refundOnePayment(booking, session.id);
      console.error(
        `[stripe] BALANCE NOT WANTED — session ${session.id} paid the balance on ${bookingReference(booking.id)} but ${why}. Refund ${refunded ? "issued" : `FAILED: ${error}`}.`,
      );
      await sendBookingMail(
        cannotHonourEmail({
          to: booking.buyerEmail,
          offeringName: own.name,
          offeringDay: formatDayLong(own.firstDate),
          amountPence,
          why: "placeReleased",
          refunded,
        }),
        "unwanted-balance refund",
      );
      await sendBookingMail(
        cannotHonourNoticeEmail({
          offeringName: own.name,
          offeringDay: formatDayLong(own.firstDate),
          buyerEmail: booking.buyerEmail,
          amountPence,
          why: "placeReleased",
          refunded,
          reference: bookingReference(booking.id),
          error,
        }),
        "unwanted-balance notice",
      );
      return Response.json({ received: true, acted: true });
    }
  }
}

function soldNow(offering: {
  kind: "workshop" | "course";
  id: number;
}): Promise<number> {
  return offering.kind === "workshop"
    ? placesSold(offering.id)
    : coursePlacesSold(offering.id);
}

/**
 * A place has gone, so every page that prints how many are left is now out of
 * date. The public pages are cached and would otherwise keep serving the old
 * count until something else happened to change them.
 */
function revalidateFor(kind: "workshop" | "course", slug: string) {
  revalidatePath(kind === "workshop" ? "/workshops" : "/courses");
  revalidatePath(
    kind === "workshop" ? `/workshops/${slug}` : `/courses/${slug}`,
  );
  revalidatePath("/");
}
