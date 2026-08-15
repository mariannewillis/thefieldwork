import "server-only";
import { prisma } from "@/lib/db";
import { dayOfSqlDate, londonInstant, minutesOfClock } from "@/lib/london";

/**
 * Her diary, as a calendar her own calendar can read.
 *
 * ONE DIRECTION ONLY, and deliberately. This publishes what The Field Work knows
 * so that Outlook or Google can show it beside everything else in her life. It
 * does NOT read her personal appointments back: that needs Microsoft Graph or
 * the Google Calendar API, an app registration the operator has to create in his
 * own name, a consent screen, and somewhere to keep and refresh a token that can
 * read a person's whole calendar. That is a separate piece of work with a
 * separate conversation about credentials attached to it, and half-building it
 * would be worse than not — a diary that reads SOME of her commitments would be
 * a diary she trusts and should not.
 *
 * SUBSCRIPTION, NOT EXPORT. The address stays live and her calendar re-fetches
 * it, so a workshop she moves moves in her calendar too. Both providers check on
 * their own schedule and neither says what it is; several hours is normal, and
 * the portal says so rather than letting her think it is broken.
 *
 * WHAT IS IN IT: workshops, course dates, and sessions people have paid for.
 * Personal blocks are NOT — they came out of her own calendar in the first
 * place, and sending them back would show her every appointment twice. Requests
 * that are merely holding a slot are not either: they are a queue to work
 * through rather than commitments to keep, and an hour that has not been agreed
 * to is not an appointment.
 */

/** One line of the file, before folding. */
type Line = string;

/**
 * The whole feed, as `text/calendar`.
 *
 * A WINDOW, not everything. A year back and two years forward: her calendar has
 * no use for a workshop in 2024, and an unbounded feed grows for ever and is
 * re-downloaded in full every few hours by every device she owns.
 */
