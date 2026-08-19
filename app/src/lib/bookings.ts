import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type {
  Booking,
  Course,
  CourseSession,
  Payment,
  Prisma,
  Service,
  ServiceRequest,
  Workshop,
} from "@prisma/client";
import { SITE_URL } from "@/content/site";
import { prisma } from "@/lib/db";
import { formatDayLong, isPast, refundDeadline } from "@/lib/format";
import { stripe } from "@/lib/stripe";

/**
 * Places, money and the links in the emails.
 *
 * Everything that must not half-happen is in here, because all of it is a
 * transition: a payment becomes a place, a second payment settles it, and a
 * place goes back. Who gets told about any of it is `lib/email/bookings.ts`;
 * the page and the webhook do the telling, so that a change of wording never
 * reaches into a transaction.
 *
 * THE RULE THAT SHAPES ALL OF IT (D-16): capacity is enforced. It is checked
 * when a Checkout Session is opened, and checked AGAIN under a lock when the
 * payment is confirmed, because between those two moments somebody else can
 * pay. The second check is the real one.
 *
 * AND THE ONE THAT SHAPES THE MONEY (D-23): a Booking says what is OWED and
 * its Payment rows say what CAME IN. Everything else about the money —
 * how much has been paid, how much is outstanding, whether it has gone back —
 * is the difference between those two, worked out where it is needed. None of
 * it is a column, because a column is a figure somebody has to keep correct
 * and arithmetic is not.
 *
 * A COURSE ON A DEPOSIT IS TWO PAYMENTS AND ONE PLACE. The place is committed
 * by the deposit; the balance arriving later changes nothing about the room. A
 * balance that never arrives releases the place — see `hasLapsed`, which is
 * derived rather than swept, so it is true the moment it becomes true and there
 * is nothing running that has to notice.
 */

// ── what a booking is for ────────────────────────────────────────────────────

/** A course as a booking needs it: with the run, because the run is the dates. */
export type CourseWithSessions = Course & { sessions: CourseSession[] };

/**
 * A booking with everything hanging off it. The only shape any page, email or
 * decision in this file wants — exactly one of `workshop`, `course` and
 * `service` is set, and the database refuses anything else
 * (`Booking_one_offering`).
 *
 * `serviceRequest` travels with `service` and never without it — the approval
 * is where a session's agreed time and agreed figure live, and the database
 * refuses one without the other (`Booking_service_from_request`).
 */
export type BookingWithOffering = Booking & {
  workshop: Workshop | null;
  course: CourseWithSessions | null;
  service: Service | null;
  serviceRequest: ServiceRequest | null;
  payments: Payment[];
};

/**
 * Read on every query, so nothing downstream has to ask twice.
 *
 * Exported because `lib/service-requests.ts` writes the third kind of booking
 * and has to return the same shape. One include, so a page cannot be handed a
 * booking whose service is missing depending on which module made it.
 */
export const withOffering = {
  workshop: true,
  course: { include: { sessions: { orderBy: { date: "asc" } } } },
  service: true,
  serviceRequest: true,
  payments: { orderBy: { paidAt: "asc" } },
} satisfies Prisma.BookingInclude;

/** One date of the thing that was bought. A workshop has one; a course has its run. */
export type OfferingDate = {
  date: Date;
  startTime: string;
  endTime: string;
  /** What this one is called. Empty on a workshop, which has no such thing. */
  title: string;
  venue: string;
};

/**
 * The thing that was bought, said the same way whichever of the three it was.
 *
 * A workshop, a course and a session differ in when they happen — a day, a run
 * of them, and a sentence two people agreed — and every page, email and rule
 * downstream of a booking wants the other facts identically. Normalising them
 * HERE means the ledger, the cancellation page and the emails each have one
 * shape to draw rather than three, and a rule about the refund date cannot
 * quietly be applied to one kind and not another.
 *
 * THE DATES ARE NULLABLE, AND ONLY A SESSION MAKES THEM SO. This is the one
 * fact a service genuinely cannot answer: there is no availability engine, so
 * `agreedTime` is her sentence and there is no day behind it (D-24, D-25). A
 * sentinel date would be a lie every reader would then print, so the type says
 * "there may be no day" and every reader has to have decided what that means.
 * `hasBeen()` below is the answer for almost all of them.
 */
export type Offering = {
  kind: "workshop" | "course" | "service";
  id: number;
  slug: string;
  name: string;
  /** Its own page on the site. */
  href: string;
  capacity: number;
  /**
   * Days before the day that it is still refundable in full. ZERO ON A SESSION,
   * which is not a refund policy but the absence of one: nothing anybody has
   * agreed says a session is refundable, so the automatic path returns nothing
   * and the money stays a decision of Marianne's, taken on the row (D-25).
   */
  refundDays: number;
  /**
   * The day, or the FIRST day of a run — what a refund is counted back from.
   * NULL on a session, which happens at a time agreed in words.
   */
  firstDate: Date | null;
  /** The last day. The same day as `firstDate` on a workshop; null on a session. */
  lastDate: Date | null;
  dates: OfferingDate[];
  /** Her answer to "when would suit you", as she wrote it. Null on the other two. */
  agreedTime: string | null;
  venueName: string;
  addressLines: string;
  postcode: string;
};

