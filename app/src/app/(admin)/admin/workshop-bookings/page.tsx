import type { Metadata } from "next";
import BookingActions, {
  type LedgerRow,
} from "@/components/admin/BookingActions";
import {
  alreadyRefunded,
  bookingReference,
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
 * THE TWO COLUMNS THE APPROVED SCREEN DREW EMPTY ARE FULL NOW (D-23). Type says
 * Workshop or Course, because both can be bought; Deposit says what was taken at
 * booking and what is still owed, because a course can be sold on one. Services
 * are still not bookable, so no row has ever said Service, and none pretends to.
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

/** How many of the archive are drawn before it offers to show the rest. */
const ARCHIVE_SHOWN = 5;

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
    refundDays: offering.refundDays,
    refundDeadline: refundDeadline(offering.firstDate, offering.refundDays),
    dayHasBeen: isPast(offering.lastDate),
    insidePeriod: isRefundable(offering),
  };
}

/** "1 place" / "3 places" */
function places(n: number): string {
  return `${n} ${n === 1 ? "place" : "places"}`;
}

/** "Sat 20 Sep" for a workshop · "Four Wednesdays · 7–28 Oct" for a course. */
function whenWords(offering: Offering): string {
  if (offering.kind === "workshop") return formatDayShort(offering.firstDate);
  const run = runShape(offering.dates);
  return run
    ? `${run.words} · ${run.span}`
    : formatDayShort(offering.firstDate);
}

/**
 * The line under the offering — the one thing about this booking she has to
 * know before she touches anything.
 *
 * On a live booking that is its own refund period, measured against ITS OWN
 * offering and never a site-wide rule. On a cancelled one it is what happened
 * to the money, and who did it. And on a course place whose balance never
 * arrived it is that, before anything else: a released place is the state that
 * changes what the room holds, so it is the state that gets said first.
 */
function StateLine({ booking }: { booking: BookingWithOffering }) {
  const offering = offeringOf(booking);
  const deadline = refundDeadline(offering.firstDate, offering.refundDays);
  const owed = refundOwed(booking);

  if (booking.status === "paid") {
    // ── the released place ──────────────────────────────────────────────────
    // Said first and said in red, because it is the only state on this screen
    // that changed something — the room — without anybody doing anything.
    if (hasLapsed(booking)) {
      return (
        <span className={`${NOTE} text-pool-error`}>
          Balance not paid by {formatDayShort(booking.balanceDueAt as Date)} —
          this place is released and back on sale.{" "}
          {formatMoney(heldPence(booking))} of theirs is still with you.
        </span>
      );
    }
    if (outstandingPence(booking) > 0 && booking.balanceDueAt) {
      return (
        <span className={NOTE}>
          {formatMoney(outstandingPence(booking))} due{" "}
          {formatDayShort(booking.balanceDueAt)} — the place is released if it
          is not paid
        </span>
      );
    }
    if (alreadyRefunded(booking)) {
      return (
        <span className={`${NOTE} text-pool-success`}>
          Refunded{" "}
          {booking.payments.find((one) => one.refundedAt)?.refundedAt
            ? `on ${formatInstant(booking.payments.find((one) => one.refundedAt)!.refundedAt as Date)}`
            : ""}{" "}
          — the place is still held
        </span>
      );
    }
    if (offering.refundDays === 0) {
      return <span className={NOTE}>This one cannot be refunded</span>;
    }
    if (isPast(offering.lastDate)) {
      return (
        <span className={NOTE}>Refund period {offering.refundDays} days</span>
      );
    }
    if (!deadline) return null;
    if (isRefundable(offering)) {
      // The deadline day itself still counts, so the day it falls on is worth
      // saying out loud rather than printing today's date back at her.
      const now = new Date();
      const lastDay =
        deadline.getUTCFullYear() === now.getUTCFullYear() &&
        deadline.getUTCMonth() === now.getUTCMonth() &&
        deadline.getUTCDate() === now.getUTCDate();
      return (
        <span className={NOTE}>
          Refund period {offering.refundDays} days —{" "}
          {lastDay
            ? "today is the last day"
            : `closes ${formatDayShort(deadline)}`}
        </span>
      );
    }
    return (
      <span className={`${NOTE} text-pool-error`}>
        Refund period {offering.refundDays} days — closed{" "}
        {formatDayShort(deadline)}
      </span>
    );
  }

  const by =
    booking.cancelledReason === "marianne"
      ? "by you"
      : booking.cancelledReason === "soldOut"
        ? "— the last place went while they were paying"
        : "by them";
  const when = booking.cancelledAt
    ? ` ${formatInstant(booking.cancelledAt)}`
    : "";

  if (booking.status === "cancelledRefunded") {
    const refundedAt = booking.payments.find(
      (one) => one.refundedAt,
    )?.refundedAt;
    return (
      <span className={NOTE}>
        Cancelled{when} {by} — refunded
        {refundedAt ? ` ${formatInstant(refundedAt)}` : ""}
      </span>
    );
  }
  return (
    <span className={owed ? `${NOTE} text-pool-error` : NOTE}>
      Cancelled{when} {by} —{" "}
      {owed ? "the money has not gone back" : "nothing was owed back"}
    </span>
  );
}

