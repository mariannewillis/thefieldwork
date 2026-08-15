import "server-only";
import type { Prisma, Service } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  dayOfSqlDate,
  londonInstant,
  londonParts,
  minutesOfClock,
} from "@/lib/london";
import { approvalState, factsOf } from "@/lib/service-requests";
import {
  BOOKING_WINDOW_DAYS,
  offeredSlots,
  slotVerdict,
  type BookableHours,
  type BusySpan,
  type OfferedDay,
  type SlotVerdict,
} from "@/lib/slots";

/**
 * Her diary — the five things that make an hour unavailable, read as one list.
 *
 * `lib/slots.ts` holds the arithmetic and knows nothing about the database; this
 * holds the database and knows nothing about grids. Between them: what is
 * offered on the public page, what the calendar draws, and what the action that
 * writes a request checks on the way in.
 *
 * THE FIVE, and why each one is here:
 *
 *  1. WORKSHOPS — the day, the hours, and whatever margin she set around them.
 *     Published or not: an unpublished workshop is one she has not put on the
 *     site yet, not one that is not happening.
 *  2. COURSE DATES — every CourseSession, with the course's margin around each.
 *  3. SESSIONS THAT HAVE BEEN PAID FOR — a Booking against a service, at the
 *     slot its approval named.
 *  4. REQUESTS THAT ARE STILL LIVE — asked and unanswered, or approved and
 *     waiting to be paid for. This is the hold, and it is derived. See below.
 *  5. HER OWN BLOCKS — time she has taken out herself, on the calendar.
 *
 * HOLDING IS DERIVED, EXACTLY AS LAPSING IS (D-23, D-25). A slot is taken if a
 * live request or a booking claims it, and "live" is arithmetic on the row
 * rather than a column somebody sets: `approvalState` already answers it in five
 * values, and this asks the same function the queue and the webhook ask. So
 * requesting reserves the slot, approving keeps it, and declining or lapsing
 * returns it — with nothing running and nothing to remember. There is no
 * `expired`, no sweep and no job, for the same reason there never was: a hold
 * released by something that has to fire is a hold that stays on the morning it
 * does not.
 *
 * The one that surprises people: CANCELLING A PAID SESSION FREES ITS SLOT.
 * `approvalState` still reads `paid` — a Booking exists and it always will — but
 * the Booking is `cancelledRefunded` or `cancelledUnrefunded`, and only `paid`
 * ones are read below. The hour goes back into the diary the moment she cancels,
 * which is the whole point of cancelling it.
 */

// ── the five ─────────────────────────────────────────────────────────────────

/**
 * Everything claimed between two instants.
 *
 * Read a WINDOW rather than everything, because the calendar asks for a month
 * and the picker asks for sixty days, and neither wants November 2029. The
 * bounds are generous on purpose: a span that starts before `from` and runs into
 * the window still overlaps it, so every query below asks "ends after `from` and
 * starts before `to`" rather than "starts inside".
 *
 * Margins and whole-day toggles are applied HERE, so that everything downstream
 * — the grid, the calendar, the re-check on submit — is comparing plain spans of
 * occupied time and no reader has to know which offering carries which rule.
 */