export function offeringOf(booking: BookingWithOffering): Offering {
  const { workshop, course, service, serviceRequest } = booking;

  if (workshop) {
    return {
      kind: "workshop",
      id: workshop.id,
      slug: workshop.slug,
      name: workshop.name,
      href: `/workshops/${workshop.slug}`,
      capacity: workshop.capacity,
      refundDays: workshop.refundDays,
      firstDate: workshop.date,
      lastDate: workshop.date,
      dates: [
        {
          date: workshop.date,
          startTime: workshop.startTime,
          endTime: workshop.endTime,
          title: "",
          venue: workshop.venueName,
        },
      ],
      agreedTime: null,
      venueName: workshop.venueName,
      addressLines: workshop.addressLines,
      postcode: workshop.postcode,
    };
  }

  if (service) {
    // WHERE A SESSION HAPPENS has two answers and no third, and the branch not
    // in force is null by constraint (`Service_location_branch`). A session she
    // travels for has no venue at all — the address is the client's, and this
    // side has never been told it — so what stands in its place is the sentence
    // her own service page prints. That is the honest version of an address
    // this system does not hold.
    const travels = service.location === "travels";
    return {
      kind: "service",
      id: service.id,
      slug: service.slug,
      name: service.name,
      href: `/services/${service.slug}`,
      // One-to-one means one. Nothing counts places on a session, and this is
      // here so that a reader which does gets the true answer rather than zero.
      capacity: 1,
      refundDays: 0,
      firstDate: null,
      lastDate: null,
      dates: [],
      agreedTime: serviceRequest?.agreedTime?.trim() || null,
      venueName: travels
        ? "She comes to you"
        : (service.venueName ?? "").trim(),
      addressLines: travels ? "" : (service.addressLines ?? ""),
      postcode: travels ? "" : (service.postcode ?? ""),
    };
  }

  if (!course) {
    // Unreachable while `Booking_one_offering` holds, and worth saying out
    // loud rather than typing `!` at every call site: if it ever does happen,
    // the row is money against nothing and somebody has to look at it.
    throw new Error(
      `Booking ${booking.id} points at no offering at all. The Booking_one_offering constraint should make that impossible.`,
    );
  }

  const dates = course.sessions;
  // A published course always has a date, but one can be taken off afterwards.
  // The course's own createdAt is a real date that sorts and formats; using it
  // keeps every reader of an Offering free of a null it cannot do anything
  // about, and a course with no run is a state the portal already refuses.
  const first = dates[0]?.date ?? course.createdAt;
  const last = dates[dates.length - 1]?.date ?? course.createdAt;

  return {
    kind: "course",
    id: course.id,
    slug: course.slug,
    name: course.name,
    href: `/courses/${course.slug}`,
    capacity: course.capacity,
    refundDays: course.refundDays,
    firstDate: first,
    lastDate: last,
    dates: dates.map((session) => ({
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      title: session.title,
      venue: session.venue,
    })),
    agreedTime: null,
    venueName: course.venueName,
    addressLines: course.addressLines,
    postcode: course.postcode,
  };
}

/**
 * Whether the thing that was bought has already happened.
 *
 * The one question almost every reader of `firstDate` / `lastDate` was really
 * asking, and the reason those two could become nullable without a `!` at every
 * call site.
 *
 * A SESSION IS NEVER "PAST", and that is a statement about what this system
 * knows rather than about the session. She and the client agreed a time in
 * words; nothing here can read that sentence, so nothing here may decide the
 * hour has been and quietly retire a cancellation link somebody still needs.
 * The archive on the ledger works the same way — a session stays in "still to
 * come" until it is cancelled, because the alternative is the portal filing it
 * on a date it invented.
 */
export function hasBeen(offering: Offering, now = new Date()): boolean {
  return offering.lastDate !== null && isPast(offering.lastDate, now);
}

/**
 * WHEN IT IS, in the one line a subject, a heading or a sentence has room for.
 *
 * "Saturday 14 November" for a workshop, the same for the first date of a run,
 * and her own agreed sentence for a session. Here rather than in each of the
 * three places that print it, so that a session cannot end up with an empty gap
 * in a sentence in one of them.
 *
 * The fallback covers a session whose agreed time is somehow missing: "the time
 * you agreed" is true even then, where a blank is not.
 */
export function whenWords(offering: Offering): string {
  if (offering.firstDate) return formatDayLong(offering.firstDate);
  return offering.agreedTime ?? "the time you agreed";
}

/** "TFW-0042" — what somebody quotes in an email. Derived, never stored. */
export function bookingReference(id: number): string {
  return `TFW-${String(id).padStart(4, "0")}`;
}

// ── the money, which is arithmetic and not a column ──────────────────────────

/** What has actually arrived, across every payment on this booking. */
export function paidPence(booking: { payments: Payment[] }): number {
  return booking.payments.reduce((sum, one) => sum + one.amountPence, 0);
}

/** What has gone back, across every payment on this booking. */
export function refundedPence(booking: { payments: Payment[] }): number {
  return booking.payments.reduce(
    (sum, one) => sum + (one.refundedPence ?? 0),
    0,
  );
}

/**
 * What Marianne is actually holding for this booking — paid, less anything
 * already returned. This is the figure every screen that totals money uses,
 * because a gross figure counts a refunded booking's money twice: once on her
 * screen and once on somebody's statement.
 */
export function heldPence(booking: { payments: Payment[] }): number {
  return paidPence(booking) - refundedPence(booking);
}

/**
 * What is still owed. Never below zero: the deposit and the balance are worked
 * out from the same total, but a price edited between the two payments could
 * otherwise make this negative, and "−£20 outstanding" is not a thing anybody
 * needs to read.
 */
export function outstandingPence(booking: {
  totalPence: number;
  payments: Payment[];
}): number {
  return Math.max(0, booking.totalPence - paidPence(booking));
}

/** Nothing left to pay. Every workshop booking, and a course once settled. */
export function isSettled(booking: {
  totalPence: number;
  payments: Payment[];
}): boolean {
  return outstandingPence(booking) === 0;
}

/**
 * Whether the balance is late.
 *
 * The due day itself counts in full — `isPast` is true only once the whole day
 * has been — which is what "by 3 October" means to the person reading it.
 */
export function isOverdue(
  booking: {
    totalPence: number;
    payments: Payment[];
    balanceDueAt: Date | null;
  },
  now = new Date(),
): boolean {
  if (!booking.balanceDueAt) return false;
  if (isSettled(booking)) return false;
  return isPast(booking.balanceDueAt, now);
}

/**
 * Whether this place has been given up by not being paid for.
 *
 * DERIVED, NOT SWEPT, and that is the whole design of it (D-23). Nothing in
 * this app runs on a schedule; a place released by a job that has to fire is a
 * place that stays held when the job does not. This is true the moment the due
 * day is over, cannot drift out of step with anything, and needs no column —
 * so the place is free at midnight whether or not anybody was watching.
 *
 * The booking is NOT cancelled by it. She may still want the money, the buyer
 * may still pay, and a row rewritten by the passing of time would be a state
 * change nobody made. It simply stops counting.
 */
export function hasLapsed(
  booking: {
    status: Booking["status"];
    totalPence: number;
    payments: Payment[];
    balanceDueAt: Date | null;
  },
  now = new Date(),
): boolean {
  return booking.status === "paid" && isOverdue(booking, now);
}

/** Whether this booking is holding a chair right now. */
export function holdsItsPlace(
  booking: {
    status: Booking["status"];
    totalPence: number;
    payments: Payment[];
    balanceDueAt: Date | null;
  },
  now = new Date(),
): boolean {
  return booking.status === "paid" && !hasLapsed(booking, now);
}

/**
 * Whether this money has already gone back.
 *
 * "Nothing left to send", not "a refund exists". The two differ on a course
 * where one of two payments was returned and the other refused — there the
 * honest answer is that some of it is still here, and the refund control must
 * stay available.
 */
