import { formatLondonDay } from "@/lib/format";
import {
  clockOfMinutes,
  londonClock,
  londonDayKey,
  londonInstant,
  londonParts,
  minutesOfClock,
} from "@/lib/london";

/**
 * What a visitor is allowed to ask for.
 *
 * THE OFFERED TIMES ARE COMPUTED AND NEVER STORED. There is no table of
 * bookable slots and there will not be one: a stored list is a second copy of an
 * answer the diary already gives, and it is wrong from the moment a workshop
 * moves, a course date is added, or somebody else asks for the same Thursday.
 * What exists is this function and five things that make an hour unavailable
 * (`lib/availability.ts`), and the answer is worked out again every time it is
 * asked for.
 *
 * ALWAYS ON THE SERVER. The browser is handed a list of times and never the
 * rule that made it — it cannot see her diary, and a picker that computed its
 * own availability would be a picker anybody could argue with. And because the
 * list a browser is holding is already a few seconds old, the server RE-CHECKS
 * the chosen slot on submit, with `slotVerdict` below, which is the same code
 * that offered it. One rule, applied twice, so the two cannot disagree.
 *
 * PURE, and deliberately not `server-only`: the smoke test checks this
 * arithmetic without a browser or a database, and the picker groups what it is
 * given by her day using the same `lib/london` this does.
 */

/**
 * How far ahead she takes bookings, in DAYS.
 *
 * Sixty. One figure for the whole site rather than a per-service column, because
 * it is not a fact about any one service — it is a statement about how far into
 * the future this diary is worth trusting. Past two months a workshop will have
 * moved, a course will have been added, and somebody holding a slot from March
 * for a date in September is holding a guess.
 *
 * It is a CONSTANT AND NOT A COLUMN for the reason `APPROVAL_HOLD_HOURS` is one:
 * §12 of the brief puts figures like this in Site settings, a screen that does
 * not exist yet, and inventing a per-service configurable now would leave two of
 * them to disagree the day it lands. When it does, it reads this default and
 * writes one value.
 */
export const BOOKING_WINDOW_DAYS = 60;

/**
 * The grid, in minutes. Half past or on the hour, and nothing else.
 *
 * ANCHORED TO THE HOUR rather than to the start of her day, so that a service
 * opening at 09:15 offers 09:30 and 10:00 rather than 09:15 and 09:45. "Half
 * past ten" is what somebody chooses; "quarter to eleven, because that is where
 * the counting happened to start" is not.
 */
export const SLOT_GRID_MINUTES = 30;

/**
 * The week, in the order she reads it, with the numbers `availableDays` speaks.
 *
 * MONDAY FIRST, because that is the British week and this is a diary rather
 * than an American spreadsheet. `iso` is what is stored; `short` is what the
 * form's buttons and the summary line say; `long` is for a sentence.
 */
export const WEEKDAYS = [
  { iso: 1, short: "Mon", long: "Monday" },
  { iso: 2, short: "Tue", long: "Tuesday" },
  { iso: 3, short: "Wed", long: "Wednesday" },
  { iso: 4, short: "Thu", long: "Thursday" },
  { iso: 5, short: "Fri", long: "Friday" },
  { iso: 6, short: "Sat", long: "Saturday" },
  { iso: 7, short: "Sun", long: "Sunday" },
] as const;

/**
 * "Mon, Wed and Thu" — a service's days in the line a list row has room for.
 *
 * The two shorthands are worth having because they are what she would say:
 * Monday to Friday is "weekdays", and all seven is "any day". A row reading
 * "Mon, Tue, Wed, Thu, Fri" makes her count.
 */
