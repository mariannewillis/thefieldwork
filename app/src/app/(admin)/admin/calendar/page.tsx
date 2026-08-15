import type { Metadata } from "next";
import Link from "next/link";
import { BlockForm, UnblockButton } from "@/components/admin/BlockForm";
import { SITE_URL } from "@/content/site";
import { getSession } from "@/lib/auth/server";
import { busyBetween } from "@/lib/availability";
import { prisma } from "@/lib/db";
import {
  londonClock,
  londonDayKey,
  londonInstant,
  londonParts,
} from "@/lib/london";
import type { BusySpan } from "@/lib/slots";
import { issueCalendarFeed } from "./actions";

/**
 * Her month — one calendar, and everything that is in it.
 *
 * ONE, not five. A workshop, a course date, a session somebody has paid for, a
 * request holding its hour and a block of her own are five different things in
 * five different tables, and the question this screen answers is not about any
 * of them: it is "what have I got on?". So they arrive as one list of occupied
 * spans (`lib/availability.ts`) and are drawn the same way, distinguished by a
 * word rather than by five separate sections she would have to read across.
 *
 * IT IS THE SAME LIST THAT DECIDES WHAT THE PUBLIC PAGE OFFERS, and that is the
 * point of building it this way round. A calendar assembled from its own queries
 * would be a second opinion about her diary, and the morning the two disagreed
 * the site would be the one that was wrong. What she sees here is, exactly, what
 * a visitor is being refused.
 *
 * WHAT IT DOES NOT DO is edit anything except her own blocks. A workshop is
 * changed where workshops are changed; a request is answered in Requests. Every
 * entry that has a page of its own is a link to it.
 *
 * A MONTH AT A TIME, in the URL. `?month=2026-10` rather than component state,
 * so that the browser's back button works, a page she left open is the month she
 * left it on, and she can send herself a link to October.
 */

export const metadata: Metadata = {
  title: "Calendar — The Field Work",
};

// Availability changes the moment anybody asks for a slot, so this is read on
// every request. A cached month would show her an hour that had gone.
export const dynamic = "force-dynamic";

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const NOTE = "fig font-mono text-[15px] tabular-nums text-ink-soft";

/** What each kind is called, in her words rather than in the schema's. */
const KINDS: Record<BusySpan["kind"], string> = {
  workshop: "Workshop",
  course: "Course",
  session: "Session · paid",
  request: "Request",
  block: "Blocked",
};