export function alreadyRefunded(booking: { payments: Payment[] }): boolean {
  return paidPence(booking) > 0 && heldPence(booking) === 0;
}

// ── places ───────────────────────────────────────────────────────────────────

/**
 * The one query behind every count of places sold.
 *
 * PAID BOOKINGS, LESS ANYTHING LAPSED. Paid-only is what makes a cancellation
 * give the place back with no second column to keep in step; the lapse clause
 * is the same idea a step further — a course place whose balance never came is
 * released by the arithmetic rather than by a job, so it is free here the
 * moment the due day is over (D-23).
 *
 * Raw SQL rather than Prisma because the lapse test needs the sum of a
 * booking's payments inside the same WHERE, and because the confirming
 * transaction runs this INSIDE `SELECT … FOR UPDATE` on the offering — the
 * count that decides has to be the one nobody else can be changing.
 *
 * The column is chosen from a closed set of two literals rather than
 * interpolated, so nothing about this can become an injection.
 */
async function soldFor(
  client: Prisma.TransactionClient | typeof prisma,
  kind: "workshop" | "course",
  ids: number[],
  now = new Date(),
): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();

  // UTC midnight today, which is what `isPast` compares against — the two have
  // to agree or a place is free on the page and taken in the checkout.
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const rows =
    kind === "workshop"
      ? await client.$queryRaw<{ id: number; sold: number }[]>`
          SELECT b."workshopId" AS id, COALESCE(SUM(b.places), 0)::int AS sold
          FROM "Booking" b
          WHERE b.status = 'paid'
            AND b."workshopId" = ANY(${ids}::int[])
            AND NOT (
              b."balanceDueAt" IS NOT NULL
              AND b."balanceDueAt" < ${today}
              AND COALESCE((
                SELECT SUM(p."amountPence") FROM "Payment" p WHERE p."bookingId" = b.id
              ), 0) < b."totalPence"
            )
          GROUP BY b."workshopId"`
      : await client.$queryRaw<{ id: number; sold: number }[]>`
          SELECT b."courseId" AS id, COALESCE(SUM(b.places), 0)::int AS sold
          FROM "Booking" b
          WHERE b.status = 'paid'
            AND b."courseId" = ANY(${ids}::int[])
            AND NOT (
              b."balanceDueAt" IS NOT NULL
              AND b."balanceDueAt" < ${today}
              AND COALESCE((
                SELECT SUM(p."amountPence") FROM "Payment" p WHERE p."bookingId" = b.id
              ), 0) < b."totalPence"
            )
          GROUP BY b."courseId"`;

  return new Map(rows.map((row) => [row.id, Number(row.sold)]));
}

export async function placesSold(workshopId: number): Promise<number> {
  return (await soldFor(prisma, "workshop", [workshopId])).get(workshopId) ?? 0;
}

export async function coursePlacesSold(courseId: number): Promise<number> {
  return (await soldFor(prisma, "course", [courseId])).get(courseId) ?? 0;
}

/**
 * The same figure for a whole list, in one query.
 *
 * The index draws a row per offering and each row says what is left; asking
 * per row would be a query per row.
 */
export function placesSoldByWorkshop(
  workshopIds: number[],
): Promise<Map<number, number>> {
  return soldFor(prisma, "workshop", workshopIds);
}

export function placesSoldByCourse(
  courseIds: number[],
): Promise<Map<number, number>> {
  return soldFor(prisma, "course", courseIds);
}

/**
 * Never below zero.
 *
 * A room can be oversold by hand — Marianne can lower the capacity of a day
 * that is already full — and "−2 places left" on a public page is worse than
 * "full", which is what it means.
 */
export function placesLeft(capacity: number, sold: number): number {
  return Math.max(0, capacity - sold);
}

// ── the links in the emails ──────────────────────────────────────────────────

/**
 * A new link, and the hash to store against it.
 *
 * 32 random bytes: unguessable, and treated as a bearer credential — whoever
 * holds it can act on that booking and move that money, which is why only its
 * hash is kept (see the notes on `Booking.cancellationTokenHash` and
 * `balanceTokenHash`).
 *
 * ISSUING IS ROTATION. Sending a link again mints a new one and the old
 * email's link stops working, because the old token cannot be recovered from
 * what is stored. That is the cost of not storing it, and it is the right way
 * round.
 */
export function issueLinkToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLinkToken(token) };
}

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function cancellationLink(token: string): string {
  return `${SITE_URL}/cancel/${token}`;
}

/**
 * Where somebody pays the rest.
 *
 * OUR ADDRESS, NEVER A STRIPE ONE. A Checkout URL expires within a day and
 * becomes a dead end in an inbox somebody kept for a month; this page opens a
 * fresh session when it is pressed, and can also say "this was already paid"
 * or "this place has been released" — none of which a spent Stripe URL can do.
 * It is also re-sendable, because it is a link of ours to reissue.
 */
export function balanceLink(token: string): string {
  return `${SITE_URL}/pay/${token}`;
}

/**
 * The booking a cancellation link points at, or nothing.
 *
 * A wrong token, a spent one and a token for something that has been and gone
 * all return null, and the page says the same sentence for all three. Anything
 * else would answer "does a booking exist for this token?" to whoever asked.
 */
export async function findBookingByToken(
  token: string,
): Promise<BookingWithOffering | null> {
  if (!token || token.length < 20) return null;
  const booking = await prisma.booking.findUnique({
    where: { cancellationTokenHash: hashLinkToken(token) },
    include: withOffering,
  });
  if (!booking) return null;
  // The link dies with the last day, as the approved page says it does. On a
  // course that is the end of the run, not the start: somebody four weeks into
  // six still has something to give up. On a session there is no last day, so
  // it does not die of one.
  if (hasBeen(offeringOf(booking))) return null;
  return booking;
}

/** The same, for the /pay link. Same rules, same silence about near misses. */
export async function findBookingByBalanceToken(
  token: string,
): Promise<BookingWithOffering | null> {
  if (!token || token.length < 20) return null;
  const booking = await prisma.booking.findUnique({
    where: { balanceTokenHash: hashLinkToken(token) },
    include: withOffering,
  });
  if (!booking) return null;
  if (hasBeen(offeringOf(booking))) return null;
  return booking;
}

// ── the refund terms ─────────────────────────────────────────────────────────

