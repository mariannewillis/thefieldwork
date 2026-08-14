"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  cancelPlace,
  deletePlace,
  refundPlace,
  type ActionState,
} from "@/app/(admin)/admin/workshop-bookings/actions";
import {
  formatDayLong,
  formatDayShort,
  formatInstant,
  formatMoney,
} from "@/lib/format";

/**
 * Cancel · refund · delete, on one booking.
 *
 * THE STATE MACHINE IS THE COMPONENT. Three controls, and which of them can be
 * pressed is decided entirely by what is true of this booking now:
 *
 *   Cancel   while the place is still held AND the day is still to come.
 *            Inside the offering's own refund period it ASKS whether to send
 *            the money back; past it, it says plainly that nothing goes back
 *            and names what cancelling does achieve instead.
 *   Refund   whenever money has not already gone back. On a cancelled booking
 *            that is the goodwill decision she can make later; on a live one it
 *            means she has decided not to charge somebody who is still coming,
 *            and the place stays held.
 *   Delete   ONLY once the booking has been cancelled. Never on a live place,
 *            and therefore never on a workshop that has already run — a day
 *            that has been cannot be cancelled, so its record stays (D-18).
 *
 * A DISABLED CONTROL EXPLAINS ITSELF. None of the three is ever just greyed
 * out: each keeps its place, keeps its keyboard focus, and says why it cannot
 * be used when it is pressed. A control that goes quiet teaches her to stop
 * trusting the row.
 *
 * Nothing here decides anything. Every rule below is applied again on the
 * server against the booking as it is at that moment (see actions.ts) — this
 * is the drawing of the rules, not the keeping of them.
 */

export type LedgerRow = {
  id: number;
  reference: string;
  buyerName: string;
  places: number;
  /** PENCE she is holding — what a refund would actually send back. */
  heldPence: number;
  /** PENCE that ever arrived, refunds included. */
  paidPence: number;
  status: "paid" | "cancelledRefunded" | "cancelledUnrefunded";
  cancelledAt: Date | null;
  /** The most recent refund on any of this booking's payments. */
  refundedAt: Date | null;
  /** Nothing left to send back, whatever the status says. */
  refunded: boolean;
  /** Cancelled, and the money is still with her. */
  owed: boolean;
  /** Which of the two this is. It changes two sentences and no rules. */
  kind: "workshop" | "course";
  offeringName: string;
  /** The day, or the first day of a run. */
  offeringDate: Date;
  refundDays: number;
  refundDeadline: Date | null;
  /** The day — or the last date of the run — has been and gone. */
  dayHasBeen: boolean;
  /** Still inside this offering's own refund period, as of now. */
  insidePeriod: boolean;
};

const NOTHING: ActionState = { error: null, done: 0 };

const ICON = "h-[19px] w-[19px]";
const CONTROL =
  "t inline-flex h-11 w-11 shrink-0 items-center justify-center border";
const LIVE_CANCEL = `${CONTROL} border-action text-action hover:bg-action hover:text-pool`;
const LIVE_REFUND = `${CONTROL} border-pool-rule text-ink hover:bg-ink hover:text-pool`;
const LIVE_DELETE = `${CONTROL} border-pool-error text-pool-error hover:bg-pool-error hover:text-pool`;
const SPENT = `${CONTROL} border-dashed border-pool-rule text-ink-soft`;

const PRIMARY =
  "t min-h-[56px] bg-action px-9 py-4 text-[17px] font-semibold text-pool hover:bg-ink";
const OUTLINE =
  "t min-h-[52px] border border-ink bg-transparent px-7 py-3 text-[17px] font-medium text-ink hover:bg-ink hover:text-pool";
const DANGER_OUTLINE =
  "t min-h-[52px] border border-pool-error bg-transparent px-7 py-3 text-[17px] font-medium text-pool-error hover:bg-pool-error hover:text-pool";
const GHOST =
  "t min-h-[44px] py-2 text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink";
