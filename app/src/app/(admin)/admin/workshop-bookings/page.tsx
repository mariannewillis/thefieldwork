import type { Metadata } from "next";
import BookingActions, {
  type LedgerRow,
} from "@/components/admin/BookingActions";
import {
  alreadyRefunded,
  bookingReference,
  isRefundable,
  listAllBookings,
  refundOwed,
  type BookingWithWorkshop,
} from "@/lib/bookings";
import {
  formatDayShort,
  formatInstant,
  formatMoney,
  isPast,
  refundDeadline,
} from "@/lib/format";

/**
 * The ledger — every place anyone has paid for.
 *
 * Ported from docs/screens/workshopflow/admin-workshop-bookings.html. It lives
 * at /admin/workshop-bookings and NOT at /admin/bookings, which is the requests
 * queue: somebody asking for an hour and waiting to be answered. Two jobs, two
 * screens (D-18); the approved rail gives them separate rows for the same
 * reason.
 *
 * TWO TABLES AND NOTHING TO FILE. A booking sits in "still to come" until its
 * day has been, and the morning after it is in the archive. That is a
 * consequence of the date and not a state anybody sets, so there is no column
 * to keep in step and nothing that can get stuck in the wrong one.
 *
 * WHAT THE APPROVED SCREEN SHOWS THAT THIS CANNOT, and says so once rather than
 * faking variety: Type reads "Workshop" on every row because a workshop is the
 * only thing that can be bought — there is no Service or Course model yet — and
 * Deposit is empty on every row because only a course takes one. Both columns
 * stay, because they are the shape of the table those things will arrive into,
 * and inventing a Service row to make the column look busy would be a lie the
 * size of a whole product.
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
function toLedgerRow(booking: BookingWithWorkshop): LedgerRow {
  return {
    id: booking.id,
    reference: bookingReference(booking.id),
    buyerName: booking.buyerName,
    places: booking.places,
    amountPence: booking.amountPence,
    status: booking.status,
    cancelledAt: booking.cancelledAt,
    refundedPence: booking.refundedPence,
    refundedAt: booking.refundedAt,
    refunded: alreadyRefunded(booking),
    owed: refundOwed(booking),
    workshopName: booking.workshop.name,
    workshopDate: booking.workshop.date,
    refundDays: booking.workshop.refundDays,
    refundDeadline: refundDeadline(
      booking.workshop.date,
      booking.workshop.refundDays,
    ),
    dayHasBeen: isPast(booking.workshop.date),
    insidePeriod: isRefundable(booking.workshop),
  };
}

/** "1 place" / "3 places" */
function places(n: number): string {
  return `${n} ${n === 1 ? "place" : "places"}`;
}

/**
 * The line under the offering — the one thing about this booking she has to
 * know before she touches anything.
 *
 * On a live booking that is its own refund period, measured against ITS OWN
 * workshop and never a site-wide rule. On a cancelled one it is what happened
 * to the money, and who did it.
 */