/**
 * Whether this booking can still be refunded, by its OWN offering's terms.
 *
 * refundDays is per workshop and per course, never a site-wide rule. Zero means
 * it cannot be refunded at all, and `refundDeadline` returns null for it rather
 * than inventing a date. On a course it is counted back from the FIRST date: a
 * course is bought once, so it is cancelled once.
 *
 * The deadline day itself still counts, which is what "cancel by 6 September"
 * means to the person reading it.
 *
 * FALSE ON A SESSION, ALWAYS, and not because a session is unrefundable. It is
 * because a refund window is a count of days back from a date, a session has no
 * date, and nothing anybody agreed says what the terms are. So the automatic
 * path declines to decide and the money stays where the operator put it — with
 * Marianne, on the row, under the refund control that is always available
 * (D-25). Inventing "14 days before a day we do not know" would be the portal
 * writing a refund policy on her behalf.
 */
export function isRefundable(offering: Offering, now = new Date()): boolean {
  if (!offering.firstDate) return false;
  const deadline = refundDeadline(offering.firstDate, offering.refundDays);
  return deadline !== null && !isPast(deadline, now);
}

/**
 * Whether money is still owed back on a cancelled booking.
 *
 * `cancelledUnrefunded` means several different things and this is what tells
 * them apart, derived rather than stored: a place given up after the refund
 * date, where nothing was ever owed; a refund that was owed and would not go
 * through; and a place Marianne cancelled from the portal while the money was
 * still hers to send back, where she chose to keep it for now. The test is the
 * terms as they stood ON THE DAY IT WAS CANCELLED, not today — otherwise a
 * booking cancelled well inside the window would quietly stop being owed as the
 * day approached.
 */
export function refundOwed(booking: BookingWithOffering): boolean {
  if (booking.status !== "cancelledUnrefunded") return false;
  if (heldPence(booking) === 0) return false;
  if (booking.cancelledReason === "soldOut") return true;
  return booking.cancelledAt
    ? isRefundable(offeringOf(booking), booking.cancelledAt)
    : false;
}

// ── a payment becomes a place ────────────────────────────────────────────────

export type ConfirmResult =
  /** The place is theirs. `balanceToken` is null when nothing is owed. */
  | {
      outcome: "confirmed";
      booking: BookingWithOffering;
      cancelToken: string;
      balanceToken: string | null;
    }
  /**
   * They paid and there was no place — the losing side of the race in D-16.
   * The booking is recorded as cancelled with the money still to go back; the
   * caller refunds it.
   */
  | { outcome: "noPlace"; booking: BookingWithOffering }
  /** The offering was deleted between paying and confirming. Nothing to write. */
  | { outcome: "offeringGone"; kind: "workshop" | "course" }
  /** This event has already been acted on. Do nothing, say 200, move on. */
  | { outcome: "alreadyHandled" };

/** What the checkout charged, and therefore which kind of payment this is. */
type FirstPayment = {
  kind: "deposit" | "full";
  /** PENCE, for every place — what the whole booking will cost in the end. */
  totalPence: number;
  /** The day the rest is due. Null when this payment settles it. */
  balanceDueAt: Date | null;
};

/**
 * Write the booking a completed checkout has earned — the ONLY way a paid
 * Booking is ever created.
 *
 * Everything that has to be atomic is in one transaction:
 *
 *  1. The event id goes in first — before the offering is looked for, before
 *     anything is counted. Its primary key is the idempotency guard: a
 *     redelivered event collides here and takes the whole transaction down
 *     with it, so one event can never become two bookings or two emails.
 *  2. The offering row is LOCKED. Two people paying for the last place at the
 *     same instant arrive here at the same instant; the lock makes them a
 *     queue, so the second one counts places the first has already taken. A
 *     plain count without the lock would let both read "1 left".
 *  3. Places are counted and the answer decides which booking gets written.
 *  4. The booking and its FIRST payment are written together, in one create.
 *     A booking with no payment row would be a place nobody paid for.
 *  5. The outcome is stamped onto the event row, so the record says what was
 *     done and not merely that something was.
 *
 * RECORDED BEFORE ANYTHING IRREVERSIBLE, AND THAT ORDER IS THE POINT (D-20).
 * Every side effect the webhook has — the refund, the confirmation, the
 * apology — happens in the caller, after this transaction has committed. So a
 * process that dies mid-way has recorded an event it did not finish acting on,
 * which leaves a payment for a person to sort out with a log line naming it.
 * The other order loses that: money returned and an apology sent with nothing
 * written down, and the next delivery — Stripe retries for days — sends the
 * same apology to the same buyer again. That is the failure this shape exists
 * to make impossible, and it is not hypothetical (D-20).
 *
 * The amount is Stripe's `amount_total`, not our recomputed figure: what they
 * were actually charged is what has to be refunded. The two are compared and a
 * difference is logged, because the only way it happens is a price edited while
 * somebody was at the checkout.
 *
 * A DEPOSIT COMMITS THE PLACE (D-23). The capacity check below does not care
 * which kind of payment this is: somebody who has paid a deposit is holding a
 * chair, and the balance arriving in October changes nothing about the room.
 */
