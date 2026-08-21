import type { Metadata } from "next";
import Link from "next/link";
import OwingTable from "@/components/admin/OwingTable";
import { owing, overdueWords } from "@/lib/instalments";
import { markAllBookingsSeen } from "@/app/(admin)/admin/workshop-bookings/actions";
import BookingLine from "@/components/admin/BookingLine";
import MarkAllSeen from "@/components/admin/MarkAllSeen";
import Pager, { currentPage, pageSlice } from "@/components/admin/Pager";
import BookingActions, {
  type LedgerRow,
} from "@/components/admin/BookingActions";
import {
  alreadyRefunded,
  bookingReference,
  hasBeen,
  hasLapsed,
  heldPence,
  isRefundable,
  listAllBookings,
  offeringOf,
  outstandingPence,
  paidPence,
  refundOwed,
  type BookingWithOffering,
  type Offering,
} from "@/lib/bookings";
import { runShape } from "@/lib/course-run";
import {
  formatDayShort,
  formatInstant,
  formatMoney,
  isPast,
  refundDeadline,
} from "@/lib/format";

/**
 * The ledger — every place anyone has paid for, on a workshop or on a course.
 *
 * Ported from docs/screens/workshopflow/admin-workshop-bookings.html. It lives
 * at /admin/workshop-bookings and NOT at /admin/bookings, which is the requests
 * queue: somebody asking for an hour and waiting to be answered. Two jobs, two
 * screens (D-18); the approved rail gives them separate rows for the same
 * reason.
 *
 * TWO TABLES AND NOTHING TO FILE. A booking sits in "still to come" until its
 * day has been — or, on a course, until the last date of the run has — and the
 * morning after it is in the archive. That is a consequence of the date and not
 * a state anybody sets, so there is no column to keep in step and nothing that
 * can get stuck in the wrong one.
 *
 * A SESSION NEVER MOVES TO THE ARCHIVE, and that is the same principle rather
 * than an exception to it. It has no date — the time is the sentence she and
 * the client agreed (D-25) — so there is no fact here that could file it, and
 * inventing one would put a session in the past while somebody was still
 * expecting it. It sorts by the day it was paid for and stays in "still to
 * come" until it is cancelled.
 *
 * THE TWO COLUMNS THE APPROVED SCREEN DREW EMPTY ARE FULL NOW (D-23, D-25).
 * Type says Workshop, Course or Session — all three can be paid for, a session
 * once Marianne has approved the request that asked for one. Deposit says what
 * was taken at booking and what is still owed, because a course can be sold on
 * one; it stays empty on the other two, which are paid at once.
 *
 * AND THIS IS WHERE A LAPSED PLACE SURFACES. A course place whose balance was
 * never paid stops counting toward the room the morning after it was due — no
 * job runs, nothing sweeps, the arithmetic simply stops including it. Nothing
 * can therefore TELL her it happened, so the row says so, plainly, in the table
 * she already opens: the state line names the date it lapsed and the headline
 * counts them. If a message on the day is wanted as well, that needs something
 * scheduled, and that is a decision about hosting rather than about this screen.
 *
 * The mockup's "the other states" gallery is a review device and does not ship
 * (D-1). The states themselves do: the empty tables are below, the archive's
 * own empty state says it fills itself, loading is loading.tsx beside this and
 * the error is error.tsx.
 */

export const metadata: Metadata = {
  title: "Bookings — The Field Work",
};

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const HEAD =
  "pb-3 pr-5 text-left align-bottom fig font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-ink-soft";
const CAPTION = "mt-0.5 block normal-case tracking-normal";
const CELL = "py-5 pr-5 align-top";
const NOTE = "mt-1 block fig font-mono text-[15px] tabular-nums text-ink-soft";

// ── the row ──────────────────────────────────────────────────────────────────