/** And the colour it is drawn in. Blocks are the quiet one — they are absences. */
const TONES: Record<BusySpan["kind"], string> = {
  workshop: "border-l-gold",
  course: "border-l-gold",
  session: "border-l-pool-success",
  request: "border-l-action",
  block: "border-l-pool-rule",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const now = new Date();

  // The month asked for, or the one she is in. A malformed parameter falls back
  // rather than failing: this is an address somebody can type.
  const asked = /^(\d{4})-(\d{2})$/.exec((month ?? "").trim());
  const here = londonParts(now);
  const year = asked ? Number(asked[1]) : here.year;
  const monthNumber = asked ? Number(asked[2]) : here.month;

  const opens = londonInstant(year, monthNumber, 1);
  const closes = londonInstant(year, monthNumber + 1, 1);

  const [busy, session] = await Promise.all([
    busyBetween(opens, closes, now),
    getSession(),
  ]);

  const owner = session
    ? await prisma.adminUser.findUnique({
        where: { username: session.username },
        select: { calendarFeedToken: true },
      })
    : null;

  // Grouped by HER day, not by a UTC one, and by the day each span STARTS on. A
  // block running from Friday evening to Sunday night is one entry under Friday
  // rather than three fragments — she made it as one thing and reads it as one.
  const byDay = new Map<string, BusySpan[]>();
  for (const span of busy) {
    const key = londonDayKey(span.startsAt);
    const day = byDay.get(key);
    if (day) day.push(span);
    else byDay.set(key, [span]);
  }

  const monthName = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(opens);

  const days = daysOf(year, monthNumber);
  const today = londonDayKey(now);
  const busyDays = days.filter((day) => byDay.has(day.key));

  const feedUrl = owner?.calendarFeedToken
    ? `${SITE_URL}/api/calendar/${owner.calendarFeedToken}.ics`
    : null;

  return (
    <section className="pt-8" aria-labelledby="calendar-h">
      <p className={EYEBROW}>Your diary</p>

      <h1
        id="calendar-h"
        className="mt-3 max-w-[24ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {monthName}
        <br />
        <span className="text-gold">
          {busy.length === 0
            ? "is completely clear."
            : busy.length === 1
              ? "has one thing in it."
              : `has ${busy.length} things in it.`}
        </span>
      </h1>

      <p className="mt-6 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
        Everything here comes out of what people can be offered. A workshop, a
        course date, a session somebody has paid for, a request holding its
        time, and anything you have blocked yourself &mdash; if it is on this
        page, nobody is being offered it.
      </p>

      {/* ── the month, and the two either side ─────────────────────────── */}
      <nav
        className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
        aria-label="Which month"
      >
        <Link
          href={`/admin/calendar?month=${monthKey(year, monthNumber - 1)}`}
          className={STEP}
        >
          &larr; {monthWords(year, monthNumber - 1)}
        </Link>
        <Link href="/admin/calendar" className={STEP}>
          This month
        </Link>
        <Link
          href={`/admin/calendar?month=${monthKey(year, monthNumber + 1)}`}
          className={STEP}
        >
          {monthWords(year, monthNumber + 1)} &rarr;
        </Link>
      </nav>

      {/* ── what is in it ──────────────────────────────────────────────── */}
      <div className="pool on-pool mt-9 px-6 py-7 sm:px-8">
        {busyDays.length === 0 ? (
          /* Drawn deliberately rather than left as an empty list. A month with
             nothing in it is an ordinary state and a good one, and a blank space
             reads as something that failed to load. */
          <>
            <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
              Nothing at all
            </p>
            <p className="mt-2 max-w-[46ch] font-display text-[26px] leading-tight text-ink">
              Every day this month is free, and every one of them is being
              offered.
            </p>
          </>
        ) : (
          <ol className="m-0 list-none p-0">
            {busyDays.map((day) => (
              <li
                key={day.key}
                className="border-b border-pool-rule/25 py-5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <p className="flex flex-wrap items-baseline gap-x-4">
                  <span
                    className={`font-display text-[24px] leading-tight ${
                      day.key === today ? "text-action" : "text-ink"
                    }`}
                  >
                    {day.words}
                  </span>
                  {day.key === today && (
                    <span className={`${NOTE} text-action`}>today</span>
                  )}
                </p>

                <ul className="m-0 mt-3 list-none space-y-2 p-0">
                  {(byDay.get(day.key) ?? []).map((span) => (
                    <li
                      key={`${span.kind}-${span.id}`}
                      className={`border-l-4 pl-4 ${TONES[span.kind]}`}
                    >
                      <span className={NOTE}>
                        {span.startsAt.getTime() <= day.startsAt.getTime() &&
                        span.endsAt.getTime() >= day.endsAt.getTime()
                          ? "all day"
                          : `${londonClock(span.startsAt)}–${londonClock(span.endsAt)}`}
                        {" · "}
                        {KINDS[span.kind]}
                      </span>
                      <span className="block text-[19px] leading-snug text-ink">
                        {span.href ? (
                          <Link
                            href={span.href}
                            className="t underline decoration-pool-rule/50 underline-offset-4 hover:decoration-ink"
                          >
                            {span.label}
                          </Link>
                        ) : (
                          span.label
                        )}
                        {span.kind === "block" && (
                          <>
                            {" "}
                            <UnblockButton id={span.id} reason={span.label} />
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── taking time out ────────────────────────────────────────────── */}
      <div className="pool on-pool mt-8 px-6 py-7 sm:px-8">
        <h2 className="font-display text-[26px] leading-tight text-ink">
          Block some time
        </h2>
        <p className="mt-2 max-w-[58ch] text-[17px] leading-relaxed text-ink-soft">
          Yours alone. Nothing on the site ever shows what you write here
          &mdash; it only stops the time being offered.
        </p>
        <div className="mt-6">
          <BlockForm day={londonDayKey(now)} />
        </div>
      </div>

      {/* ── her own calendar ───────────────────────────────────────────── */}
      <div className="pool on-pool mt-8 px-6 py-7 sm:px-8">
        <h2 className="font-display text-[26px] leading-tight text-ink">
          See this in Outlook or Google
        </h2>
        <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
          A private address your own calendar can subscribe to. Workshops,
          course dates and sessions people have paid for appear in it, and
          update themselves. It is READ-ONLY &mdash; nothing your calendar does
          can change anything here, and your appointments do not come back the
          other way.
        </p>

        {feedUrl ? (
          <>
            <p className="mt-5 break-all border border-pool-rule px-4 py-3 fig font-mono text-[15px] text-ink">
              {feedUrl}
            </p>
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
              In Outlook: Add calendar &rarr; Subscribe from web. In Google
              Calendar: Other calendars &rarr; From URL. Both check for changes
              on their own schedule, which is often several hours &mdash; so
              something you add here will not appear there straight away.
            </p>
            <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
              Treat it like a password: anybody with the address can read your
              diary. If it has gone somewhere it should not have, replace it
              &mdash; which stops the old one working everywhere at once, and
              you subscribe again with the new one.
            </p>
            <form action={issueCalendarFeed} className="mt-4">
              <button
                type="submit"
                className="t min-h-[48px] border border-ink px-6 text-[17px] font-medium text-ink hover:bg-ink hover:text-pool"
              >
                Replace this address
              </button>
            </form>
          </>
        ) : (
          <form action={issueCalendarFeed} className="mt-5">
            <button
              type="submit"
              className="t min-h-[52px] bg-action px-8 py-3 text-[17px] font-semibold text-pool hover:bg-ink"
            >
              Make me an address
            </button>
          </form>
        )}
      </div>

      <p className="mt-8 max-w-[64ch] text-[19px] leading-relaxed text-plate-soft">
        The hours you are open to be asked for are set on each session, not here
        &mdash; see{" "}
        <Link
          href="/admin/availability"
          className="text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
        >
          Availability
        </Link>
        .
      </p>
    </section>
  );
}

const STEP =
  "t inline-flex min-h-[44px] items-center text-[17px] font-medium text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text hover:decoration-plate-text";

/** Every day of a month, with the two instants that bound it in London. */
function daysOf(year: number, month: number) {
  const days: {
    key: string;
    words: string;
    startsAt: Date;
    endsAt: Date;
  }[] = [];

  // Counted by adding to the DAY NUMBER and stopping when the month rolls over,
  // rather than by asking how many days February has. `Date.UTC` already knows.
  for (let day = 1; day <= 31; day++) {
    const startsAt = londonInstant(year, month, day);
    if (londonParts(startsAt).month !== normalMonth(month)) break;
    days.push({
      key: londonDayKey(startsAt),
      words: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/London",
      }).format(startsAt),
      startsAt,
      // Not plus 24 hours: 25 October is 25 hours long, and "all day" has to
      // still read as all day on it.
      endsAt: londonInstant(year, month, day + 1),
    });
  }

  return days;
}

/** Month 13 is next January, and month 0 is last December. */
function normalMonth(month: number): number {
  return ((month - 1 + 12) % 12) + 1;
}

function monthKey(year: number, month: number): string {
  const rolled = new Date(Date.UTC(year, month - 1, 1));
  return `${rolled.getUTCFullYear()}-${String(rolled.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthWords(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