export async function confirmPaidBooking(input: {
  eventId: string;
  eventType: string;
  offering: { kind: "workshop" | "course"; id: number };
  places: number;
  amountPence: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAt: Date;
}): Promise<ConfirmResult> {
  const cancel = issueLinkToken();
  const balance = issueLinkToken();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({
        data: { id: input.eventId, type: input.eventType },
      });

      // Locks the row for the rest of this transaction. Everything below reads
      // a place-count nobody else can be changing.
      const found = await lockOffering(tx, input.offering);
      if (!found) {
        // RETURNING, NOT THROWING, AND THE WHOLE PATH DEPENDS ON IT. There is
        // no Booking to write here — the thing it would point at is gone — so
        // this row is the only trace the event leaves, and returning is what
        // commits it. A throw would roll it back, and the caller's refund and
        // two apology emails would run again on every redelivery.
        await tx.stripeEvent.update({
          where: { id: input.eventId },
          data: {
            outcome:
              input.offering.kind === "workshop"
                ? "workshopGone"
                : "courseGone",
          },
        });
        return {
          outcome: "offeringGone" as const,
          kind: input.offering.kind,
        };
      }

      const first = firstPaymentFor(found, input.places);
      const charged =
        first.kind === "deposit"
          ? (found.depositGBP as number) * input.places
          : first.totalPence;

      if (charged !== input.amountPence) {
        console.warn(
          `[bookings] session ${input.stripeSessionId} paid ${input.amountPence} but ${input.places} place(s) at the current price is ${charged}. The price was probably edited mid-checkout. Recording what was paid.`,
        );
      }

      const sold =
        (await soldFor(tx, input.offering.kind, [input.offering.id])).get(
          input.offering.id,
        ) ?? 0;
      const hasRoom = input.places <= placesLeft(found.capacity, sold);

      const booking = await tx.booking.create({
        data: {
          ...(input.offering.kind === "workshop"
            ? { workshopId: input.offering.id }
            : { courseId: input.offering.id }),
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          places: input.places,
          totalPence: first.totalPence,
          // A booking that never got its place owes nothing and is about to be
          // refunded, so it carries no due date and no link to pay one.
          balanceDueAt: hasRoom ? first.balanceDueAt : null,
          balanceTokenHash: hasRoom && first.balanceDueAt ? balance.hash : null,
          paidAt: input.paidAt,
          cancellationTokenHash: cancel.hash,
          payments: {
            create: {
              kind: first.kind,
              // What Stripe says was charged, never our recomputed figure.
              amountPence: input.amountPence,
              currency: input.currency,
              stripeSessionId: input.stripeSessionId,
              stripePaymentIntentId: input.stripePaymentIntentId,
              paidAt: input.paidAt,
            },
          },
          ...(hasRoom
            ? { status: "paid" as const }
            : {
                status: "cancelledUnrefunded" as const,
                cancelledAt: new Date(),
                cancelledReason: "soldOut" as const,
              }),
        },
        include: withOffering,
      });

      await tx.stripeEvent.update({
        where: { id: input.eventId },
        data: { outcome: hasRoom ? "booked" : "noPlace" },
      });

      return hasRoom
        ? {
            outcome: "confirmed" as const,
            booking,
            cancelToken: cancel.token,
            balanceToken: first.balanceDueAt ? balance.token : null,
          }
        : { outcome: "noPlace" as const, booking };
    });
  } catch (error) {
    // The event id or the session id was already there: this payment has been
    // dealt with. Both are unique on purpose, and either collision means the
    // same thing.
    //
    // This is the answer for EVERY path, not only the one that books. An event
    // that was refunded and apologised for the first time comes back here on
    // its second delivery and is turned away before the offering is looked
    // for — which matters most when the offering has since come back: without
    // this the replay would find it, book a place, and confirm a payment that
    // was refunded weeks ago.
    if (isUniqueViolation(error)) return { outcome: "alreadyHandled" };
    throw error;
  }
}

/** The offering's own figures, read under the lock. */
type LockedOffering = {
  capacity: number;
  priceGBP: number;
  depositGBP: number | null;
  balanceDueAt: Date | null;
};

async function lockOffering(
  tx: Prisma.TransactionClient,
  offering: { kind: "workshop" | "course"; id: number },
): Promise<LockedOffering | null> {
  if (offering.kind === "workshop") {
    const rows = await tx.$queryRaw<
      { capacity: number; priceGBP: number }[]
    >`SELECT capacity, "priceGBP" FROM "Workshop" WHERE id = ${offering.id} FOR UPDATE`;
    const row = rows[0];
    // A workshop is paid at once and always has been (D-7), so it has no
    // deposit column to read and never carries a balance.
    return row ? { ...row, depositGBP: null, balanceDueAt: null } : null;
  }

  const rows = await tx.$queryRaw<
    {
      capacity: number;
      priceGBP: number;
      depositGBP: number | null;
      balanceDueAt: Date | null;
    }[]
  >`SELECT capacity, "priceGBP", "depositGBP", "balanceDueAt" FROM "Course" WHERE id = ${offering.id} FOR UPDATE`;
  return rows[0] ?? null;
}

/**
 * Whether a course is still being sold on its deposit.
 *
 * THE DATE HAS TO BE IN FRONT OF US. A course whose balance day has already
 * been still has a deposit figure on it — Marianne set it in June and the run
 * is in October — and taking that deposit now would write a booking that is
 * overdue the instant it exists: lapsed before the confirmation email lands,
 * and the place released the same second it was bought. So the deposit
 * arrangement simply ends on its own date, and the whole price is taken at once
 * from then on. That is the same shape as everything else here — a consequence
 * of a date, with nothing running and nothing to switch off.
 *
 * Exported because the checkout and the panel have to draw the same conclusion
 * as the webhook. Three copies of this test is how a page offers £80 and a card
 * gets charged £240.
 */
export function depositStillOffered(
  course: {
    depositGBP: number | null;
    balanceDueAt: Date | null;
    priceGBP: number;
  },
  now = new Date(),
): boolean {
  return Boolean(
    course.depositGBP &&
    course.depositGBP < course.priceGBP &&
    course.balanceDueAt &&
    !isPast(course.balanceDueAt, now),
  );
}

/**
 * Which kind of payment the checkout just took, and what it leaves behind.
 *
 * A deposit is only a deposit when there is something left to owe and a day
 * still ahead of us to owe it by: a "deposit" equal to the whole price is the
 * whole price, and writing either case down as a two-payment arrangement would
 * put a balance link in an email with nothing behind it.
 */
function firstPaymentFor(
  offering: LockedOffering,
  places: number,
): FirstPayment {
  const totalPence = offering.priceGBP * places;

  if (depositStillOffered(offering)) {
    return {
      kind: "deposit",
      totalPence,
      balanceDueAt: offering.balanceDueAt as Date,
    };
  }
  return { kind: "full", totalPence, balanceDueAt: null };
}

// ── the balance arrives ──────────────────────────────────────────────────────

export type SettleResult =
  /** Paid in full. The place was already theirs; now nothing is owed. */
  | { outcome: "settled"; booking: BookingWithOffering }
  /**
   * There was nothing to settle — the booking was cancelled, or it had lapsed
   * and the place had gone to somebody else while they were paying. The caller
   * refunds this payment and tells both people.
   */
  | { outcome: "unwanted"; booking: BookingWithOffering; why: string }
  /** The booking is gone. Nothing to write; the payment is refunded. */
  | { outcome: "bookingGone" }
  | { outcome: "alreadyHandled" };

/**
 * The second half of a course booking.
 *
 * The same shape as `confirmPaidBooking` and for the same reasons: the event id
 * first, the row locked, the decision made under the lock, the outcome stamped.
 * What differs is what is being decided — not "is there a place?" but "is this
 * place still here to be paid for?".
 *
 * A LAPSED BOOKING CAN STILL BE PAID FOR, IF THE ROOM STILL HAS ROOM. The place
 * stopped counting when the due day passed, so paying now asks for it back —
 * and the arithmetic gives it back by itself, because once the balance is in,
 * `hasLapsed` is false and the booking counts again. That is only right while
 * nobody else has taken the chair, which is what the count under the lock
 * checks. It is the D-16 race in a different coat, and it gets the same answer:
 * the money goes back and both people are told.
 */