export function daysInWords(days: number[]): string {
  const set = [...new Set(days)].sort((a, b) => a - b);
  if (set.length === 0) return "no days set";
  if (set.length === 7) return "any day";
  if (set.join() === "1,2,3,4,5") return "weekdays";
  if (set.join() === "6,7") return "weekends";

  const names = set
    .map((iso) => WEEKDAYS.find((day) => day.iso === iso)?.short)
    .filter(Boolean) as string[];
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Something already in her diary, as an occupied span of real time. */
export type BusySpan = {
  /** Margins and whole-day toggles are ALREADY APPLIED. See `lib/availability`. */
  startsAt: Date;
  endsAt: Date;
  kind: "workshop" | "course" | "session" | "request" | "block";
  /** The row's id in whichever table `kind` names. The calendar removes blocks by it. */
  id: number;
  /** What it is, in her words — for the calendar, and for saying why a slot went. */
  label: string;
  /** Where it lives in the portal, when it has a page of its own. */
  href?: string;
};

/**
 * When a service may be asked for, as the computation needs it.
 *
 * Narrower than the row, so that the smoke test can hand this five numbers and
 * the re-check on submit can be handed exactly what the offer was made from.
 */
export type BookableHours = {
  /** ISO weekdays, 1 (Monday) to 7. Empty means nothing is offered. */
  availableDays: number[];
  /** "09:00" — the earliest a session may START. */
  availableFrom: string;
  /** "17:00" — the latest one may FINISH. Not the last start. */
  availableTo: string;
  durationMinutes: number;
  /** Kept clear either side of the candidate, for getting there and back. */
  travelBufferMinutes: number;
  /** The least warning she will take, in hours from now. */
  minimumNoticeHours: number;
};

export type OfferedSlot = {
  startsAt: Date;
  endsAt: Date;
};

/** One of her days, with what is left of it. Days with nothing left are dropped. */
export type OfferedDay = {
  /** "2026-10-29", her day. */
  dayKey: string;
  slots: OfferedSlot[];
};

/** Why a particular time is not on offer. Each one has a sentence somewhere. */
export type SlotRefusal =
  /** Not on the half-hour, so it was never offered and was not typed by a person. */
  | "offGrid"
  /** She does not do this one on that day of the week. */
  | "wrongDay"
  /** Before she starts, or it would finish after she stops. */
  | "outsideHours"
  /** Inside her minimum notice — this morning, for a session this morning. */
  | "tooSoon"
  /** Past the sixty-day window. */
  | "tooFarAhead"
  /** Something is already there. `clash` says what. */
  | "taken";

export type SlotVerdict =
  { ok: true } | { ok: false; why: SlotRefusal; clash: BusySpan | null };

/** Two spans of time that share a moment. Touching end-to-start does not count. */
export function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return (
    a.startsAt.getTime() < b.endsAt.getTime() &&
    b.startsAt.getTime() < a.endsAt.getTime()
  );
}

/**
 * Whether this exact instant is bookable, and if not, why not.
 *
 * THE ONE RULE, and everything else in this file is a loop around it. The public
 * page calls it through `offeredSlots` to build the picker; the action that
 * writes a request calls it directly on the way in, because the picker's list is
 * seconds old by the time somebody presses the button and the honest answer to
 * "it went while you were typing" is to say so rather than to take the slot
 * anyway.
 */
export function slotVerdict(args: {
  startsAt: Date;
  hours: BookableHours;
  busy: BusySpan[];
  now?: Date;
}): SlotVerdict {
  const { startsAt, hours } = args;
  const now = args.now ?? new Date();

  const from = minutesOfClock(hours.availableFrom);
  const to = minutesOfClock(hours.availableTo);
  if (from === null || to === null) {
    return { ok: false, why: "outsideHours", clash: null };
  }

  const here = londonParts(startsAt);
  const minute = here.hour * 60 + here.minute;

  // Off the grid means it was never offered. Nobody types 10:07 into a picker,
  // so this is a posted value that did not come from one.
  if (minute % SLOT_GRID_MINUTES !== 0) {
    return { ok: false, why: "offGrid", clash: null };
  }

  if (!hours.availableDays.includes(here.weekday)) {
    return { ok: false, why: "wrongDay", clash: null };
  }

  const endsAt = slotEnd(startsAt, hours.durationMinutes);
  const finishBy = londonInstant(
    here.year,
    here.month,
    here.day,
    Math.floor(to / 60),
    to % 60,
  );

  // THE ARITHMETIC THE WHOLE THING TURNS ON: ninety minutes against a five
  // o'clock finish makes half past three the last start. Written as "does it
  // finish in time" rather than "is it before the last start", because the two
  // are the same sentence and only this one is still right on the morning the
  // clocks change — the end is elapsed time, and the finish is her clock.
  if (minute < from || endsAt.getTime() > finishBy.getTime()) {
    return { ok: false, why: "outsideHours", clash: null };
  }

  const earliest = now.getTime() + hours.minimumNoticeHours * 3_600_000;
  if (startsAt.getTime() < earliest) {
    return { ok: false, why: "tooSoon", clash: null };
  }
  if (startsAt.getTime() > windowEnd(now).getTime()) {
    return { ok: false, why: "tooFarAhead", clash: null };
  }

  // THE BUFFER TRAVELS WITH THE CANDIDATE, not with what is already booked.
  // A workshop's margin belongs to the workshop and blocks the diary for
  // everything; a travel buffer belongs to the service being asked for. Adding
  // it to both sides of the candidate is what stops two sessions sitting flush —
  // and puts two sessions of a fifteen-minute-buffer service half an hour apart,
  // which is right: a quarter of an hour to get away from one and a quarter to
  // get to the next is half an hour of driving.
  const reach = hours.travelBufferMinutes * 60_000;
  const wanted = {
    startsAt: new Date(startsAt.getTime() - reach),
    endsAt: new Date(endsAt.getTime() + reach),
  };

  for (const span of args.busy) {
    if (overlaps(wanted, span)) {
      return { ok: false, why: "taken", clash: span };
    }
  }

  return { ok: true };
}

/**
 * When a session starting here would finish.
 *
 * ELAPSED TIME, not a clock reading. Ninety minutes is ninety minutes of the
 * world whichever side of the clock change it starts on — a session that began
 * at half past midnight on 25 October ends at one, not at two.
 */