const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error";
const BODY = "mt-3 text-[17px] leading-relaxed text-ink-soft";
const WARNING =
  "mt-3 border-l-2 border-pool-error px-4 py-3 text-[17px] leading-relaxed text-ink";

function CancelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.6 8.6 6.8 6.8" />
    </svg>
  );
}

function RefundIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
      aria-hidden="true"
    >
      <path d="M4 10h11a4 4 0 0 1 0 8h-6" />
      <path d="m8 6-4 4 4 4" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 13h10l1-13" />
    </svg>
  );
}

/**
 * One modal, drawn as a panel rather than a card.
 *
 * A real `<dialog>`: it takes the focus, Escape closes it, and the page behind
 * it cannot be reached by tabbing. `confirm()` would do none of that and could
 * not say the amount in her own words.
 */
function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Only report a close that the BROWSER made — Escape, or the backdrop.
      // Closing one modal in order to open another (delete offering to refund
      // first) also fires this event, and taking that as "she dismissed it"
      // would shut the modal we were opening a moment after opening it.
      onClose={() => open && onClose()}
      onCancel={() => open && onClose()}
      className="modal pool on-pool text-ink"
    >
      {/* Rendered only while open so each opening starts from a clean form and
          a cleared error, rather than showing the answer to the last one. */}
      {open && <div className="px-7 py-7 sm:px-8">{children}</div>}
    </dialog>
  );
}

/** The line an action failed on. Never a toast — it belongs where it was asked for. */
function Failure({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="mt-4 text-[17px] leading-relaxed text-pool-error"
    >
      {error}
    </p>
  );
}