export async function confirmBalancePayment(input: {
  eventId: string;
  eventType: string;
  bookingId: number;
  amountPence: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAt: Date;
}): Promise<SettleResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({
        data: { id: input.eventId, type: input.eventType },
      });

      const locked = await tx.$queryRaw<
        { id: number }[]
      >`SELECT id FROM "Booking" WHERE id = ${input.bookingId} FOR UPDATE`;
      if (!locked[0]) {
        await tx.stripeEvent.update({
          where: { id: input.eventId },
          data: { outcome: "balanceUnwanted" },
        });
        return { outcome: "bookingGone" as const };
      }

      const before = await tx.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
        include: withOffering,
      });

      const refuse = async (why: string) => {
        await tx.stripeEvent.update({
          where: { id: input.eventId },
          data: { outcome: "balanceUnwanted" },
        });
        return { outcome: "unwanted" as const, booking: before, why };
      };

      if (before.status !== "paid") {
        return refuse("the booking had already been cancelled");
      }
      if (isSettled(before)) {
        return refuse("it was already paid in full");
      }

      // Only a booking that had lapsed has to ask; one that is still holding
      // its place is not competing with anybody for it.
      if (hasLapsed(before) && before.courseId !== null) {
        const sold =
          (await soldFor(tx, "course", [before.courseId])).get(
            before.courseId,
          ) ?? 0;
        const offering = offeringOf(before);
        if (before.places > placesLeft(offering.capacity, sold)) {
          return refuse(
            "the balance was overdue, so the place had been released, and it has since gone to somebody else",
          );
        }
      }

      await tx.payment.create({
        data: {
          bookingId: before.id,
          kind: "balance",
          amountPence: input.amountPence,
          currency: input.currency,
          stripeSessionId: input.stripeSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId,
          paidAt: input.paidAt,
        },
      });

      await tx.stripeEvent.update({
        where: { id: input.eventId },
        data: { outcome: "settled" },
      });

      return {
        outcome: "settled" as const,
        booking: await tx.booking.findUniqueOrThrow({
          where: { id: before.id },
          include: withOffering,
        }),
      };
    });
  } catch (error) {
    // The event id, the session id, or a second payment of kind `balance` on
    // this booking. All three are unique, and all three mean the same thing:
    // this money has been dealt with already.
    if (isUniqueViolation(error)) return { outcome: "alreadyHandled" };
    throw error;
  }
}

// ── a place goes back ────────────────────────────────────────────────────────

export type CancelResult =
  /** This call is the one that cancelled it. Tell people. */
  | { outcome: "cancelled"; booking: BookingWithOffering; refunded: boolean }
  /**
   * The money was owed and Stripe would not give it back. The place is
   * released and the refund is outstanding — Marianne has to finish it by hand.
   */
  | { outcome: "refundFailed"; booking: BookingWithOffering; error: string }
  /** Somebody — or the same person, twice — got there first. Say so kindly. */
  | { outcome: "alreadyCancelled"; booking: BookingWithOffering };

/**
 * Cancel a booking, refunding it if its own refund date has not passed.
 *
 * ORDER MATTERS, and it is refund-then-record on purpose. Stripe's idempotency
 * key makes the refund safe to repeat — the same key returns the same refund
 * object and never moves money twice — so repeating the OUTSIDE call is free,
 * while a database write that happened before a refund that failed would be a
 * record saying money went back when it did not.
 *
 * The write itself is conditional on the booking still being `paid`, so of two
 * simultaneous clicks exactly one comes back as `cancelled` and sends the
 * emails; the other reads `alreadyCancelled` and shows the reassurance state.
 *
 * WHAT COMES BACK IS WHAT CAME IN. On a course cancelled after the deposit and
 * before the balance, that is the deposit — there is nothing else to return.
 */
export async function cancelBooking(
  booking: BookingWithOffering,
): Promise<CancelResult> {
  if (booking.status !== "paid") {
    return { outcome: "alreadyCancelled", booking };
  }

  // The losing side of a race never comes through here — it is written already
  // cancelled and refunded by `refundSoldOut` below, because there is no paid
  // booking to transition. So every cancellation this function makes is the
  // buyer's own, and the only question is whether the date has passed.
  if (!isRefundable(offeringOf(booking))) {
    const cancelled = await markCancelled(booking.id, "buyer");
    return cancelled
      ? { outcome: "cancelled", booking: cancelled, refunded: false }
      : { outcome: "alreadyCancelled", booking: await reread(booking.id) };
  }

  const refund = await refundEverythingHeld(booking);
  if (!refund.ok) {
    // The place still goes back — holding a chair for somebody who has said
    // they are not coming helps nobody — but nothing here may claim the money
    // moved. `cancelledUnrefunded` with a reason is how the ledger says
    // "cancelled, and we owe them".
    await markCancelled(booking.id, "buyer");
    console.error(
      `[bookings] refund FAILED for ${bookingReference(booking.id)} (${heldPence(booking)}p): ${refund.error}`,
    );
    return {
      outcome: "refundFailed",
      booking: await reread(booking.id),
      error: refund.error,
    };
  }

  const cancelled = await markCancelled(
    booking.id,
    "buyer",
    "cancelledRefunded",
  );
  return cancelled
    ? { outcome: "cancelled", booking: cancelled, refunded: true }
    : { outcome: "alreadyCancelled", booking: await reread(booking.id) };
}

type RefundResult = { ok: true; amount: number } | { ok: false; error: string };

/**
 * Everything still held, back, once.
 *
 * PER PAYMENT, because a settled course is two payments against two payment
 * intents and Stripe refunds one intent at a time. The idempotency key is the
 * payment row, so every call about one payment is the same call as far as
 * Stripe is concerned: a retry, a double-click, or a restart mid-flight all
 * return the refund that already exists rather than making a second one. This
 * is the guard that stands between a distressed click and a double refund, so
 * it is stated here rather than left to the caller to remember.
 *
 * Each refund is RECORDED AS IT LANDS rather than at the end, so a deposit that
 * went back and a balance that would not leaves the truth on the two rows: some
 * of it is returned, some of it is still here, and `heldPence` says which.
 *
 * The write is conditional on that payment not already carrying a refund, so
 * two tabs write once. Stripe has already returned the same refund object to
 * both, so the loser of the race has moved no money either.
 */
