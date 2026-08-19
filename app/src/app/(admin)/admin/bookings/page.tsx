import type { Metadata } from "next";
import Link from "next/link";
import Pager, { currentPage, pageSlice } from "@/components/admin/Pager";
import type { RequestRow } from "@/components/admin/RequestActions";
import RequestLine from "@/components/admin/RequestLine";
import { bookingReference } from "@/lib/bookings";
import {
  formatDuration,
  formatInstant,
  formatMoment,
  formatMoney,
  formatSlot,
} from "@/lib/format";
import {
  approvalState,
  factsOf,
  listServiceRequests,
  needsHer,
  type ApprovalState,
  type ServiceRequestWithService,
} from "@/lib/service-requests";
import { placeInOneLine, servicePlace } from "@/lib/services";

/**
 * Requests — somebody asking for an hour, and what she answered.
 *
 * NOT the ledger. Places and sessions that have been paid for live at
 * /admin/workshop-bookings (D-18): money that has already moved is a different
 * job from a request that has not been agreed to, and putting the two in one
 * table would mean an approve/decline pair sitting in the same row as a refund.
 *
 * WHAT THIS SCREEN DOES NOW IS DECIDE (D-25). D-24 deliberately shipped it with
 * no controls at all, because approve → payment link → an unpaid link releasing
 * the slot → she is told needed things that did not exist, and a button that
 * only changed a column would have put a record of a decision in the portal
 * while the person decided about heard nothing. All of it exists now: approving
 * records what she agreed, mints a /pay link and emails it; declining closes the
 * request with a line she writes; and an approval nobody pays for releases
 * itself.
 *
 * AND THIS IS WHERE A LAPSED APPROVAL SURFACES, for exactly the reason the
 * ledger is where a lapsed course place surfaces. Release is lazy — `payBy` is
 * behind us and there is no Booking, and that is the whole of it, true the
 * moment it becomes true with nothing running. Nothing can therefore TELL her
 * it happened, so the screen says so: the headline counts them, and the row
 * says it in red with the moment it ran out. If a message on the morning is
 * wanted as well, that needs something scheduled, and that is a decision about
 * hosting rather than about this screen.
 *
 * NEWEST FIRST, and one table. A request is a message waiting on her rather
 * than a date in the diary, so there is no "still to come" and no archive to
 * split it into.
 */

export const metadata: Metadata = {
  title: "Requests — The Field Work",
};

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const HEAD =
  "pb-3 pr-5 text-left align-bottom fig font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-ink-soft";
const CAPTION = "mt-0.5 block normal-case tracking-normal";
const CELL = "py-5 pr-5 align-top";
const NOTE = "mt-1 block fig font-mono text-[15px] tabular-nums text-ink-soft";

/**
 * Where this one stands, in the line she reads before she touches anything.
 *
 * A lapsed approval is said FIRST and said in red, because it is the only state
 * on this screen that changed without anybody doing anything — and because it is
 * the one that is back on her desk.
 */
function StateLine({
  request,
  state,
}: {
  request: ServiceRequestWithService;
  state: ApprovalState;
}) {
  if (state === "lapsed") {
    return (
      <span className={`${NOTE} text-pool-error`}>
        Not paid by {request.payBy ? formatMoment(request.payBy) : "the date"} —
        this has run out and the time is yours again. Nothing was charged.
      </span>
    );
  }

  if (state === "awaitingPayment") {
    return (
      <span className={NOTE}>
        {formatMoney(request.approvedPence ?? 0)} to pay by{" "}
        {request.payBy ? formatMoment(request.payBy) : "—"} — it runs out if it
        is not paid
      </span>
    );
  }

  if (state === "paid") {
    const booking = request.booking;
    return (
      <span className={`${NOTE} text-pool-success`}>
        Paid{booking ? ` on ${formatInstant(booking.paidAt)}` : ""}
        {booking ? ` · ${bookingReference(booking.id)}` : ""} — it is on the
        bookings page
      </span>
    );
  }

  if (state === "declined") {
    return (
      <span className={NOTE}>
        Declined
        {request.declinedAt ? ` on ${formatInstant(request.declinedAt)}` : ""} —
        they were told
      </span>
    );
  }

  return <span className={NOTE}>Waiting on you</span>;
}