/**
 * The deposit column, which the approved screen drew and nothing could fill.
 *
 * Empty on a workshop, and it says why once in the note under the headline
 * rather than on every row. On a course it is the two figures that make the
 * arrangement: what was taken at booking, and what is still to come.
 */
function Deposit({ booking }: { booking: BookingWithOffering }) {
  const deposit = booking.payments.find((one) => one.kind === "deposit");
  const owed = outstandingPence(booking);

  if (!deposit) {
    return (
      <>
        <span
          className="block fig font-mono text-[17px] text-ink-soft"
          aria-hidden="true"
        >
          &ndash;
        </span>
        <span className="sr-only">
          No deposit. This one was paid in full when it was booked.
        </span>
      </>
    );
  }

  return (
    <>
      <span className="block whitespace-nowrap fig font-mono text-[17px] tabular-nums text-ink">
        {formatMoney(deposit.amountPence)}
      </span>
      <span className={NOTE}>
        {owed === 0
          ? "settled in full"
          : `${formatMoney(owed)} still owed${booking.balanceDueAt ? ` · ${formatDayShort(booking.balanceDueAt)}` : ""}`}
      </span>
    </>
  );
}

/** The money column: what is with her, and what has left. */
function Money({ booking }: { booking: BookingWithOffering }) {
  const held = heldPence(booking);
  const paid = paidPence(booking);
  const owed = refundOwed(booking);

  if (alreadyRefunded(booking)) {
    const refundedAt = booking.payments.find(
      (one) => one.refundedAt,
    )?.refundedAt;
    return (
      <>
        <span className="block whitespace-nowrap fig font-mono text-[19px] font-semibold tabular-nums text-pool-success">
          {formatMoney(0)}
        </span>
        <span className={NOTE}>
          {formatMoney(paid)} went back
          {refundedAt ? ` on ${formatInstant(refundedAt)}` : ""}
        </span>
      </>
    );
  }

  return (
    <>
      <span
        className={`block whitespace-nowrap fig font-mono text-[19px] font-semibold tabular-nums ${owed ? "text-pool-error" : "text-ink"}`}
      >
        {formatMoney(held)}
      </span>
      <span className={NOTE}>
        {owed ? "still with you" : `paid ${formatInstant(booking.paidAt)}`}
      </span>
    </>
  );
}

function Row({ booking }: { booking: BookingWithOffering }) {
  const offering = offeringOf(booking);
  return (
    <tr className="border-t border-pool-rule align-top">
      <th
        scope="row"
        className="whitespace-nowrap py-5 pr-5 text-left align-top text-[17px] font-semibold text-ink"
      >
        {booking.buyerName}
      </th>
      <td className={`${CELL} fig font-mono text-[15px] text-ink-soft`}>
        <a
          href={`mailto:${booking.buyerEmail}`}
          className="text-ink-soft underline decoration-pool-rule hover:text-ink hover:decoration-ink"
        >
          {booking.buyerEmail}
        </a>
      </td>
      <td
        className={`${CELL} whitespace-nowrap fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft`}
      >
        {offering.kind === "workshop" ? "Workshop" : "Course"}
      </td>
      <td className={CELL}>
        <span className="block font-display text-[21px] leading-tight text-ink">
          {offering.name}
        </span>
        <span className={NOTE}>
          {whenWords(offering)} &middot; {places(booking.places)}
          {booking.status === "paid" ? "" : ", released"}
        </span>
        <StateLine booking={booking} />
      </td>
      <td className={CELL}>
        <Deposit booking={booking} />
      </td>
      <td className={CELL}>
        <Money booking={booking} />
      </td>
      <td className="py-5 align-top">
        <BookingActions booking={toLedgerRow(booking)} />
      </td>
    </tr>
  );
}