async function refundEverythingHeld(
  booking: BookingWithOffering,
): Promise<RefundResult> {
  const owing = booking.payments.filter(
    (payment) => payment.refundId === null && payment.amountPence > 0,
  );
  if (owing.length === 0) {
    return { ok: false, error: "there is nothing left to send back" };
  }

  let returned = 0;
  for (const payment of owing) {
    if (!payment.stripePaymentIntentId) {
      return {
        ok: false,
        error: `the ${payment.kind} payment has no payment intent to refund`,
      };
    }
    try {
      const refund = await stripe().refunds.create(
        {
          payment_intent: payment.stripePaymentIntentId,
          amount: payment.amountPence,
          metadata: {
            bookingReference: bookingReference(booking.id),
            payment: payment.kind,
          },
        },
        { idempotencyKey: `refund-payment-${payment.id}` },
      );
      await prisma.payment.updateMany({
        where: { id: payment.id, refundId: null },
        data: {
          refundId: refund.id,
          refundedPence: refund.amount,
          refundedAt: new Date(),
        },
      });
      returned += refund.amount;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }
  return { ok: true, amount: returned };
}

/**
 * The conditional write. Zero rows means somebody else cancelled it between
 * this request reading it and writing — which is a normal thing for a link
 * that gets clicked twice, not an error.
 */
async function markCancelled(
  id: number,
  reason: "buyer" | "marianne",
  status: "cancelledRefunded" | "cancelledUnrefunded" = "cancelledUnrefunded",
): Promise<BookingWithOffering | null> {
  const { count } = await prisma.booking.updateMany({
    where: { id, status: "paid" },
    data: { status, cancelledReason: reason, cancelledAt: new Date() },
  });
  return count === 1 ? reread(id) : null;
}

function reread(id: number): Promise<BookingWithOffering> {
  return prisma.booking.findUniqueOrThrow({
    where: { id },
    include: withOffering,
  });
}

/**
 * Refund a booking that never had a place — the losing side of the race, and
 * the balance nobody wanted.
 *
 * Separated from `cancelBooking` because the booking is either written already
 * cancelled, or not being cancelled at all: there is no `paid` row to
 * transition, only money to return.
 */
export async function refundSoldOut(
  booking: BookingWithOffering,
): Promise<{ refunded: boolean; error?: string }> {
  const refund = await refundEverythingHeld(booking);
  if (!refund.ok) {
    console.error(
      `[bookings] could not refund ${bookingReference(booking.id)} (${heldPence(booking)}p): ${refund.error}. Marianne has to refund this one by hand in Stripe.`,
    );
    return { refunded: false, error: refund.error };
  }
  if (booking.status !== "paid") {
    await prisma.booking.updateMany({
      where: { id: booking.id, status: "cancelledUnrefunded" },
      data: { status: "cancelledRefunded" },
    });
  }
  return { refunded: true };
}

/**
 * Send ONE payment back — the balance that arrived for a place that was no
 * longer there.
 *
 * Not `refundEverythingHeld`: the deposit on a lapsed booking is a separate
 * question, and it is Marianne's. Returning it here would decide it for her on
 * a rule nobody agreed, and the ledger already shows the row plainly enough for
 * her to make that call.
 */
export async function refundOnePayment(
  booking: BookingWithOffering,
  sessionId: string,
): Promise<{ refunded: boolean; amount: number; error?: string }> {
  const payment = booking.payments.find(
    (one) => one.stripeSessionId === sessionId,
  );
  if (!payment) return { refunded: false, amount: 0, error: "no such payment" };
  if (payment.refundId) {
    return { refunded: true, amount: payment.refundedPence ?? 0 };
  }
  if (!payment.stripePaymentIntentId) {
    return {
      refunded: false,
      amount: payment.amountPence,
      error: "the payment has no payment intent to refund",
    };
  }
  try {
    const refund = await stripe().refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        amount: payment.amountPence,
        metadata: {
          bookingReference: bookingReference(booking.id),
          payment: payment.kind,
        },
      },
      { idempotencyKey: `refund-payment-${payment.id}` },
    );
    await prisma.payment.updateMany({
      where: { id: payment.id, refundId: null },
      data: {
        refundId: refund.id,
        refundedPence: refund.amount,
        refundedAt: new Date(),
      },
    });
    return { refunded: true, amount: refund.amount };
  } catch (error) {
    return {
      refunded: false,
      amount: payment.amountPence,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

// ── the ledger, and what Marianne can do to a row ────────────────────────────

/**
 * Every booking there has ever been, soonest first, with what it was for and
 * what has been paid against it.
 *
 * ONE query for the whole page. The split into "still to come" and the archive
 * is made from the offering's own last date at render — it is a consequence of
 * today's date and nothing she files, so there is no column to keep in step and
 * no state to get stuck in. A day that passes moves its bookings overnight by
 * itself.
 *
 * Ordered by id, and sorted by date in the page. A course has no date column of
 * its own to order by — the run does (D-21) — so a SQL order that covered both
 * kinds would have to join through the sessions to a MIN(date), and the page is
 * one query's worth of rows.
 */
export function listAllBookings(): Promise<BookingWithOffering[]> {
  return prisma.booking.findMany({
    include: withOffering,
    orderBy: { id: "asc" },
  });
}

export function findBookingById(
  id: number,
): Promise<BookingWithOffering | null> {
  return prisma.booking.findUnique({ where: { id }, include: withOffering });
}

/** The booking a completed checkout session belongs to, whichever payment it was. */
export async function findBookingBySession(
  sessionId: string,
): Promise<BookingWithOffering | null> {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    select: { bookingId: true },
  });
  return payment ? findBookingById(payment.bookingId) : null;
}

/**
 * Whether Marianne can still cancel this from the portal.
 *
 * A day that has been cannot be cancelled — there is no place left to release
 * and nobody's plans left to change, and a record saying she cancelled a
 * workshop that had already run would be a false one. On a course that is the
 * END of the run: somebody four weeks into six still has a place to give up.
 * Refunding is still open to her afterwards, which is the control that does the
 * only thing left worth doing.
 */
export function isCancellable(booking: BookingWithOffering): boolean {
  return booking.status === "paid" && !hasBeen(offeringOf(booking));
}

/** Deleting is only ever reachable on a booking that was cancelled — see D-18. */
export function isDeletable(booking: Booking): boolean {
  return booking.status !== "paid";
}

export type PortalCancelResult =
  /** This call is the one that cancelled it. */
  | { outcome: "cancelled"; booking: BookingWithOffering; refunded: boolean }
  /** The place is released and the refund would not go through. */
  | { outcome: "refundFailed"; booking: BookingWithOffering; error: string }
  /** It could not be done, and this says why in words she can read. */
  | { outcome: "refused"; reason: string };