/**
 * ONE REQUEST, TURNED INTO A LINE AND A SHEET.
 *
 * Everything here is a conversion the SERVER has to do: an instant into her
 * timezone, pence into pounds, a state into a sentence. The browser's clock is
 * not hers and never was, so none of it can be left to the component that
 * draws it — `RequestLine` receives words and renders them.
 */
function lineFor(request: ServiceRequestWithService, showAnswer: boolean) {
  const service = request.service;
  const state = approvalState(factsOf(request));

  const wanted =
    request.slotStart && request.slotEnd
      ? formatSlot(request.slotStart, request.slotEnd)
      : (request.preferredTime ?? "They did not say.");

  const row: RequestRow = {
    id: request.id,
    name: request.name,
    serviceName: service.name,
    listPence: service.priceGBP,
    wanted,
    chosen: request.slotStart !== null,
    state,
    approvedPence: request.approvedPence,
    agreedTime: request.agreedTime,
    payBy: request.payBy,
  };

  // WHERE IT STANDS, in the words the line prints and the sheet repeats. A
  // lapsed approval is the only state on this screen that changed without
  // anybody doing anything, so it is the only one drawn in red.
  const standing =
    state === "lapsed"
      ? `Ran out unpaid${request.payBy ? ` on ${formatMoment(request.payBy)}` : ""} — the time is yours again`
      : state === "awaitingPayment"
        ? `${formatMoney(request.approvedPence ?? 0)} to pay by ${request.payBy ? formatMoment(request.payBy) : "—"}`
        : state === "paid"
          ? `Paid${request.booking ? ` · ${bookingReference(request.booking.id)}` : ""}`
          : state === "declined"
            ? `Declined${request.declinedAt ? ` on ${formatInstant(request.declinedAt)}` : ""}`
            : "Waiting on you";

  // THE SHEET SAYS IT IN FULL. The line has to fit a column, so it keeps the
  // fact; the sheet keeps the reassurance with it — "nothing was charged" is
  // the thing she most wants to be sure of about an approval that ran out, and
  // it is too long to sit in a table cell.
  const standingLong =
    state === "lapsed"
      ? `${standing}. Nothing was charged.`
      : state === "paid" && request.booking
        ? `${standing} — it is on the bookings page`
        : state === "declined"
          ? `${standing} — they were told`
          : standing;

  // The archive's fourth column is the answer rather than the standing — it is
  // the one thing that table exists to show.
  const answeredCell = showAnswer
    ? state === "declined"
      ? `Declined${request.declinedAt ? ` ${formatInstant(request.declinedAt)}` : ""}`
      : state === "paid"
        ? `Paid for${request.approvedPence !== null ? ` · ${formatMoney(request.approvedPence)}` : ""}`
        : `Approved${request.approvedPence !== null ? ` · ${formatMoney(request.approvedPence)}` : ""}`
    : undefined;

  return (
    <RequestLine
      key={request.id}
      row={row}
      answeredCell={answeredCell}
      detail={{
        email: request.email,
        phone: request.phone,
        askedAt: formatInstant(request.createdAt),
        serviceHref: `/admin/offerings/services/${service.slug}`,
        serviceMeta: `${formatDuration(service.durationMinutes)} · ${formatMoney(service.priceGBP)} · ${placeInOneLine(servicePlace(service))}`,
        message: request.message,
        declineNote: request.declineNote,
        standing,
        standingLong,
        // A slot is only still out of her diary while the request is live.
        holding: state !== "declined" && state !== "lapsed",
        listPrice: formatMoney(service.priceGBP),
        approved:
          request.approvedPence !== null
            ? `${formatMoney(request.approvedPence)}${
                request.approvedPence !== service.priceGBP
                  ? ` · the page says ${formatMoney(service.priceGBP)}`
                  : ""
              }`
            : null,
        answeredOn:
          state === "declined" && request.declinedAt
            ? formatInstant(request.declinedAt)
            : request.approvedAt
              ? formatInstant(request.approvedAt)
              : null,
        payByLine:
          state === "awaitingPayment" && request.payBy
            ? `Works until ${formatMoment(request.payBy)}`
            : null,
      }}
    />
  );
}