export default function BookingActions({ booking }: { booking: LedgerRow }) {
  const [open, setOpen] = useState<"cancel" | "refund" | "delete" | null>(null);
  /** Why a control that was pressed could not be used. Shown under the row. */
  const [refusal, setRefusal] = useState<string | null>(null);

  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelPlace,
    NOTHING,
  );
  const [refundState, refundAction, refunding] = useActionState(
    refundPlace,
    NOTHING,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deletePlace,
    NOTHING,
  );

  // Each modal closes itself when its own action came back having done the
  // thing. A failure leaves it open, holding the sentence that says why.
  useEffect(() => {
    if (cancelState.done) setOpen(null);
  }, [cancelState.done]);
  useEffect(() => {
    if (refundState.done) setOpen(null);
  }, [refundState.done]);
  useEffect(() => {
    if (deleteState.done) setOpen(null);
  }, [deleteState.done]);

  // What a refund would send back — never the price. On a course cancelled
  // between the deposit and the balance those are different figures, and
  // promising the price is promising money that never arrived.
  const money = formatMoney(booking.heldPence);
  const who = booking.buyerName;
  const day = formatDayShort(booking.offeringDate);
  // A workshop IS on a day; a course STARTS on one. One word, and getting it
  // wrong makes the modal read as though the run were a single evening.
  const isOn = booking.kind === "workshop" ? "is on" : "starts on";
  const thePlaces =
    booking.places === 1 ? "place" : `all ${booking.places} places`;
  const live = booking.status === "paid";

  // ── which controls are available, and what the unavailable ones say ────────

  // One sentence per unavailable control, used as its tooltip, as the label a
  // screen reader hears, and as the line that appears in the row when it is
  // pressed. One sentence rather than three so they cannot drift apart.
  const canCancel = live && !booking.dayHasBeen;
  const cancelWhyNot = !live
    ? `Cancel is spent — this booking was already cancelled${booking.cancelledAt ? ` on ${formatInstant(booking.cancelledAt)}` : ""}.`
    : `Cancel is spent — that ${booking.kind === "workshop" ? "day" : "run"} has already been, so there is no place left to release. You can still send the money back.`;

  const canRefund = !booking.refunded;
  const refundWhyNot = `Refund is spent — the money already went back${booking.refundedAt ? ` on ${formatInstant(booking.refundedAt)}` : ""}. There is nothing left to send.`;

  const canDelete = !live;
  const deleteWhyNot = booking.dayHasBeen
    ? `Delete stays out of reach — it is available once a booking is cancelled, and a ${booking.kind === "workshop" ? "day" : "run"} that has been cannot be cancelled, so this record stays.`
    : "Delete stays out of reach until this booking has been cancelled. It never acts on a place somebody is still holding.";

  /** A control that cannot be used says so out loud, in the row. */
  function refuse(sentence: string) {
    setRefusal(sentence);
  }

  function ask(which: "cancel" | "refund" | "delete") {
    setRefusal(null);
    setOpen(which);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canCancel ? (
          <button
            type="button"
            onClick={() => ask("cancel")}
            className={LIVE_CANCEL}
            title={
              booking.refunded
                ? "Cancel — the money has already gone back, so this only releases the place"
                : booking.insidePeriod
                  ? "Cancel — still inside this offering's refund period, so you will be asked whether to send the money back"
                  : "Cancel — past this offering's refund period, so the place is released and no money goes back"
            }
            aria-label={`Cancel ${who}'s ${thePlaces} on ${booking.offeringName}, ${day}`}
          >
            <CancelIcon />
          </button>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => refuse(cancelWhyNot)}
            className={SPENT}
            title={cancelWhyNot}
            aria-label={cancelWhyNot}
          >
            <CancelIcon />
          </button>
        )}

        {canRefund ? (
          <button
            type="button"
            onClick={() => ask("refund")}
            className={LIVE_REFUND}
            title="Refund — send the money back on its own"
            aria-label={`Refund ${money} to ${who} for ${booking.offeringName}, ${day}`}
          >
            <RefundIcon />
          </button>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => refuse(refundWhyNot)}
            className={SPENT}
            title={refundWhyNot}
            aria-label={refundWhyNot}
          >
            <RefundIcon />
          </button>
        )}

        {canDelete ? (
          <button
            type="button"
            onClick={() => ask("delete")}
            className={LIVE_DELETE}
            title="Delete — remove this record for good"
            aria-label={`Delete ${who}'s booking on ${booking.offeringName}, ${day}, from the records`}
          >
            <DeleteIcon />
          </button>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => refuse(deleteWhyNot)}
            className={SPENT}
            title={deleteWhyNot}
            aria-label={deleteWhyNot}
          >
            <DeleteIcon />
          </button>
        )}
      </div>

      {refusal && (
        <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
          {refusal}
        </p>
      )}

      {/* ── cancel ─────────────────────────────────────────────────────────
          Three shapes, because there are three true situations and one of them
          must not be dressed as another: the money can still go back, it
          cannot, or it has already gone. */}
      <Modal
        open={open === "cancel"}
        onClose={() => setOpen(null)}
        labelledBy={`cancel-title-${booking.id}`}
      >
        <p className={EYEBROW}>
          {booking.refunded
            ? "Cancel · the money has already gone back"
            : booking.insidePeriod
              ? "Cancel · inside the refund period"
              : "Cancel · past the refund period"}
        </p>

        {booking.refunded ? (
          <>
            <h2
              id={`cancel-title-${booking.id}`}
              className="mt-2 font-display text-[26px] leading-tight text-ink"
            >
              Release {who}&rsquo;s {thePlaces}?
            </h2>
            <p className={BODY}>
              You sent {formatMoney(booking.paidPence)} back
              {booking.refundedAt
                ? ` on ${formatInstant(booking.refundedAt)}`
                : ""}{" "}
              and they kept the place. Cancelling now takes the place back and
              puts it on sale again. No more money moves — there is none left to
              send.
            </p>
            <p className={BODY}>
              They are told the place has been cancelled, and told that the
              money is already back.
            </p>
          </>
        ) : booking.insidePeriod ? (
          <>
            <h2
              id={`cancel-title-${booking.id}`}
              className="mt-2 font-display text-[26px] leading-tight text-ink"
            >
              Cancel {who}&rsquo;s {thePlaces} &mdash; and send the {money}{" "}
              back?
            </h2>
            <p className={BODY}>
              {booking.offeringName} {isOn}{" "}
              {formatDayLong(booking.offeringDate)} and its refund period runs
              for {booking.refundDays} days, until{" "}
              {booking.refundDeadline
                ? formatDayLong(booking.refundDeadline)
                : "the day itself"}
              . You are inside it, so the money can go back if you want it to.
            </p>
            <p className={BODY}>
              Either way the {booking.places === 1 ? "place goes" : "places go"}{" "}
              back on sale straight away and they are told. If you refund,
              Stripe usually takes five to ten working days to show the {money}{" "}
              on their statement.
            </p>
          </>
        ) : (
          <>
            <h2
              id={`cancel-title-${booking.id}`}
              className="mt-2 font-display text-[26px] leading-tight text-ink"
            >
              Cancel {who}&rsquo;s {thePlaces} without returning the {money}?
            </h2>
            <p className={WARNING}>
              {booking.refundDays === 0 ? (
                <>
                  A place on {booking.offeringName} cannot be refunded once it
                  is taken. Nothing goes back to their card.
                </>
              ) : (
                <>
                  {booking.offeringName} has a refund period of{" "}
                  {booking.refundDays} days. It {isOn}{" "}
                  {formatDayLong(booking.offeringDate)}, so that period closed
                  on{" "}
                  {booking.refundDeadline
                    ? formatDayLong(booking.refundDeadline)
                    : "the day it was set"}
                  . Nothing goes back to their card.
                </>
              )}
            </p>
            <p className={BODY}>
              What cancelling does do: the{" "}
              {booking.places === 1 ? "place goes" : "places go"} back into the
              room and can be booked by somebody else. They are told what has
              happened, and told plainly that no money is coming back.
            </p>
            <p className={BODY}>
              If you would rather give it back anyway, close this and use refund
              on the row instead. That stays open to you whatever the period
              says.
            </p>
          </>
        )}

        <Failure error={cancelState.error} />

        <form action={cancelAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="id" value={booking.id} />

          {booking.insidePeriod && !booking.refunded ? (
            <>
              {/* The refunding one is the dominant path: it is the ending that
                  leaves nobody owed anything. */}
              <button
                type="submit"
                name="refund"
                value="yes"
                disabled={cancelling}
                className={`${PRIMARY} disabled:opacity-60`}
              >
                {cancelling ? "Working…" : `Cancel and refund ${money}`}
              </button>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <button
                  type="submit"
                  name="refund"
                  value="no"
                  disabled={cancelling}
                  className={`${OUTLINE} disabled:opacity-60`}
                >
                  Cancel and keep the {money} for now
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className={GHOST}
                >
                  Leave the booking as it is
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="submit"
                name="refund"
                value="no"
                disabled={cancelling}
                className={`${booking.refunded ? OUTLINE : DANGER_OUTLINE} disabled:opacity-60`}
              >
                {cancelling
                  ? "Working…"
                  : booking.refunded
                    ? `Cancel the ${thePlaces}`
                    : `Cancel the ${thePlaces} and return nothing`}
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className={GHOST}
              >
                Leave the booking as it is
              </button>
            </div>
          )}
        </form>

        {booking.insidePeriod && !booking.refunded && (
          <p className="mt-5 fig font-mono text-[15px] leading-relaxed text-ink-soft">
            Keeping it does not close the door &mdash; the refund control stays
            available on the row afterwards.
          </p>
        )}
      </Modal>

      {/* ── refund ─────────────────────────────────────────────────────────
          The amount, the card and the wait are all named before the button,
          and the button repeats the amount. */}
      <Modal
        open={open === "refund"}
        onClose={() => setOpen(null)}
        labelledBy={`refund-title-${booking.id}`}
      >
        <p className={EYEBROW}>Refund on its own</p>
        <h2
          id={`refund-title-${booking.id}`}
          className="mt-2 font-display text-[26px] leading-tight text-ink"
        >
          Put {money} back on {who}&rsquo;s card?
        </h2>

        {live ? (
          <>
            <p className={WARNING}>
              This booking is not cancelled, and refunding it does not cancel
              it.{" "}
              {booking.places === 1
                ? "Their place stays"
                : `All ${booking.places} of their places stay`}{" "}
              held, and they are still expected. That is exactly what their
              email says.
            </p>
            <p className={BODY}>
              Use this when you have decided not to charge somebody who is still
              coming. If you meant to take the place back as well, close this
              and use cancel on the row instead.
            </p>
          </>
        ) : (
          <>
            <p className={BODY}>
              {booking.places === 1 ? "Their place" : "Their places"} on{" "}
              {booking.offeringName} {booking.places === 1 ? "was" : "were"}{" "}
              cancelled
              {booking.cancelledAt
                ? ` on ${formatInstant(booking.cancelledAt)}`
                : ""}{" "}
              and the money stayed with you. Sending it back now is your
              decision, not the refund period&rsquo;s &mdash; that closed when
              the place was released.
            </p>
            <p className={BODY}>
              The {booking.places === 1 ? "place is" : "places are"} already
              back on sale, so nothing changes on the day. The booking stays in
              the records, marked refunded.
            </p>
          </>
        )}
        <p className={BODY}>
          Stripe usually takes five to ten working days to show the money on
          their statement.
        </p>

        <Failure error={refundState.error} />

        <form
          action={refundAction}
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          <input type="hidden" name="id" value={booking.id} />
          <button
            type="submit"
            disabled={refunding}
            className={`${PRIMARY} disabled:opacity-60`}
          >
            {refunding ? "Working…" : `Refund ${money}`}
          </button>
          <button type="button" onClick={() => setOpen(null)} className={GHOST}>
            Leave it as it is
          </button>
        </form>
      </Modal>

      {/* ── delete ─────────────────────────────────────────────────────────
          Only ever reachable on a booking that has already been cancelled. The
          dangerous case is cancelled-but-not-refunded: deleting there loses the
          record of money still owed to somebody, so the modal names that first
          and puts refunding above the destructive button. */}
      <Modal
        open={open === "delete"}
        onClose={() => setOpen(null)}
        labelledBy={`delete-title-${booking.id}`}
      >
        <p className={EYEBROW}>Delete &middot; a cancelled booking</p>
        <h2
          id={`delete-title-${booking.id}`}
          className="mt-2 font-display text-[26px] leading-tight text-ink"
        >
          Are you sure you want to delete {who}&rsquo;s booking?
        </h2>

        {booking.owed && (
          <p className={WARNING}>
            <strong className="font-semibold">
              This one was cancelled but never refunded.
            </strong>{" "}
            {money} of their money is still with you. Delete the booking and the
            record of where that {money} came from goes with it &mdash; there
            will be nothing left to refund from.
          </p>
        )}

        <p className={BODY}>
          What goes with it: their name and email, the payment reference Stripe
          gave it, the day they booked and the day it was cancelled. The{" "}
          {booking.places === 1 ? "place itself was" : "places themselves were"}{" "}
          released
          {booking.cancelledAt
            ? ` on ${formatInstant(booking.cancelledAt)}`
            : ""}{" "}
          and {booking.places === 1 ? "is" : "are"} not affected. This cannot be
          undone.
        </p>

        <Failure error={deleteState.error} />

        <div className="mt-6 flex flex-col gap-4">
          {booking.owed && (
            <button
              type="button"
              onClick={() => ask("refund")}
              className={PRIMARY}
            >
              Refund the {money} first
            </button>
          )}
          <form
            action={deleteAction}
            className="flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            <input type="hidden" name="id" value={booking.id} />
            <button
              type="submit"
              disabled={deleting}
              className={`${DANGER_OUTLINE} disabled:opacity-60`}
            >
              {deleting
                ? "Deleting…"
                : booking.owed
                  ? `Delete anyway and keep the ${money}`
                  : "Delete this booking"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className={GHOST}
            >
              Keep the booking
            </button>
          </form>
        </div>

        <p className="mt-5 fig font-mono text-[15px] leading-relaxed text-ink-soft">
          Reference {booking.reference}
        </p>
      </Modal>
    </>
  );
}