function StateLine({ booking }: { booking: BookingWithWorkshop }) {
  const { workshop } = booking;
  const deadline = refundDeadline(workshop.date, workshop.refundDays);
  const owed = refundOwed(booking);

  if (booking.status === "paid") {
    if (alreadyRefunded(booking)) {
      return (
        <span className={`${NOTE} text-pool-success`}>
          Refunded{" "}
          {booking.refundedAt ? `on ${formatInstant(booking.refundedAt)}` : ""}{" "}
          — the place is still held
        </span>
      );
    }
    if (workshop.refundDays === 0) {
      return <span className={NOTE}>This one cannot be refunded</span>;
    }
    if (isPast(workshop.date)) {
      return (
        <span className={NOTE}>Refund period {workshop.refundDays} days</span>
      );
    }
    if (!deadline) return null;
    if (isRefundable(workshop)) {
      // The deadline day itself still counts, so the day it falls on is worth
      // saying out loud rather than printing today's date back at her.
      const now = new Date();
      const lastDay =
        deadline.getUTCFullYear() === now.getUTCFullYear() &&
        deadline.getUTCMonth() === now.getUTCMonth() &&
        deadline.getUTCDate() === now.getUTCDate();
      return (
        <span className={NOTE}>
          Refund period {workshop.refundDays} days —{" "}
          {lastDay
            ? "today is the last day"
            : `closes ${formatDayShort(deadline)}`}
        </span>
      );
    }
    return (
      <span className={`${NOTE} text-pool-error`}>
        Refund period {workshop.refundDays} days — closed{" "}
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
    return (
      <span className={NOTE}>
        Cancelled{when} {by} — refunded
        {booking.refundedAt ? ` ${formatInstant(booking.refundedAt)}` : ""}
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

/** The money column: what is with her, and what has left. */
function Money({ booking }: { booking: BookingWithWorkshop }) {
  const back = booking.refundedPence ?? booking.amountPence;
  const owed = refundOwed(booking);

  if (alreadyRefunded(booking)) {
    return (
      <>
        <span className="block whitespace-nowrap fig font-mono text-[19px] font-semibold tabular-nums text-pool-success">
          {formatMoney(0)}
        </span>
        <span className={NOTE}>
          {formatMoney(back)} went back
          {booking.refundedAt ? ` on ${formatInstant(booking.refundedAt)}` : ""}
        </span>
      </>
    );
  }

  return (
    <>
      <span
        className={`block whitespace-nowrap fig font-mono text-[19px] font-semibold tabular-nums ${owed ? "text-pool-error" : "text-ink"}`}
      >
        {formatMoney(booking.amountPence)}
      </span>
      <span className={NOTE}>
        {owed ? "still with you" : `paid ${formatInstant(booking.paidAt)}`}
      </span>
    </>
  );
}

function Row({ booking }: { booking: BookingWithWorkshop }) {
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
        Workshop
      </td>
      <td className={CELL}>
        <span className="block font-display text-[21px] leading-tight text-ink">
          {booking.workshop.name}
        </span>
        <span className={NOTE}>
          {formatDayShort(booking.workshop.date)} &middot;{" "}
          {places(booking.places)}
          {booking.status === "paid" ? "" : ", released"}
        </span>
        <StateLine booking={booking} />
      </td>
      <td className={CELL}>
        <span
          className="block fig font-mono text-[17px] text-ink-soft"
          aria-hidden="true"
        >
          &ndash;
        </span>
        <span className="sr-only">
          No deposit. A workshop is paid in full when it is booked.
        </span>
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
          Paid<span className={CAPTION}>in full, when it was booked</span>
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
  bookings: BookingWithWorkshop[];
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
  // the top", which is a different sort on either side of today.
  const upcoming = all.filter((b) => !isPast(b.workshop.date));
  const archived = all
    .filter((b) => isPast(b.workshop.date))
    .sort(
      (a, b) =>
        b.workshop.date.getTime() - a.workshop.date.getTime() || b.id - a.id,
    );

  // Every total on this screen is NET: what she is actually holding, with
  // anything already sent back taken off. A gross figure would count a refunded
  // booking's money twice — once here and once on somebody's statement.
  const held = (b: BookingWithWorkshop) =>
    b.amountPence - (b.refundedPence ?? 0);

  const live = upcoming.filter((b) => b.status === "paid");
  const takenAhead = live.reduce((sum, b) => sum + held(b), 0);
  const refundableAhead = live
    .filter((b) => isRefundable(b.workshop) && !alreadyRefunded(b))
    .reduce((sum, b) => sum + b.amountPence, 0);
  const owedAhead = upcoming
    .filter((b) => refundOwed(b))
    .reduce((sum, b) => sum + b.amountPence, 0);
  const cancelledAhead = upcoming.length - live.length;

  const takenBefore = archived.reduce((sum, b) => sum + held(b), 0);
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
                One live booking is for a day that hasn&rsquo;t happened yet,
                and you are holding {formatMoney(takenAhead)} against it.
              </>
            ) : (
              <>
                {live.length} live bookings are for days that haven&rsquo;t
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

      <p className="mt-5 max-w-[72ch] text-[19px] leading-relaxed text-plate-soft">
        A booking sits in the first table until its day has been. The morning
        after, it moves itself down to the archive. There is nothing to file.
      </p>
      <p className="mt-3 max-w-[72ch] text-[19px] leading-relaxed text-plate-soft">
        Every workshop carries its own refund period, set when you make it. Each
        row is measured against its own, and says which.
      </p>
      <p className="mt-3 max-w-[72ch] text-[19px] leading-relaxed text-plate-soft">
        Cancel is the everyday one. It releases the place, and while the booking
        is still inside its refund period it asks whether to send the money back
        as well. Past that period it cancels without a refund and says so
        plainly. Refund can also be used on its own, later, if you change your
        mind. Delete stays out of reach until a booking has been cancelled — it
        takes the record away altogether, and it cannot be undone.
      </p>

      {/* Said once, quietly, because two of the seven columns are empty for
          every row and will be until there is something else to sell. */}
      <p className="mt-6 max-w-[72ch] fig font-mono text-[15px] leading-relaxed text-plate-soft">
        Type reads Workshop on every row because a workshop is the only thing
        that can be bought yet — sessions and courses are not built. Deposit is
        empty for the same reason: only a course takes one, and a workshop is
        paid in full when it is booked. Both columns stay, so that nothing has
        to move when they fill.
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
                : `${upcoming.length} ${upcoming.length === 1 ? "row" : "rows"} — ${live.length} live${cancelledAhead > 0 ? `, ${cancelledAhead} cancelled` : ""} · soonest first`}
              {owedAhead > 0 &&
                ` · ${formatMoney(owedAhead)} of the cancelled money has not gone back yet`}
            </p>
          </div>
          {takenAhead > 0 && (
            <p className="fig font-mono text-[24px] tabular-nums text-gold">
              {formatMoney(takenAhead)} paid
            </p>
          )}
        </div>

        {upcoming.length === 0 ? (
          <Empty
            eyebrow="Empty · still to come"
            eyebrowClass="text-action"
            title="Nothing is booked yet."
          >
            Your workshops are live on the site and nobody has booked one. The
            first booking appears here the minute someone pays, with the money
            and that workshop&rsquo;s refund date already worked out.
          </Empty>
        ) : (
          <Table
            id="upcoming-table"
            caption="Bookings for days that have not happened yet, soonest first. Columns: name, email, type of offering, offering and date with its own refund period, deposit for courses, money paid, and the cancel, refund and delete actions available for that booking's state."
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