/** One of the two tabs, drawn as a link so the split survives a reload. */
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
  searchParams: Promise<{ show?: string; page?: string }>;
}) {
  const { show, page: pageParam } = await searchParams;
  const requests = await listServiceRequests();
  const now = new Date();
  const states = new Map(
    requests.map((request) => [
      request.id,
      approvalState(factsOf(request), now),
    ]),
  );

  const waiting = requests.filter((r) => states.get(r.id) === "pending");
  const lapsed = requests.filter((r) => states.get(r.id) === "lapsed");
  const awaiting = requests.filter(
    (r) => states.get(r.id) === "awaitingPayment",
  );

  // ANSWERED OR NOT, and nothing else decides which table a request is in. A
  // lapsed approval is back on her desk by arithmetic (D-25), so it leaves the
  // archive on its own the moment it runs out — which is the whole reason this
  // is derived rather than a column set when she presses approve.
  const onHerDesk = requests.filter((r) => needsHer(states.get(r.id)!));
  const archived = requests.filter((r) => !needsHer(states.get(r.id)!));

  // The archive is opt-in: she comes to this screen to answer things, so the
  // things to answer are what it opens on.
  const showingArchive = show === "archived";
  const rows = showingArchive ? archived : onHerDesk;

  // TWELVE TO A PAGE (operator, 2026-08-19). The page number is read off the
  // query and clamped to one that exists, so `?page=99` on a two-page queue
  // lands on the last page rather than on an empty table.
  const page = currentPage(pageParam, rows.length);
  const shown = pageSlice(rows, page);
  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    if (showingArchive) params.set("show", "archived");
    if (next > 1) params.set("page", String(next));
    const query = params.toString();
    return `/admin/bookings${query ? `?${query}` : ""}`;
  };

  return (
    <section className="pt-8" aria-labelledby="requests-h">
      <p className={EYEBROW}>Requests</p>

      {/* The one question this screen answers, in the figures that answer it.
          Nothing here is a label: it is a sentence made of what is true. */}
      <h1
        id="requests-h"
        className="mt-3 max-w-[26ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:max-w-[34ch] sm:text-[40px]"
      >
        {waiting.length === 0 ? (
          <>Nobody is waiting on an answer.</>
        ) : waiting.length === 1 ? (
          <>One person has asked for a session and is waiting to hear back.</>
        ) : (
          <>
            {waiting.length} people have asked for a session and are waiting to
            hear back.
          </>
        )}
        {/* SAID IN THE HEADLINE, because nothing else can tell her. An approval
            runs out by the clock and no message is sent when it does — this is
            the moment she finds out, so it goes above everything. */}
        {lapsed.length > 0 && (
          <>
            <br />
            <span className="text-gold">
              {lapsed.length === 1
                ? "One approval ran out unpaid and is back with you."
                : `${lapsed.length} approvals ran out unpaid and are back with you.`}
            </span>
          </>
        )}
      </h1>

      <p className="mt-6 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
        Approving sends them a link to pay and gives them 48 hours to use it.
        Declining closes the request with a line you write. Nothing is charged
        until they pay, and nothing you do here moves money.
        {/* SAID HERE BECAUSE IT IS NO LONGER IN FRONT OF HER. An approved
            request is under Answered now, so the one fact about it that is
            still live — somebody is holding a working link — has to be said on
            the tab she is actually looking at. */}
        {awaiting.length > 0 && (
          <>
            {" "}
            {awaiting.length === 1
              ? "One person has a link and has not used it yet"
              : `${awaiting.length} people have links they have not used yet`}
            , under{" "}
            <Link
              href="/admin/bookings?show=archived"
              className="text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
            >
              Answered
            </Link>
            .
          </>
        )}
      </p>

      {/* TWO TABS, and the split is what she has answered rather than a column
          anybody sets. Links rather than buttons: the choice survives a reload,
          it can be bookmarked, and this screen needs no client state to hold
          it. */}
      <nav
        aria-label="Which requests"
        className="mt-9 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-plate-rule/40"
      >
        <Tab
          href="/admin/bookings"
          label="Waiting on you"
          count={onHerDesk.length}
          current={!showingArchive}
        />
        <Tab
          href="/admin/bookings?show=archived"
          label="Answered"
          count={archived.length}
          current={showingArchive}
        />
      </nav>

      {rows.length > 0 ? (
        <div className="pool on-pool mt-7 px-6 py-2 sm:px-8">
          <div className="overflow-x-auto">
            {showingArchive ? (
              <table className="w-full min-w-[820px] border-collapse text-left">
                <caption className="sr-only">
                  Requests you have answered, newest first
                </caption>
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th scope="col" className={HEAD}>
                      Who
                      <span className={CAPTION}>and when they asked</span>
                    </th>
                    <th scope="col" className={HEAD}>
                      Session
                    </th>
                    <th scope="col" className={HEAD}>
                      When
                    </th>
                    <th scope="col" className={HEAD}>
                      What you answered
                    </th>
                    <th scope="col" className={`${HEAD} pr-0`}>
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>{shown.map((request) => lineFor(request, true))}</tbody>
              </table>
            ) : (
              <table className="w-full min-w-[820px] border-collapse text-left">
                <caption className="sr-only">
                  Session requests waiting on you, newest first
                </caption>
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th scope="col" className={HEAD}>
                      Who
                      <span className={CAPTION}>and when they asked</span>
                    </th>
                    <th scope="col" className={HEAD}>
                      Session
                    </th>
                    <th scope="col" className={HEAD}>
                      When
                    </th>
                    <th scope="col" className={HEAD}>
                      Where it stands
                    </th>
                    <th scope="col" className={`${HEAD} pr-0`}>
                      Your answer
                      <span className={CAPTION}>approve &middot; decline</span>
                    </th>
                  </tr>
                </thead>
                <tbody>{shown.map((request) => lineFor(request, false))}</tbody>
              </table>
            )}
          </div>
          <Pager
            page={page}
            total={rows.length}
            href={pageHref}
            label="requests"
          />
        </div>
      ) : (
        /* Drawn deliberately, and worded for WHICH emptiness it is. An empty
           table with headers reads as something that failed to load, and
           "nobody has ever asked" is a different fact from "you have answered
           everybody". */
        <div className="pool on-pool mt-7 max-w-[62ch] px-7 py-7">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
            {requests.length === 0
              ? "Nothing yet"
              : showingArchive
                ? "Nothing answered"
                : "All clear"}
          </p>
          <p className="mt-2 font-display text-[26px] leading-tight text-ink">
            {requests.length === 0
              ? "No one has asked for a session yet."
              : showingArchive
                ? "You have not answered anything yet."
                : "Nothing is waiting on you."}
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
            {requests.length === 0 ? (
              <>
                Requests arrive from the form at the foot of each
                session&rsquo;s page. They land here and you get an email at the
                same time, so this screen is somewhere to answer from rather
                than somewhere to wait.
              </>
            ) : showingArchive ? (
              <>
                A request moves here once you have approved or declined it. If
                an approval runs out unpaid it goes back to Waiting on you,
                because it needs you again.
              </>
            ) : (
              <>
                Everything that has come in has been answered. What you said is
                under Answered, and anything paid for is in Bookings.
              </>
            )}
          </p>
        </div>
      )}

      <p className="mt-8 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        Once somebody has paid, the session is in{" "}
        <Link
          href="/admin/workshop-bookings"
          className="text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
        >
          Bookings
        </Link>
        , with cancelling and refunding done from the row itself.
      </p>
    </section>
  );
}
