/**
 * A run of dates, said in words.
 *
 * A workshop has a date and the page prints it. A course has three or six or
 * twelve of them, and printing the list where the workshop prints its day
 * answers a question nobody asked: the first thing somebody decides about a
 * course is whether they can give it four Wednesday evenings, not whether the
 * seventh of October is free. So the run is described — how many, which day of
 * the week if they are all the same, when it starts and when it ends — and the
 * dates themselves are further down the page.
 *
 * Everything here is DERIVED from the dates. There is no column saying "four
 * Wednesday evenings" and there is not going to be: a description she typed
 * and a run she edited afterwards would eventually disagree, and the sentence
 * on the page would be the one nobody checked (D-21).
 *
 * Not server-only. It is arithmetic on dates that the record already holds,
 * and both public pages want the same answers.
 *
 * Every date is read in UTC, for the reason `lib/format.ts` gives at length:
 * `CourseSession.date` is a SQL DATE, and formatted in the server's own zone a
 * Friday becomes a Thursday west of London.
 */

/** As much of a date as any of this needs. */
export type RunDate = {
  date: Date;
  startTime: string;
  endTime: string;
};

export type RunShape = {
  count: number;
  first: Date;
  last: Date;
  /** "four Wednesday evenings" · "six Saturdays" · "three dates". Lower case. */
  words: string;
  /** "7–28 Oct" · "21 Aug – 11 Sep" · "21 Dec 2026 – 8 Jan 2027". */
  span: string;
  /** "19:00–21:00" when every date keeps the same hours; null when they vary. */
  hours: string | null;
  /** True once the first date has been and gone but the last has not. */
  underWay: boolean;
  /** True once the last date has been and gone. */
  finished: boolean;
};

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/**
 * "four" up to twelve, then numerals.
 *
 * Spelled out because these are sentences — "four Wednesday evenings" — and
 * numerals in prose read as data. Past twelve a course is long enough that the
 * figure is the point, and "seventeen Tuesdays" is harder to take in than 17.
 */
export function spellCount(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

/** For the start of a sentence, where the count is the first word. */
export function capitalise(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function weekdayName(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}

function dayAndMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** "7 October" — the sentence form, for "from 7 October" on a list row. */
export function formatDayInMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * An evening is one that starts at or after five. It decides a single word —
 * whether the run is "four Wednesday evenings" or "four Wednesdays" — and it is
 * worth getting right rather than assuming: this site's own approved screens
 * carry both a course of evenings and a course of full Saturdays, and calling
 * the second one an evening course is the kind of small wrongness that makes a
 * reader stop trusting the rest of the page.
 */
function isEvening(startTime: string): boolean {
  const hour = Number(startTime.slice(0, 2));
  return Number.isFinite(hour) && hour >= 17;
}

function allSame(values: string[]): string | null {
  const [first] = values;
  if (first === undefined) return null;
  return values.every((value) => value === first) ? first : null;
}

/**
 * The whole run in one line: "21 Aug – 11 Sep".
 *
 * The month is printed once when the run does not leave it, and the year only
 * when the run crosses one — a span that says the year twice in October is
 * noise, and one that omits it over New Year is a puzzle.
 */
function formatSpan(first: Date, last: Date): string {
  if (first.getTime() === last.getTime()) return dayAndMonth(first);

  const sameYear = first.getUTCFullYear() === last.getUTCFullYear();
  if (!sameYear) {
    return `${dayAndMonth(first)} ${first.getUTCFullYear()} – ${dayAndMonth(last)} ${last.getUTCFullYear()}`;
  }
  if (first.getUTCMonth() === last.getUTCMonth()) {
    return `${first.getUTCDate()}–${dayAndMonth(last)}`;
  }
  return `${dayAndMonth(first)} – ${dayAndMonth(last)}`;
}

/**
 * The run, described — or null when there are no dates at all.
 *
 * Null rather than an empty shape: a course with nothing in the diary is a
 * draft, and the form refuses to publish one (see the courses action). A public
 * page can still meet one if a date is taken off after publishing, and it should
 * say nothing about the run rather than print "no dates · ".
 */
export function runShape(
  dates: readonly RunDate[],
  now: Date = new Date(),
): RunShape | null {
  if (dates.length === 0) return null;

  // Sorted here as well as in the query. The wording depends on which date is
  // first, and a caller that hands over an unsorted array should get the right
  // sentence rather than a plausible wrong one.
  const sorted = [...dates].sort(
    (one, other) => one.date.getTime() - other.date.getTime(),
  );
  const first = sorted[0].date;
  const last = sorted[sorted.length - 1].date;
  const count = sorted.length;

  const weekday = allSame(sorted.map((one) => weekdayName(one.date)));
  const evenings = sorted.every((one) => isEvening(one.startTime));
  const start = allSame(sorted.map((one) => one.startTime));
  const end = allSame(sorted.map((one) => one.endTime));

  const words = weekday
    ? evenings
      ? `${spellCount(count)} ${weekday} ${count === 1 ? "evening" : "evenings"}`
      : `${spellCount(count)} ${weekday}${count === 1 ? "" : "s"}`
    : `${spellCount(count)} ${count === 1 ? "date" : "dates"}`;

  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return {
    count,
    first,
    last,
    words,
    span: formatSpan(first, last),
    hours: start && end ? `${start}–${end}` : null,
    underWay: first.getTime() < today && last.getTime() >= today,
    finished: last.getTime() < today,
  };
}