// ── the tables ───────────────────────────────────────────────────────────────

function Headers() {
  return (
    <thead>
      <tr className="border-b-2 border-ink">
        <th scope="col" className={HEAD}>
          Name
        </th>
        <th scope="col" className={HEAD}>
          Email
        </th>
        <th scope="col" className={HEAD}>
          Type
        </th>
        <th scope="col" className={HEAD}>
          Offering
        </th>
        <th scope="col" className={HEAD}>
          Deposit<span className={CAPTION}>courses only</span>
        </th>
        <th scope="col" className={HEAD}>
          Held<span className={CAPTION}>what is with you now</span>
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
          className="w-full min-w-[940px] border-collapse text-left"
        >
          <caption className="sr-only">{caption}</caption>
          <Headers />
          <tbody>
            {bookings.map((booking) => (
              <Row key={booking.id} booking={booking} />
            ))}
          </tbody>
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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const showWholeArchive = archive === "all";

  const all = await listAllBookings();

  // Soonest first while it is still to come; most recent first once it has
  // been. Both orders are "the thing you are most likely to be looking for at
  // the top", which is a different sort on either side of today. The date is
  // read off the offering rather than the row, because a course has none of its
  // own — its run does (D-21).
  const dateOf = (booking: BookingWithOffering) =>
    offeringOf(booking).firstDate.getTime();
  const stillToCome = (booking: BookingWithOffering) =>
    !isPast(offeringOf(booking).lastDate);

  const upcoming = all
    .filter(stillToCome)
    .sort((a, b) => dateOf(a) - dateOf(b) || a.id - b.id);
  const archived = all
    .filter((booking) => !stillToCome(booking))
    .sort((a, b) => dateOf(b) - dateOf(a) || b.id - a.id);

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
  const archiveShown = showWholeArchive
    ? archived
    : archived.slice(0, ARCHIVE_SHOWN);

  return (
    <section className="pt-8" aria-labelledby="ledger-h">
      <p className={EYEBROW}>Bookings</p>

      {/* The one question this screen answers, in the figures that answer it.
          Nothing here is a label: it is a sentence made of what is true. */}
      <h1
        id="ledger-h"
        className="mt-3 max-w-[26ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:max-w-[34ch] sm:text-[40px]"
      >
        {live.length > 0 ? (
          <>
            {live.length === 1 ? (
              <>
                One live booking is for something that hasn&rsquo;t happened
                yet, and you are holding {formatMoney(takenAhead)} against it.
              </>
            ) : (
              <>
                {live.length} live bookings are for things that haven&rsquo;t
                happened yet, and you are holding {formatMoney(takenAhead)}{" "}
                against them.
              </>
            )}
            <br />
            <span className="text-gold">
              {refundableAhead > 0
                ? `${formatMoney(refundableAhead)} of it is still inside its refund period.`
                : "None of it is still inside its refund period."}
            </span>
          </>
        ) : all.length > 0 ? (
          <>
            Nothing is booked for a day still to come.
            <br />
            <span className="text-gold">
              Everything that has been paid for is in the archive below.
            </span>
          </>
        ) : (
          <>Nobody has booked a place yet.</>
        )}
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

      <p className="mt-5 max-w-[72ch] text-[19px] leading-relaxed text-plate-soft">
        A booking sits in the first table until its day has been — or, on a
        course, until the last date of the run has. The morning after, it moves
        itself down to the archive. There is nothing to file.
      </p>
      <p className="mt-3 max-w-[72ch] text-[19px] leading-relaxed text-plate-soft">
        Every workshop and every course carries its own refund period, set when
        you make it. Each row is measured against its own, and says which. A
        course&rsquo;s is counted back from its first date.
      </p>
      <p className="mt-3 max-w-[72ch] text-[19px] leading-relaxed text-plate-soft">
        Cancel is the everyday one. It releases the place, and while the booking
        is still inside its refund period it asks whether to send the money back
        as well. Past that period it cancels without a refund and says so
        plainly. Refund can also be used on its own, later, if you change your
        mind — and it sends back everything that has actually arrived, which on
        a course part-paid is the deposit and nothing else. Delete stays out of
        reach until a booking has been cancelled — it takes the record away
        altogether, and it cannot be undone.
      </p>

      {/* Said once, quietly, because Deposit is empty on every workshop row
          and Service has never appeared at all. */}
      <p className="mt-6 max-w-[72ch] fig font-mono text-[15px] leading-relaxed text-plate-soft">
        Deposit is empty on a workshop, which is paid in full when it is booked.
        Type never reads Service, because a session cannot be bought online yet
        — the column stays, so that nothing has to move when it can.
      </p>

      {/* ── still to come ──────────────────────────────────────────────── */}
      <section className="mt-10" aria-labelledby="upcoming-h">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-plate-rule/40 pt-6">
          <div>
            <h2
              id="upcoming-h"
              className="font-display text-[28px] font-normal leading-tight text-plate-text"
            >
              Still to come
            </h2>
            <p className="mt-1 max-w-[62ch] fig font-mono text-[17px] tabular-nums text-plate-soft">
              {upcoming.length === 0
                ? "Nothing in the diary has been booked"
                : `${upcoming.length} ${upcoming.length === 1 ? "row" : "rows"} — ${live.length} live${cancelledAhead > 0 ? `, ${cancelledAhead} cancelled` : ""}${lapsed.length > 0 ? `, ${lapsed.length} released` : ""} · soonest first`}
              {outstandingAhead > 0 &&
                ` · ${formatMoney(outstandingAhead)} of balances still to come in`}
              {owedAhead > 0 &&
                ` · ${formatMoney(owedAhead)} of the cancelled money has not gone back yet`}
            </p>
          </div>
          {takenAhead > 0 && (
            <p className="fig font-mono text-[24px] tabular-nums text-gold">
              {formatMoney(takenAhead)} held
            </p>
          )}
        </div>

        {upcoming.length === 0 ? (
          <Empty
            eyebrow="Empty · still to come"
            eyebrowClass="text-action"
            title="Nothing is booked yet."
          >
            Your workshops and courses are live on the site and nobody has
            booked one. The first booking appears here the minute someone pays,
            with the money and that offering&rsquo;s refund date already worked
            out.
          </Empty>
        ) : (
          <Table
            id="upcoming-table"
            caption="Bookings for days that have not happened yet, soonest first. Columns: name, email, type of offering, offering and dates with its own refund period, deposit and what is still owed on it, money currently held, and the cancel, refund and delete actions available for that booking's state."
            bookings={upcoming}
          />
        )}
      </section>

      {/* ── archive ────────────────────────────────────────────────────── */}
      <section className="mt-14" aria-labelledby="archive-h">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-plate-rule/40 pt-6">
          <div>
            <h2
              id="archive-h"
              className="font-display text-[28px] font-normal leading-tight text-plate-soft"
            >
              Archive
            </h2>
            <p className="mt-1 max-w-[62ch] fig font-mono text-[17px] tabular-nums text-plate-soft">
              {archived.length === 0
                ? "No day has been yet"
                : `${archived.length} ${archived.length === 1 ? "booking" : "bookings"} whose day has been · most recent first`}
            </p>
          </div>
          {takenBefore > 0 && (
            <p className="fig font-mono text-[24px] tabular-nums text-plate-soft">
              {formatMoney(takenBefore)} taken
            </p>
          )}
        </div>

        {archived.length === 0 ? (
          <Empty
            eyebrow="Empty · archive"
            eyebrowClass="text-ink-soft"
            title="Nothing has happened yet."
          >
            The archive fills itself. The first booking drops down here the
            morning after its day, and everything that has ever been paid for
            stays in it. There is nothing above that needs moving.
          </Empty>
        ) : (
          <Table
            id="archive-table"
            caption="Bookings whose day has already been, most recent first. The same columns as the table above. A day that has been cannot be cancelled, so cancel is spent on every row here; refund is still available as a goodwill decision, and delete only on a booking that was cancelled."
            bookings={archiveShown}
          >
            {archived.length > archiveShown.length && (
              <p className="max-w-[70ch] border-t border-pool-rule py-6 text-[17px] leading-relaxed text-ink-soft">
                Showing the {archiveShown.length} most recent. The other{" "}
                {archived.length - archiveShown.length} are below, newest first.
                Nothing leaves the archive by the passing of time — only by you.{" "}
                <a
                  href="/admin/workshop-bookings?archive=all"
                  className="font-medium text-action underline decoration-1 underline-offset-4"
                >
                  Show all {archived.length}
                </a>
                .
              </p>
            )}
          </Table>
        )}
      </section>
    </section>
  );
}