export async function busyBetween(
  from: Date,
  to: Date,
  now: Date = new Date(),
  /**
   * Which client to read through. The default is the app's own; the re-check on
   * submit passes its TRANSACTION client instead, and that is load-bearing
   * rather than tidy — a read outside the transaction would not see the lock,
   * and two people could both be told their Thursday was free.
   *
   * A PARAMETER AND NOT A MODULE-LEVEL SWITCH. A server handles requests
   * concurrently, so anything stashed in a variable up here would be read by
   * whichever request happened to be in the middle of its own query, and the
   * failure would only ever appear under load.
   */
  client: Prisma.TransactionClient = prisma,
): Promise<BusySpan[]> {
  const overlapping = { gt: from };
  const beginning = { lt: to };

  // ONE AFTER ANOTHER, not in parallel, and that is about the transaction rather
  // than about speed. Prisma's interactive-transaction client owns a single
  // connection and does not support concurrent queries on it; a `Promise.all`
  // here works against the top-level client and is a hazard the moment the same
  // function is handed a `tx`, which is exactly what the re-check on submit does.
  // Five indexed reads over a local socket are not what makes this page slow.

  // 1 · workshops. A SQL DATE has no hours, so the window is asked in days
  // either side rather than exactly — one day of slack costs one row and saves
  // an argument about which end of the day a DATE lands on.
  const workshops = await client.workshop.findMany({
    where: { date: { gte: daysAround(from, -2), lte: daysAround(to, 2) } },
    orderBy: { date: "asc" },
  });

  // 2 · course dates, each with the course whose margin surrounds it.
  const sessions = await client.courseSession.findMany({
    where: { date: { gte: daysAround(from, -2), lte: daysAround(to, 2) } },
    include: { course: true },
    orderBy: { date: "asc" },
  });

  // 3 · sessions that have been paid for. `paid` only: a cancelled one gives its
  // hour back.
  const bookings = await client.booking.findMany({
    where: {
      status: "paid",
      serviceId: { not: null },
      serviceRequest: { slotEnd: overlapping, slotStart: beginning },
    },
    include: { service: true, serviceRequest: true },
  });

  // 4 · requests holding their slot. Narrowed here to what CAN be live, and
  // decided below by `approvalState` — the query cannot express "approved,
  // unpaid, and its 48 hours have not run out" without repeating the arithmetic
  // that already exists.
  const requests = await client.serviceRequest.findMany({
    where: {
      slotEnd: overlapping,
      slotStart: beginning,
      status: { in: ["pending", "confirmed"] },
    },
    include: { service: true, booking: { select: { id: true } } },
  });

  // 5 · hers.
  const blocks = await client.personalBlock.findMany({
    where: { endsAt: overlapping, startsAt: beginning },
    orderBy: { startsAt: "asc" },
  });

  const busy: BusySpan[] = [];

  for (const workshop of workshops) {
    busy.push({
      ...occupied(workshop, workshop),
      kind: "workshop",
      id: workshop.id,
      label: workshop.name,
      href: `/admin/offerings/workshops/${workshop.slug}`,
    });
  }

  for (const session of sessions) {
    busy.push({
      ...occupied(session, session.course),
      kind: "course",
      id: session.id,
      // The course first, because that is what she recognises; the date's own
      // title second, because four Wednesdays all called "IFR course" in a
      // month view is a month view that says nothing.
      label: session.title
        ? `${session.course.name} — ${session.title}`
        : session.course.name,
      href: `/admin/offerings/courses/${session.course.slug}`,
    });
  }

  for (const booking of bookings) {
    const request = booking.serviceRequest;
    if (!request?.slotStart || !request.slotEnd) continue;
    busy.push({
      startsAt: request.slotStart,
      endsAt: request.slotEnd,
      kind: "session",
      id: booking.id,
      label: `${booking.service?.name ?? "Session"} — ${booking.buyerName}`,
      href: "/admin/workshop-bookings",
    });
  }

  for (const request of requests) {
    if (!request.slotStart || !request.slotEnd) continue;
    // THE HOLD, DERIVED. `paid` is left to the bookings above, so that a session
    // somebody has paid for is one entry in the calendar rather than two;
    // `lapsed` and `declined` are not here at all, which IS the release.
    const state = approvalState(factsOf(request), now);
    if (state !== "pending" && state !== "awaitingPayment") continue;
    busy.push({
      startsAt: request.slotStart,
      endsAt: request.slotEnd,
      kind: "request",
      id: request.id,
      label: `${request.service.name} — ${request.name}${
        state === "pending" ? " (asked)" : " (approved, unpaid)"
      }`,
      href: "/admin/bookings",
    });
  }

  for (const block of blocks) {
    busy.push({
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      kind: "block",
      id: block.id,
      label: block.reason,
    });
  }

  return busy.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * What a workshop or a course date actually takes out of the diary.
 *
 * The DAY comes from the row and the MARGIN from whatever owns it — a workshop
 * owns its own; a course date takes the course's, because a run is one
 * arrangement and four copies of one answer is three too many.
 *
 * A WHOLE-DAY TOGGLE IGNORES THE HOURS AND THE MARGINS, and takes her day from
 * midnight to midnight in London. Which is 25 hours long on 25 October, and this
 * is exactly why `londonInstant` does the counting rather than an addition of
 * 86,400,000.
 *
 * A WORKSHOP WITH NO END TIME TAKES THE REST OF THE DAY. She has said when it
 * starts and has not said when it stops, and the diary must not offer an
 * afternoon on the strength of a guess. The form says so under the field, so it
 * is a stated consequence rather than a surprise.
 */
function occupied(
  when: { date: Date; startTime: string; endTime: string },
  margins: {
    marginBeforeMinutes: number;
    marginAfterMinutes: number;
    blocksWholeDay: boolean;
  },
): { startsAt: Date; endsAt: Date } {
  const day = dayOfSqlDate(when.date);

  if (margins.blocksWholeDay) {
    return {
      startsAt: londonInstant(day.year, day.month, day.day),
      endsAt: londonInstant(day.year, day.month, day.day + 1),
    };
  }

  const start = minutesOfClock(when.startTime) ?? 0;
  const end = minutesOfClock(when.endTime);

  const startsAt = londonInstant(
    day.year,
    day.month,
    day.day,
    Math.floor(start / 60),
    start % 60,
  );
  const endsAt =
    end === null
      ? londonInstant(day.year, day.month, day.day + 1)
      : londonInstant(
          day.year,
          day.month,
          day.day,
          Math.floor(end / 60),
          end % 60,
        );

  return {
    startsAt: new Date(
      startsAt.getTime() - margins.marginBeforeMinutes * 60_000,
    ),
    endsAt: new Date(endsAt.getTime() + margins.marginAfterMinutes * 60_000),
  };
}

/** A SQL `DATE` bound, n days either side of an instant. */
function daysAround(instant: Date, days: number): Date {
  const p = londonParts(instant);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + days));
}