/** Everything the controls need, in a shape that crosses to the browser. */
function toLedgerRow(booking: BookingWithOffering): LedgerRow {
  const offering = offeringOf(booking);
  const lastRefundedAt = booking.payments
    .map((one) => one.refundedAt)
    .filter((at): at is Date => at !== null)
    .sort((one, other) => other.getTime() - one.getTime())[0];

  return {
    id: booking.id,
    reference: bookingReference(booking.id),
    buyerName: booking.buyerName,
    places: booking.places,
    heldPence: heldPence(booking),
    paidPence: paidPence(booking),
    status: booking.status,
    cancelledAt: booking.cancelledAt,
    refundedAt: lastRefundedAt ?? null,
    refunded: alreadyRefunded(booking),
    owed: refundOwed(booking),
    kind: offering.kind,
    offeringName: offering.name,
    offeringDate: offering.firstDate,
    agreedTime: offering.agreedTime,
    refundDays: offering.refundDays,
    refundDeadline: offering.firstDate
      ? refundDeadline(offering.firstDate, offering.refundDays)
      : null,
    dayHasBeen: hasBeen(offering),
    insidePeriod: isRefundable(offering),
  };
}

/** "1 place" / "3 places" */
function places(n: number): string {
  return `${n} ${n === 1 ? "place" : "places"}`;
}

/**
 * "Sat 20 Sep" for a workshop · "Four Wednesdays · 7–28 Oct" for a course ·
 * her own agreed sentence for a session, which has no date to print.
 */
function whenWords(offering: Offering): string {
  if (!offering.firstDate) return offering.agreedTime ?? "time to be agreed";
  if (offering.kind === "workshop") return formatDayShort(offering.firstDate);
  const run = runShape(offering.dates);
  return run
    ? `${run.words} · ${run.span}`
    : formatDayShort(offering.firstDate);
}

/**
 * ONE BOOKING, TURNED INTO A LINE AND A SHEET.
 *
 * This replaces four components — the state line, the deposit column, the money
 * column and the row itself — that between them printed seven columns of prose
 * on every row. The ledger read as a file rather than a list (operator,
 * 2026-08-19); what is left on the line is who, what kind, which offering,
 * where it stands and what she is holding, and the rest opens by pressing it.
 *
 * EVERY CONVERSION IS THE SERVER'S. An instant into her timezone, pence into
 * pounds, a status into a sentence — `BookingLine` receives words and only
 * draws them, because the browser's clock is not hers.
 */