/**
 * Cancel a place from the portal, refunding it or not AS SHE CHOOSES.
 *
 * The sibling of `cancelBooking` above and deliberately not the same function.
 * The buyer's own link has no choice to make — inside the period the money goes
 * back, outside it does not — whereas Marianne is asked, and asked ONLY while
 * the money is still hers to send back. Everything underneath is shared: the
 * same per-payment refund with the same idempotency keys, the same conditional
 * write. A second refund path with different rules is the thing this avoids.
 *
 * ORDER MATTERS, as it does there: Stripe first, then the record. Repeating a
 * refund call under the same key costs nothing and moves nothing; a row
 * claiming money went back when it did not is what somebody discovers weeks
 * later.
 */
export async function cancelBookingFromPortal(
  booking: BookingWithOffering,
  options: { refund: boolean },
): Promise<PortalCancelResult> {
  const offering = offeringOf(booking);

  if (booking.status !== "paid") {
    return {
      outcome: "refused",
      reason: "This one has already been cancelled.",
    };
  }
  if (hasBeen(offering)) {
    return {
      outcome: "refused",
      reason:
        "That has already been, so there is nothing left to cancel. You can still send the money back.",
    };
  }

  // Already refunded and still holding its place — she comped it earlier and is
  // now releasing the place. There is nothing left to send back, so this
  // cancels and keeps the refund it already carries.
  if (alreadyRefunded(booking)) {
    const cancelled = await markCancelled(
      booking.id,
      "marianne",
      "cancelledRefunded",
    );
    return cancelled
      ? { outcome: "cancelled", booking: cancelled, refunded: true }
      : { outcome: "refused", reason: "This one has already been cancelled." };
  }

  if (!options.refund) {
    const cancelled = await markCancelled(booking.id, "marianne");
    return cancelled
      ? { outcome: "cancelled", booking: cancelled, refunded: false }
      : { outcome: "refused", reason: "This one has already been cancelled." };
  }

  if (!isRefundable(offering)) {
    // The button that offers this is only drawn inside the period, so arriving
    // here means the page was open while the date passed. Refusing is right:
    // the terms on the row and the terms being applied have to be the same.
    return {
      outcome: "refused",
      reason:
        "The refund period on this one closed while this page was open. Cancel it without a refund, then use refund on the row if you want the money to go back anyway.",
    };
  }

  const refund = await refundEverythingHeld(booking);
  if (!refund.ok) {
    // The place still goes back — holding a chair for somebody who has been
    // told they are not coming helps nobody — but nothing may claim the money
    // moved. `cancelledUnrefunded` is the ledger saying "cancelled, and we owe
    // them", and `refundOwed` will read it that way.
    await markCancelled(booking.id, "marianne");
    console.error(
      `[bookings] portal refund FAILED for ${bookingReference(booking.id)} (${heldPence(booking)}p): ${refund.error}`,
    );
    return {
      outcome: "refundFailed",
      booking: await reread(booking.id),
      error: refund.error,
    };
  }

  const cancelled = await markCancelled(
    booking.id,
    "marianne",
    "cancelledRefunded",
  );
  return cancelled
    ? { outcome: "cancelled", booking: cancelled, refunded: true }
    : { outcome: "refused", reason: "This one has already been cancelled." };
}

export type PortalRefundResult =
  | { outcome: "refunded"; booking: BookingWithOffering }
  /** Stripe would not do it. Whatever DID go back is recorded; nothing else is. */
  | { outcome: "failed"; error: string }
  | { outcome: "refused"; reason: string };

/**
 * Send the money back, on its own.
 *
 * The goodwill path, and the one place where a refund is not tied to a
 * cancellation. Two situations reach it and both are hers to decide rather than
 * the refund period's: a place she cancelled earlier and kept the money for,
 * and a booking she is not cancelling at all — somebody who is still coming and
 * whom she has decided not to charge. The second leaves the row `paid`, so the
 * place stays held and the room's count is unchanged.
 *
 * NOTHING IS WRITTEN UNLESS STRIPE SAYS THE MONEY MOVED — each payment records
 * its own refund at the moment Stripe confirms it, and a failure leaves the
 * rest exactly as they were. A ledger claiming a refund that never happened is
 * worse than a repeated call to Stripe, and the idempotency key makes repeating
 * free.
 */
export async function refundBookingFromPortal(
  booking: BookingWithOffering,
): Promise<PortalRefundResult> {
  if (alreadyRefunded(booking)) {
    return {
      outcome: "refused",
      reason:
        "This money has already gone back — there is nothing left to send.",
    };
  }

  // PAST THE REFUND PERIOD IT IS REFUSED HERE TOO (operator, 2026-08-19). The
  // portal draws the control spent, and this is the rule rather than the
  // drawing of it: a stale page, a second tab, or a form posted directly all
  // arrive here, and the screen having greyed a button is not a guarantee.
  //
  // THE TEST IS "THE PERIOD HAS PASSED", NOT `isRefundable`, because a session
  // has no refund period at all — `isRefundable` is false on one for want of a
  // date rather than for want of time, and using it would refuse every session
  // refund, which has always been hers to decide (D-25).
  const offering = offeringOf(booking);
  if (offering.firstDate && !isRefundable(offering)) {
    const deadline = refundDeadline(offering.firstDate, offering.refundDays);
    return {
      outcome: "refused",
      reason: `The refund period ran out${deadline ? ` on ${formatDayLong(deadline)}` : ""}, so this cannot be refunded from the portal. Sending the money back anyway is a decision to make in Stripe.`,
    };
  }

  const refund = await refundEverythingHeld(booking);
  if (!refund.ok) {
    console.error(
      `[bookings] portal refund FAILED for ${bookingReference(booking.id)} (${heldPence(booking)}p): ${refund.error}`,
    );
    return { outcome: "failed", error: refund.error };
  }

  // A booking that was cancelled becomes "cancelled and refunded". One that is
  // still live stays live: she has refunded them, not removed them.
  await prisma.booking.updateMany({
    where: { id: booking.id, status: "cancelledUnrefunded" },
    data: { status: "cancelledRefunded" },
  });

  return { outcome: "refunded", booking: await reread(booking.id) };
}

/**
 * Take the record away for good.
 *
 * Refused on a booking that is still `paid`, in here as well as in the page
 * that draws the button, because a server action is a POST endpoint of its own
 * and a disabled button is not a rule (D-18). The payments go with it, by the
 * cascade — they are the record OF this booking, and the modal says so.
 */
export async function deleteBookingFromPortal(
  booking: Booking,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isDeletable(booking)) {
    return {
      ok: false,
      reason:
        "This place is still held and the money is still yours to account for. Cancel it first — then deleting is offered.",
    };
  }
  await prisma.booking.delete({ where: { id: booking.id } });
  return { ok: true };
}

/**
 * A collision on something declared unique — an event id already recorded, a
 * session already turned into a payment, an approval already paid for. Every
 * one of them means the same thing: this money has been dealt with.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