// ── what a service offers ────────────────────────────────────────────────────

/** A service's five bookable facts, in the shape the arithmetic wants. */
export function hoursOf(
  service: Pick<
    Service,
    | "availableDays"
    | "availableFrom"
    | "availableTo"
    | "durationMinutes"
    | "travelBufferMinutes"
    | "minimumNoticeHours"
  >,
): BookableHours {
  return {
    // Sorted, because the form posts checkboxes in DOM order and the summary
    // line reads "Mon, Wed, Thu" rather than whatever order they were ticked in.
    availableDays: [...service.availableDays].sort((a, b) => a - b),
    availableFrom: service.availableFrom,
    availableTo: service.availableTo,
    durationMinutes: service.durationMinutes,
    travelBufferMinutes: service.travelBufferMinutes,
    minimumNoticeHours: service.minimumNoticeHours,
  };
}

/**
 * Every time this service can still be asked for.
 *
 * The one call the public page makes. It reads the diary across the whole
 * booking window in a single pass and then does the grid in memory — sixty days
 * of half-hours is at most a few hundred comparisons against a list of a few
 * dozen spans, which is cheaper than asking the database once per candidate by
 * three orders of magnitude.
 */
export async function offeredFor(
  service: Parameters<typeof hoursOf>[0],
  now: Date = new Date(),
): Promise<OfferedDay[]> {
  const hours = hoursOf(service);
  if (hours.availableDays.length === 0) return [];

  const p = londonParts(now);
  const busy = await busyBetween(
    londonInstant(p.year, p.month, p.day),
    londonInstant(p.year, p.month, p.day + BOOKING_WINDOW_DAYS + 1),
    now,
  );
  return offeredSlots({ hours, busy, now });
}

/**
 * Whether this exact slot is STILL free — asked again at the moment of writing.
 *
 * The list the browser is holding was computed when the page was drawn, and
 * somebody filling in a form takes a minute or two. In that time another person
 * can ask for the same ten o'clock, she can block the morning from her phone, or
 * a course date can be added. So the answer is worked out again here, inside the
 * transaction that writes, and the same `slotVerdict` decides it — one rule,
 * applied twice, rather than a second implementation that agrees today.
 */
export async function stillOffered(
  tx: Prisma.TransactionClient,
  args: {
    startsAt: Date;
    hours: BookableHours;
    now?: Date;
  },
): Promise<SlotVerdict> {
  const now = args.now ?? new Date();

  // A NARROW WINDOW — the day before to the day after. The re-check is asking
  // about one hour rather than building a picker, and reading sixty days to
  // answer it would hold the lock for longer than it needs to be held. A day of
  // slack either side covers a whole-day workshop and the widest buffer anybody
  // would set.
  const p = londonParts(args.startsAt);
  const busy = await busyBetween(
    londonInstant(p.year, p.month, p.day - 1),
    londonInstant(p.year, p.month, p.day + 2),
    now,
    tx,
  );

  return slotVerdict({ startsAt: args.startsAt, hours: args.hours, busy, now });
}

// ── two requests, one Thursday ───────────────────────────────────────────────

/**
 * The lock that makes "only one of them gets it" true.
 *
 * ONE LOCK FOR THE WHOLE DIARY, not one per slot, and that is deliberate. Slots
 * that clash are not only the ones that start at the same minute: a ninety
 * minute session at ten and a sixty minute one at eleven overlap, and so do a
 * session and the travel buffer around it, so a per-slot key would let exactly
 * the pairs this exists to catch through.
 *
 * What it costs is that two people asking for two completely different weeks
 * queue behind one another for a few milliseconds. What it buys is that the
 * check and the write cannot be separated by anybody else's write. For a sole
 * practitioner taking a handful of requests a day that is not a trade — it is
 * correctness for nothing.
 *
 * ADVISORY AND TRANSACTION-SCOPED (`_xact_`): Postgres releases it on commit or
 * rollback whatever happens, so there is no path where an error leaves the diary
 * locked. The two integers are a name and nothing more.
 */
export async function lockTheDiary(
  tx: Prisma.TransactionClient,
): Promise<void> {
  // CAST TO TEXT, and it is not decoration. `pg_advisory_xact_lock` returns SQL
  // `void`, and the pg driver adapter refuses to deserialise that — it throws
  // `UnsupportedNativeDataType` and takes the whole request down with it, which
  // is precisely what it did the first time this ran. The cast gives it a type
  // it knows. The value is discarded either way: the point of the call is the
  // lock, not the answer.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(6811, 1)::text AS locked`;
}

// ── her own blocks ───────────────────────────────────────────────────────────

export function listPersonalBlocks(from: Date, to: Date) {
  return prisma.personalBlock.findMany({
    where: { endsAt: { gt: from }, startsAt: { lt: to } },
    orderBy: { startsAt: "asc" },
  });
}