export function slotEnd(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/** The last instant inside the booking window, counted from now in her days. */
export function windowEnd(now: Date): Date {
  const p = londonParts(now);
  return londonInstant(p.year, p.month, p.day + BOOKING_WINDOW_DAYS + 1);
}

/**
 * Every time this service can still be asked for, her day by her day.
 *
 * Walks her days from today to the end of the window, skips the ones she does
 * not do this on, lays a half-hour grid inside her hours, and keeps the ones
 * `slotVerdict` says yes to. Days with nothing left are dropped rather than
 * listed empty — a picker showing eleven days of "nothing" is a picker somebody
 * has to read to find the two that matter.
 *
 * IT CAN RETURN NOTHING, and that is a real answer rather than a failure: a
 * service with no days set, or one whose next two months are full. The page says
 * so and offers to take the question in words, which is exactly what it did
 * before there was a calendar.
 */
export function offeredSlots(args: {
  hours: BookableHours;
  busy: BusySpan[];
  now?: Date;
}): OfferedDay[] {
  const now = args.now ?? new Date();
  const { hours } = args;

  const from = minutesOfClock(hours.availableFrom);
  const to = minutesOfClock(hours.availableTo);
  if (from === null || to === null) return [];
  if (hours.availableDays.length === 0) return [];
  if (hours.durationMinutes <= 0) return [];

  // The first grid point at or after she opens. 09:00 stays 09:00; 09:15 becomes
  // 09:30.
  const first = Math.ceil(from / SLOT_GRID_MINUTES) * SLOT_GRID_MINUTES;

  const today = londonParts(now);
  const days: OfferedDay[] = [];

  for (let ahead = 0; ahead <= BOOKING_WINDOW_DAYS; ahead++) {
    // Built by adding to the DAY NUMBER rather than by adding 24 hours to an
    // instant. `Date.UTC` rolls a 32nd of October into the 1st of November for
    // us, and the day after 25 October is 25 hours long — counting in
    // milliseconds would drift into the previous evening and stay there.
    const midday = londonInstant(
      today.year,
      today.month,
      today.day + ahead,
      12,
    );
    const p = londonParts(midday);
    if (!hours.availableDays.includes(p.weekday)) continue;

    const slots: OfferedSlot[] = [];
    for (let m = first; m <= to; m += SLOT_GRID_MINUTES) {
      const startsAt = londonInstant(
        p.year,
        p.month,
        p.day,
        Math.floor(m / 60),
        m % 60,
      );
      if (slotVerdict({ startsAt, hours, busy: args.busy, now }).ok) {
        slots.push({
          startsAt,
          endsAt: slotEnd(startsAt, hours.durationMinutes),
        });
      }
    }

    if (slots.length > 0) days.push({ dayKey: londonDayKey(midday), slots });
  }

  return days;
}

/**
 * What the picker is handed — the offered times with the timezone already done.
 *
 * THE BROWSER NEVER DOES THIS ARITHMETIC. It is given a day in words, a clock
 * time in words, and an opaque value to post back, and it does no conversion of
 * any kind. A picker that turned instants into local times itself would show
 * somebody in Madrid eleven o'clock for her ten, and would be wrong in Britain
 * too on the two mornings a year that matter.
 *
 * `value` is the slot's start as an ISO instant, which is what comes back on
 * submit and what the re-check parses. It is deliberately not a pretty string:
 * nothing but this system ever reads it.
 */
export type SlotChoice = { value: string; clock: string };
export type OfferedDayView = {
  dayKey: string;
  /** "Thursday 3 September" — her day, said the way she says it. */
  words: string;
  slots: SlotChoice[];
};

export function offeredView(days: OfferedDay[]): OfferedDayView[] {
  return days.map((day) => ({
    dayKey: day.dayKey,
    words: formatLondonDay(day.slots[0].startsAt),
    slots: day.slots.map((slot) => ({
      value: slot.startsAt.toISOString(),
      clock: londonClock(slot.startsAt),
    })),
  }));
}

/**
 * The last time a session of this length could start, as her clock reads it —
 * "15:30".
 *
 * The same sum `slotVerdict` makes, said out loud, because it is the sum she
 * will want to check: the portal's own form prints it back at her as she types,
 * so that "ninety minutes, finishing at five" reads as "so the last one starts
 * at half past three" without her doing it in her head. Null when the service is
 * longer than the hours it is offered in, which is a thing the form has to say
 * rather than silently offer nothing for.
 */
export function lastStartClock(hours: {
  availableFrom: string;
  availableTo: string;
  durationMinutes: number;
}): string | null {
  const from = minutesOfClock(hours.availableFrom);
  const to = minutesOfClock(hours.availableTo);
  if (from === null || to === null || hours.durationMinutes <= 0) return null;

  const last =
    Math.floor((to - hours.durationMinutes) / SLOT_GRID_MINUTES) *
    SLOT_GRID_MINUTES;
  const first = Math.ceil(from / SLOT_GRID_MINUTES) * SLOT_GRID_MINUTES;
  return last < first ? null : clockOfMinutes(last);
}