function lineFor(booking: BookingWithOffering) {
  const offering = offeringOf(booking);
  const row = toLedgerRow(booking);
  const deposit = booking.payments.find((one) => one.kind === "deposit");
  const owed = outstandingPence(booking);
  const deadline = offering.firstDate
    ? refundDeadline(offering.firstDate, offering.refundDays)
    : null;
  const lastRefundedAt = booking.payments
    .map((one) => one.refundedAt)
    .filter((at): at is Date => at !== null)
    .sort((one, other) => other.getTime() - one.getTime())[0];

  const cancelledBy =
    booking.cancelledReason === "marianne"
      ? "by you"
      : booking.cancelledReason === "soldOut"
        ? "— the last place went while they were paying"
        : "by them";

  // WHERE IT STANDS, in one line. Five true situations, and the third of them
  // is the one a shorter version would get wrong: she can refund WITHOUT
  // cancelling, and reading "paid in full" beside a held figure of £0 would be
  // the row lying about both halves at once.
  const standing =
    booking.status === "paid"
      ? hasLapsed(booking)
        ? "Released — the balance was not paid"
        : alreadyRefunded(booking)
          ? `Refunded${lastRefundedAt ? ` ${formatInstant(lastRefundedAt)}` : ""} — the place is still held`
          : owed > 0
            ? `${formatMoney(owed)} still to come in`
            : "Paid in full"
      : booking.status === "cancelledRefunded"
        ? `Cancelled ${cancelledBy} — refunded`
        : refundOwed(booking)
          ? `Cancelled ${cancelledBy} — the money has not gone back`
          : `Cancelled ${cancelledBy} — nothing was owed back`;

  const alarming =
    (booking.status === "paid" && hasLapsed(booking)) || refundOwed(booking);

  const refundPeriod =
    offering.kind === "service"
      ? "None on a session — refunding is yours to decide"
      : offering.refundDays === 0
        ? "This one cannot be refunded"
        : deadline
          ? `${offering.refundDays} days — ${isRefundable(offering) ? `closes ${formatDayShort(deadline)}` : `closed ${formatDayShort(deadline)}`}`
          : `${offering.refundDays} days`;

  return (
    <BookingLine
      key={booking.id}
      row={row}
      unseen={booking.seenAt === null}
      line={{
        kindWord:
          offering.kind === "workshop"
            ? "Workshop"
            : offering.kind === "course"
              ? "Course"
              : "Session",
        offeringName: offering.name,
        whenWords: `${whenWords(offering)} · ${offering.kind === "service" ? "one session" : places(booking.places)}`,
        held: formatMoney(heldPence(booking)),
        standing,
        alarming,
      }}
      detail={{
        email: booking.buyerEmail,
        reference: bookingReference(booking.id),
        places:
          offering.kind === "service" ? "One session" : places(booking.places),
        paidOn: formatInstant(booking.paidAt),
        // Empty on a workshop, which is paid in full when it is booked — the
        // sheet drops a null fact rather than drawing a labelled blank.
        deposit: deposit ? formatMoney(deposit.amountPence) : null,
        outstanding:
          owed > 0
            ? `${formatMoney(owed)}${booking.balanceDueAt ? ` · due ${formatDayShort(booking.balanceDueAt)}` : ""}`
            : null,
        refundPeriod,
        everPaid: formatMoney(paidPence(booking)),
        cancelled: booking.cancelledAt
          ? `${formatInstant(booking.cancelledAt)} ${cancelledBy}`
          : null,
        refunded: lastRefundedAt ? formatInstant(lastRefundedAt) : null,
      }}
    />
  );
}

// ── the tables ───────────────────────────────────────────────────────────────

/**
 * THE COLUMN HEADS, for the one line each row is now.
 *
 * Five and the controls, where there were seven of prose. Email, deposit, the
 * refund period and who cancelled it are all in the sheet — a queue is for
 * finding the row that needs her; the file is what she wants once she has
 * found it (operator, 2026-08-19).
 */
function Headers() {
  return (
    <thead>
      <tr className="border-b-2 border-ink">
        <th scope="col" className={HEAD}>
          Name
        </th>
        <th scope="col" className={HEAD}>
          Type
        </th>
        <th scope="col" className={HEAD}>
          Offering
          <span className={CAPTION}>and when</span>
        </th>
        <th scope="col" className={HEAD}>
          Where it stands
        </th>
        <th scope="col" className={HEAD}>
          Held
          <span className={CAPTION}>with you now</span>
        </th>
        <th scope="col" className={`${HEAD} pr-0`}>
          Actions
          <span className={CAPTION}>
            cancel &middot; refund &middot; delete
          </span>
        </th>
      </tr>
    </thead>
  );
}

function Table({
  id,
  caption,
  bookings,
  children,
}: {
  id: string;
  caption: string;
  bookings: BookingWithOffering[];
  children?: React.ReactNode;
}) {
  return (
    <div className="pool on-pool mt-5 px-6 py-2 sm:px-8">
      <div className="overflow-x-auto">
        <table
          id={id}
          className="w-full min-w-[900px] border-collapse text-left"
        >
          <caption className="sr-only">{caption}</caption>
          <Headers />
          <tbody>{bookings.map(lineFor)}</tbody>
        </table>
      </div>
      {children}
    </div>
  );
}

function Empty({
  eyebrow,
  eyebrowClass,
  title,
  children,
}: {
  eyebrow: string;
  eyebrowClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pool on-pool mt-5 max-w-[62ch] px-7 py-7">
      <p
        className={`fig font-mono text-[15px] uppercase tracking-[0.14em] ${eyebrowClass}`}
      >
        {eyebrow}
      </p>
      <p className="mt-2 font-display text-[26px] leading-tight text-ink">
        {title}
      </p>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        {children}
      </p>
    </div>
  );
}