export async function calendarFeed(now: Date = new Date()): Promise<string> {
  const from = new Date(now.getTime() - 365 * 86_400_000);
  const to = new Date(now.getTime() + 730 * 86_400_000);

  const [workshops, sessions, bookings] = await Promise.all([
    prisma.workshop.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    }),
    prisma.courseSession.findMany({
      where: { date: { gte: from, lte: to } },
      include: { course: true },
      orderBy: { date: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: "paid",
        serviceId: { not: null },
        serviceRequest: { slotStart: { gte: from, lte: to } },
      },
      include: { service: true, serviceRequest: true },
    }),
  ]);

  const lines: Line[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    // Required, and it identifies what wrote the file. Both providers log it,
    // and it is the first thing anybody debugging a subscription looks at.
    "PRODID:-//The Field Work//Diary//EN",
    // The feed is a subscription rather than an invitation: nothing in it is
    // asking anybody to accept anything.
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:The Field Work",
    // A hint, not a promise — every client ignores it when it feels like it, and
    // both of the ones that matter refresh on a schedule of their own.
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  const stamp = utc(now);

  for (const workshop of workshops) {
    const when = hours(workshop);
    lines.push(
      ...event({
        uid: `workshop-${workshop.id}@thefieldwork.co.uk`,
        stamp,
        sequence: sequenceOf(workshop.updatedAt),
        startsAt: when.startsAt,
        endsAt: when.endsAt,
        summary: workshop.name,
        location: [workshop.venueName, workshop.postcode]
          .filter(Boolean)
          .join(", "),
        description: workshop.summary,
      }),
    );
  }

  for (const one of sessions) {
    const when = hours(one);
    lines.push(
      ...event({
        uid: `course-session-${one.id}@thefieldwork.co.uk`,
        stamp,
        sequence: sequenceOf(one.updatedAt),
        startsAt: when.startsAt,
        endsAt: when.endsAt,
        summary: one.title
          ? `${one.course.name} — ${one.title}`
          : one.course.name,
        location: one.venue,
        description: one.description,
      }),
    );
  }

  for (const booking of bookings) {
    const request = booking.serviceRequest;
    if (!request?.slotStart || !request.slotEnd) continue;
    lines.push(
      ...event({
        uid: `booking-${booking.id}@thefieldwork.co.uk`,
        stamp,
        sequence: sequenceOf(booking.updatedAt),
        startsAt: request.slotStart,
        endsAt: request.slotEnd,
        summary: `${booking.service?.name ?? "Session"} — ${booking.buyerName}`,
        location:
          booking.service?.location === "venue"
            ? [booking.service.venueName, booking.service.postcode]
                .filter(Boolean)
                .join(", ")
            : "",
        // Her own copy, so it may carry what she would want to hand: who it is,
        // and how to reach them. Nothing about money and nothing about a card.
        description: [booking.buyerEmail, request.agreedTime]
          .filter(Boolean)
          .join(" · "),
      }),
    );
  }

  lines.push("END:VCALENDAR");

  // CRLF, per RFC 5545, and not because anything visibly breaks without it —
  // Outlook is the one that minds, and it minds silently.
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * One VEVENT.
 *
 * UID IS STABLE AND DERIVED FROM THE ROW, which is what makes an update an
 * update. A client matches on UID: the same one arriving with a later SEQUENCE
 * replaces what it had, and a fresh one every fetch would leave her with four
 * copies of the same workshop by the end of the week.
 *
 * EVERY STAMP IS UTC, with the trailing Z. The alternative is shipping a
 * VTIMEZONE block with the whole British Summer Time rule set in it and hoping
 * two clients agree about it; a UTC instant is unambiguous by construction and
 * every client renders it in the reader's own zone. It is also exactly what is
 * in the database, so nothing is converted on the way out and nothing can shift
 * across 25 October.
 */
function event(args: {
  uid: string;
  stamp: string;
  sequence: number;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  location: string;
  description: string;
}): Line[] {
  return [
    "BEGIN:VEVENT",
    `UID:${args.uid}`,
    `DTSTAMP:${args.stamp}`,
    `SEQUENCE:${args.sequence}`,
    `DTSTART:${utc(args.startsAt)}`,
    `DTEND:${utc(args.endsAt)}`,
    `SUMMARY:${escape(args.summary)}`,
    ...(args.location ? [`LOCATION:${escape(args.location)}`] : []),
    ...(args.description ? [`DESCRIPTION:${escape(args.description)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];
}

/**
 * The two instants a workshop or a course date occupies.
 *
 * ITS OWN HOURS, with no margin. The margin is what stops the diary offering a
 * session; it is not part of the appointment, and putting it in here would show
 * her a two-hour talk as a four-hour block in her own calendar.
 *
 * NO END TIME MEANS AN HOUR. Unlike the availability list — which treats the
 * rest of the day as taken, because it must not offer an afternoon on a guess —
 * a calendar has to draw something, and a bar from ten in the morning to midnight
 * would say something much more wrong than an hour does. The form asks for an
 * end time; this is what happens when there is not one.
 */
function hours(when: { date: Date; startTime: string; endTime: string }): {
  startsAt: Date;
  endsAt: Date;
} {
  const day = dayOfSqlDate(when.date);
  const start = minutesOfClock(when.startTime) ?? 0;
  const end = minutesOfClock(when.endTime);

  const startsAt = londonInstant(
    day.year,
    day.month,
    day.day,
    Math.floor(start / 60),
    start % 60,
  );

  return {
    startsAt,
    endsAt:
      end === null
        ? new Date(startsAt.getTime() + 3_600_000)
        : londonInstant(
            day.year,
            day.month,
            day.day,
            Math.floor(end / 60),
            end % 60,
          ),
  };
}

/** "20261025T090000Z" — an instant, the only way this file writes one. */
function utc(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * A version number that goes UP whenever the row changes.
 *
 * Seconds since the start of 2020 rather than since 1970, and that is not
 * tidiness: SEQUENCE is an integer, several clients have historically kept it in
 * a signed 32-bit one, and Unix seconds cross that ceiling in 2038. Counting
 * from 2020 buys until 2088 and costs a subtraction.
 *
 * Monotonic, because `updatedAt` only ever moves forward — so a client that has
 * SEQUENCE 5 and is handed SEQUENCE 9 knows to take the new one.
 */
const EPOCH_2020 = Date.UTC(2020, 0, 1);

function sequenceOf(updatedAt: Date): number {
  return Math.max(0, Math.floor((updatedAt.getTime() - EPOCH_2020) / 1000));
}

/**
 * The four characters that mean something else inside a property value.
 *
 * Backslash first — escaping it after the others would escape the backslashes
 * they just added.
 */
function escape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold a line at 75 OCTETS, per RFC 5545 — not 75 characters.
 *
 * The difference is the whole reason this is written by hand: a line of
 * em-dashes and pound signs in her own words is three bytes per character in
 * places, and counting characters would produce lines Outlook truncates. So the
 * count is of encoded bytes, and the split never lands inside one — a folded
 * multi-byte character arrives as a question mark in her calendar.
 */
function fold(line: string): string {
  if (byteLength(line) <= 75) return line;

  const out: string[] = [];
  let current = "";
  let limit = 75;

  for (const character of line) {
    if (byteLength(current) + byteLength(character) > limit) {
      out.push(current);
      current = character;
      // Continuation lines carry a leading space that is not part of the value,
      // so one octet of each subsequent line is spent on it.
      limit = 74;
    } else {
      current += character;
    }
  }
  out.push(current);

  return out.join("\r\n ");
}

const BYTES = new TextEncoder();

function byteLength(value: string): number {
  return BYTES.encode(value).length;
}