// ── the page ─────────────────────────────────────────────────────────────────

/** One of the two tabs, drawn as a link so the choice survives a reload. */
function Tab({
  href,
  label,
  count,
  current,
}: {
  href: string;
  label: string;
  count: number;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={
        current
          ? "t border-b-2 border-gold pb-2 text-[19px] font-semibold text-plate-text"
          : "t border-b-2 border-transparent pb-2 text-[19px] text-plate-soft hover:text-plate-text"
      }
    >
      {label}{" "}
      <span className="fig font-mono text-[16px] tabular-nums">{count}</span>
    </Link>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; kind?: string; page?: string }>;
}) {
  const { show, kind, page: pageParam } = await searchParams;
  // The tabs (operator, 2026-08-19). Upcoming is the default, because a booking
  // she has to do something about is always one that has not happened.
  const showingPast = show === "past";

  /**
   * AND A THIRD, FOR MONEY THAT HAS NOT ARRIVED (operator, 2026-08-21).
   *
   * It cuts ACROSS the other two rather than sitting beside them: a payment can
   * be overdue on a course that has already started, so filing it under Past
   * would hide the one thing she needs to chase. What this tab holds is
   * everybody with something to pay, whenever their course is.
   */
  const showingOwing = show === "owing";

  // WHICH KIND, or all of them (operator, 2026-08-19). A query value rather
  // than client state, for the same reason the tabs are links: it survives a
  // reload and can be bookmarked. Anything unrecognised means all — a typo in
  // the address should show her everything rather than an empty table.
  const KINDS = ["workshop", "course", "service"] as const;
  const filtered = (KINDS as readonly string[]).includes(kind ?? "")
    ? (kind as (typeof KINDS)[number])
    : null;

  const all = await listAllBookings();

  // Soonest first while it is still to come; most recent first once it has
  // been. Both orders are "the thing you are most likely to be looking for at
  // the top", which is a different sort on either side of today. The date is
  // read off the offering rather than the row, because a course has none of its
  // own — its run does (D-21).
  //
  // A SESSION HAS NO DATE AT ALL, so it sorts by when it was paid for and never
  // moves to the archive: nothing here can read the sentence she and the client
  // agreed, and filing a session on a date the portal invented would put it in
  // the past while somebody was still expecting it (D-25).
  const dateOf = (booking: BookingWithOffering) =>
    (offeringOf(booking).firstDate ?? booking.paidAt).getTime();
  const stillToCome = (booking: BookingWithOffering) =>
    !hasBeen(offeringOf(booking));

  // The filter is applied BEFORE the split, so the two tab counts are counts of
  // what each tab will actually show. Counting one thing and showing another is
  // the way a filtered table starts lying about itself.
  const ofKind = (booking: BookingWithOffering) =>
    filtered === null || offeringOf(booking).kind === filtered;

  const upcoming = all
    .filter((booking) => stillToCome(booking) && ofKind(booking))
    .sort((a, b) => dateOf(a) - dateOf(b) || a.id - b.id);
  const archived = all
    .filter((booking) => !stillToCome(booking) && ofKind(booking))
    .sort((a, b) => dateOf(b) - dateOf(a) || b.id - a.id);

  /**
   * EVERYBODY WITH SOMETHING TO PAY, whenever their course is.
   *
   * LATE FIRST, and the latest of the late at the top — the order she would put
   * them in herself, because the top of this list is a list of phone calls.
   */
  const owingRows = (await owing())
    .filter((row) => ofKind(row.booking))
    .sort(
      (a, b) =>
        b.overdueDays - a.overdueDays ||
        (a.next?.dueAt.getTime() ?? 0) - (b.next?.dueAt.getTime() ?? 0),
    );

  // THE TAB'S WHOLE POPULATION, before the kind filter, so the number beside
  // each filter is the number of rows that filter will actually produce on the
  // tab she is looking at. Counting from `all` instead would say how many
  // sessions exist rather than how many are upcoming.
  const inThisTab = all.filter((booking) =>
    showingPast ? !stillToCome(booking) : stillToCome(booking),
  );

  // Every total on this screen is NET: what she is actually holding, with
  // anything already sent back taken off. A gross figure would count a refunded
  // booking's money twice — once here and once on somebody's statement.
  const live = upcoming.filter((b) => b.status === "paid");
  const takenAhead = live.reduce((sum, b) => sum + heldPence(b), 0);
  const refundableAhead = live
    .filter((b) => isRefundable(offeringOf(b)) && !alreadyRefunded(b))
    .reduce((sum, b) => sum + heldPence(b), 0);
  const owedAhead = upcoming
    .filter((b) => refundOwed(b))
    .reduce((sum, b) => sum + heldPence(b), 0);
  const cancelledAhead = upcoming.length - live.length;

  // The two figures that only a course can produce: what is still to come in,
  // and what has quietly gone back on sale because it never did.
  const outstandingAhead = live
    .filter((b) => !hasLapsed(b))
    .reduce((sum, b) => sum + outstandingPence(b), 0);
  const lapsed = live.filter((b) => hasLapsed(b));

  const takenBefore = archived.reduce((sum, b) => sum + heldPence(b), 0);

  // TWELVE TO A PAGE (operator, 2026-08-19), which replaces the archive's old
  // "showing the 5 most recent · show all". A page is a better answer to a long
  // list than a truncation with an escape hatch: it says how many there are and
  // lets her walk them.
  // NEVER OPENED. Not "recent": a booking from Tuesday she has never once
  // looked at is still new to her on Friday.
  const unseen = all.filter((b) => b.seenAt === null).length;

  const rows = showingPast ? archived : upcoming;
  const page = currentPage(pageParam, rows.length);
  const shown = pageSlice(rows, page);
  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    if (showingPast) params.set("show", "past");
    if (filtered) params.set("kind", filtered);
    if (next > 1) params.set("page", String(next));
    const query = params.toString();
    return `/admin/workshop-bookings${query ? `?${query}` : ""}`;
  };

  return (
    <section className="pt-8" aria-labelledby="ledger-h">
      {/* THE ONE HEADING. The sentence that used to stand here — how many are
          live and what she is holding against them — was removed at the
          operator's request (2026-08-19), and every figure in it is still on
          the screen: the counts are on the tabs and the money is beside them.
          It is an `h1` rather than the `p` it was, because a page with no
          heading has no outline for a screen reader to move by. */}
      <h1 id="ledger-h" className={EYEBROW}>
        Bookings
      </h1>

      {/* THE ONE THING NOTHING CAN TELL HER. A place released by an unpaid
          balance happens by the passing of a date, so there is no moment at
          which anything could send a message — and nothing here runs on a
          schedule. It is said at the top of the screen she opens instead, above
          the tables, in the figures rather than as a warning. */}
      {lapsed.length > 0 && (
        <p className="mt-6 max-w-[72ch] border-l-2 border-pool-error bg-pool-error/10 px-5 py-4 text-[19px] leading-relaxed text-plate-text">
          <strong className="font-semibold">
            {lapsed.length === 1
              ? "One place has been released"
              : `${lapsed.length} places have been released`}{" "}
            because the balance was not paid.
          </strong>{" "}
          {lapsed.length === 1 ? "It is" : "They are"} back on sale, and{" "}
          {formatMoney(lapsed.reduce((sum, b) => sum + heldPence(b), 0))} of
          deposit money is still with you. Each one says so on its own row
          below. Nothing has been cancelled and nothing has been refunded —
          those are yours to decide.
        </p>
      )}

      {/* TWO TABS, where two stacked tables were (operator, 2026-08-19). The
          split is unchanged — a booking is upcoming until its day has been, or
          on a course until the last date of the run has, and it moves itself
          the morning after. What changed is that the archive is now somewhere
          she goes rather than something she scrolls past. */}
      <nav
        aria-label="Which bookings"
        className="mt-9 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-plate-rule/40"
      >
        {/* THE KIND TRAVELS WITH THE TAB. Dropping it would clear her filter
            the moment she looked at the other side, which reads as the filter
            having failed rather than as the tab having changed. */}
        <Tab
          href={`/admin/workshop-bookings${filtered ? `?kind=${filtered}` : ""}`}
          label="Upcoming"
          count={upcoming.length}
          current={!showingPast}
        />
        <Tab
          href={`/admin/workshop-bookings?show=past${filtered ? `&kind=${filtered}` : ""}`}
          label="Past"
          count={archived.length}
          current={showingPast}
        />
        {/* THE THIRD TAB CUTS ACROSS THE OTHER TWO (operator, 2026-08-21). A
            payment can be overdue on a course that has already started, so
            filing it under Past would hide the one thing she needs to chase. */}
        <Tab
          href={`/admin/workshop-bookings?show=owing${filtered ? `&kind=${filtered}` : ""}`}
          label="Owing"
          count={owingRows.length}
          current={showingOwing}
        />
        {unseen > 0 && (
          <span className="ml-auto flex flex-wrap items-baseline gap-x-4">
            <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
              {unseen === 1
                ? "1 you have not opened"
                : `${unseen} you have not opened`}
            </span>
            <MarkAllSeen action={markAllBookingsSeen} count={unseen} />
          </span>
        )}
      </nav>

      {/* WHICH KIND. Counts are of the tab she is on, so switching to Sessions
          on Upcoming says how many sessions are upcoming rather than how many
          exist — the number beside a filter has to be the number of rows it
          will produce, or it is a different question's answer. */}
      <nav
        aria-label="Which kind of booking"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        {(
          [
            [null, "All"],
            ["workshop", "Workshops"],
            ["course", "Courses"],
            ["service", "Sessions"],
          ] as const
        ).map(([value, label]) => {
          const params = new URLSearchParams();
          if (showingPast) params.set("show", "past");
          if (value) params.set("kind", value);
          const query = params.toString();
          const count =
            value === null
              ? inThisTab.length
              : inThisTab.filter((b) => offeringOf(b).kind === value).length;
          const current = filtered === value;
          return (
            <Link
              key={label}
              href={`/admin/workshop-bookings${query ? `?${query}` : ""}`}
              aria-current={current ? "true" : undefined}
              className={
                current
                  ? "t min-h-[38px] border border-gold bg-gold px-3 py-1.5 text-[15px] text-ink"
                  : "t min-h-[38px] border border-plate-rule/60 px-3 py-1.5 text-[15px] text-plate-soft hover:border-gold hover:text-plate-text"
              }
            >
              {label}{" "}
              <span className="fig font-mono text-[14px] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* The figures that were in the headline, kept where they are still
          read: what is held against what is still to come, what came in on
          what has been. */}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="max-w-[62ch] fig font-mono text-[17px] tabular-nums text-plate-soft">
          {showingPast
            ? archived.length === 0
              ? "No day has been yet"
              : `${archived.length} ${archived.length === 1 ? "booking" : "bookings"} whose day has been · most recent first`
            : upcoming.length === 0
              ? "Nothing in the diary has been booked"
              : `${upcoming.length} ${upcoming.length === 1 ? "row" : "rows"} — ${live.length} live${cancelledAhead > 0 ? `, ${cancelledAhead} cancelled` : ""}${lapsed.length > 0 ? `, ${lapsed.length} released` : ""} · soonest first`}
          {!showingPast &&
            outstandingAhead > 0 &&
            ` · ${formatMoney(outstandingAhead)} of balances still to come in`}
          {!showingPast &&
            owedAhead > 0 &&
            ` · ${formatMoney(owedAhead)} of the cancelled money has not gone back yet`}
        </p>
        {showingPast
          ? takenBefore > 0 && (
              <p className="fig font-mono text-[24px] tabular-nums text-plate-soft">
                {formatMoney(takenBefore)} taken
              </p>
            )
          : takenAhead > 0 && (
              <p className="fig font-mono text-[24px] tabular-nums text-gold">
                {formatMoney(takenAhead)} held
                {refundableAhead > 0 && (
                  <span className="ml-3 text-[17px] text-plate-soft">
                    {formatMoney(refundableAhead)} still refundable
                  </span>
                )}
              </p>
            )}
      </div>

      {showingOwing ? (
        <section className="mt-6" aria-label="Bookings with a payment due">
          <OwingTable
            rows={owingRows.map((row) => {
              const offering = offeringOf(row.booking);
              const paid = row.booking.instalments.filter(
                (one) => one.paidAt !== null,
              ).length;
              return {
                id: row.booking.id,
                who: row.booking.buyerName,
                email: row.booking.buyerEmail,
                what: offering.name,
                href:
                  offering.kind === "course"
                    ? `/admin/offerings/courses/${offering.slug}`
                    : null,
                duePence: row.duePence,
                remainingPence: row.remainingPence,
                overdueDays: row.overdueDays,
                overdueWords: overdueWords(row.overdueDays),
                dueWords: row.next
                  ? `due ${formatDayShort(row.next.dueAt)}`
                  : "",
                which: `${Math.min(paid + 1, row.booking.instalments.length)} of ${row.booking.instalments.length}`,
                remindedWords: row.next?.remindedAt
                  ? `reminded ${formatDayShort(row.next.remindedAt)}`
                  : null,
              };
            })}
            // EVERY FIGURE FORMATTED ON THE SERVER, by the one function that
            // formats every price in this app. A client component doing its own
            // sum is how a table comes to disagree with the ledger beside it.
            money={Object.fromEntries(
              owingRows.flatMap((row) => [
                [row.duePence, formatMoney(row.duePence)],
                [row.remainingPence, formatMoney(row.remainingPence)],
              ]),
            )}
          />
        </section>
      ) : showingPast ? (
        <section className="mt-6" aria-label="Bookings whose day has been">
          {archived.length === 0 ? (
            <Empty
              eyebrow="Empty · past"
              eyebrowClass="text-ink-soft"
              title="Nothing has happened yet."
            >
              This fills itself. The first booking drops in here the morning
              after its day, and everything that has ever been paid for stays in
              it. There is nothing above that needs moving.
            </Empty>
          ) : (
            <Table
              id="archive-table"
              caption="Bookings whose day has already been, most recent first. Columns: name, email, type of offering, offering and dates with its own refund period, deposit and what is still owed on it, money currently held, and the actions available for that booking's state. A day that has been cannot be cancelled, so cancel is spent on every row here; refund is still available as a goodwill decision, and delete only on a booking that was cancelled."
              bookings={shown}
            >
              {/* THE PAGER REPLACES "showing the 5 most recent · show all",
                  which was a truncation with an escape hatch. */}
              <Pager
                page={page}
                total={rows.length}
                href={pageHref}
                label="bookings"
              />
            </Table>
          )}
        </section>
      ) : (
        <section className="mt-6" aria-label="Bookings still to come">
          {upcoming.length === 0 ? (
            <Empty
              eyebrow="Empty · upcoming"
              eyebrowClass="text-action"
              title="Nothing is booked yet."
            >
              Your workshops and courses are live on the site and nobody has
              booked one. The first booking appears here the minute someone
              pays, with the money and that offering&rsquo;s refund date already
              worked out.
            </Empty>
          ) : (
            <Table
              id="upcoming-table"
              caption="Bookings for days that have not happened yet, soonest first. Columns: name, email, type of offering, offering and dates with its own refund period, deposit and what is still owed on it, money currently held, and the cancel, refund and delete actions available for that booking's state."
              bookings={shown}
            >
              <Pager
                page={page}
                total={rows.length}
                href={pageHref}
                label="bookings"
              />
            </Table>
          )}
        </section>
      )}
    </section>
  );
}
