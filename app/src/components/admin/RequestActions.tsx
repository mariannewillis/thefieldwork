"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  approveSession,
  declineSession,
  type RequestActionState,
} from "@/app/(admin)/admin/bookings/actions";
import { formatMoment, formatMoney } from "@/lib/format";

/**
 * Approve · decline, on one request.
 *
 * THE STATE OF THE ROW DECIDES WHAT IS OFFERED, and the five states are the
 * five true situations rather than a status column:
 *
 *   pending          approve and decline, both live.
 *   awaitingPayment  neither. She has answered; the link is with them and the
 *                    deadline is running. Approving again here would be a
 *                    second link for one session, at possibly a second figure.
 *   lapsed           approve AGAIN — a new figure, a new time, a new link — and
 *                    decline, because saying so plainly is better than leaving
 *                    it to have run out silently.
 *   paid             neither. It is a booking now, and cancelling or refunding
 *                    it is the bookings page's job, where the money is.
 *   declined         neither. She said no and they were told.
 *
 * A DISABLED CONTROL EXPLAINS ITSELF, exactly as on the bookings page: nothing
 * is greyed into silence, each keeps its focus and says why when it is pressed.
 *
 * Nothing here decides anything. Every rule is applied again on the server
 * against the row as it is at that moment, under a row lock — so a page left
 * open while she approved from her phone cannot approve a second time.
 */

export type RequestRow = {
  id: number;
  name: string;
  serviceName: string;
  /** What the service's own page says a session costs — the default she edits. */
  listPence: number;
  /**
   * WHEN THEY WANT IT, already turned into one line by the server — the slot
   * they chose, or their own sentence when there was nothing to choose from
   * (D-26). It is the starting point for hers, so the cheapest thing she can do
   * is agree with what is already true.
   *
   * Written on the server rather than assembled here, because turning an
   * instant into "Thursday 3 September, 10:00–11:30" is a timezone conversion
   * and the browser is the one machine in this system whose clock is not hers.
   */
  wanted: string;
  /** True when that line came from a real slot rather than from a sentence. */
  chosen: boolean;
  state: "pending" | "awaitingPayment" | "lapsed" | "paid" | "declined";
  /** PENCE she approved. Null while pending. */
  approvedPence: number | null;
  agreedTime: string | null;
  payBy: Date | null;
};

const NOTHING: RequestActionState = { error: null, done: 0 };

const PRIMARY =
  "t min-h-[52px] bg-action px-8 py-3 text-[17px] font-semibold text-pool hover:bg-ink";
const OUTLINE =
  "t min-h-[48px] border border-ink bg-transparent px-6 py-2 text-[17px] font-medium text-ink hover:bg-ink hover:text-pool";
const SPENT =
  "t min-h-[48px] border border-dashed border-pool-rule bg-transparent px-6 py-2 text-[17px] font-medium text-ink-soft";
const GHOST =
  "t min-h-[44px] py-2 text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink";
const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error";
const BODY = "mt-3 text-[17px] leading-relaxed text-ink-soft";
const LABEL =
  "block fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
const FIELD =
  "mt-2 w-full border border-pool-rule bg-transparent px-4 py-3 text-[19px] text-ink focus:border-ink focus:outline-none";

/** A real `<dialog>`: it takes the focus, Escape closes it, the page behind is unreachable. */
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
      onClose={() => open && onClose()}
      onCancel={() => open && onClose()}
      className="modal pool on-pool text-ink"
    >
      {/* Rendered only while open, so each opening starts from a clean form and
          a cleared error rather than the answer to the last one. */}
      {open && <div className="px-7 py-7 sm:px-8">{children}</div>}
    </dialog>
  );
}

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

/** "70" / "82.50" — pounds, as she would write them into the field. */
function poundsValue(pence: number): string {
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

export default function RequestActions({ request }: { request: RequestRow }) {
  const [open, setOpen] = useState<"approve" | "decline" | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const [approveState, approveAction, approving] = useActionState(
    approveSession,
    NOTHING,
  );
  const [declineState, declineAction, declining] = useActionState(
    declineSession,
    NOTHING,
  );

  useEffect(() => {
    if (approveState.done) setOpen(null);
  }, [approveState.done]);
  useEffect(() => {
    if (declineState.done) setOpen(null);
  }, [declineState.done]);

  const { state } = request;
  const canApprove = state === "pending" || state === "lapsed";
  const canDecline = state === "pending" || state === "lapsed";
  const again = state === "lapsed";

  const approveWhyNot =
    state === "awaitingPayment"
      ? `Already approved — the link to pay ${request.approvedPence ? formatMoney(request.approvedPence) : "this"} is with them${request.payBy ? `, until ${formatMoment(request.payBy)}` : ""}. Approving again would put a second link in a second email.`
      : state === "paid"
        ? "This one is paid for. It is on the bookings page now, where cancelling and refunding are."
        : "You declined this one, and they were told. Approving it now would send a payment link for a session they were told was not happening — write to them instead.";

  const declineWhyNot =
    state === "awaitingPayment"
      ? "You have approved this one and they are paying for it. If you need to undo that, let it run out — then decline is offered again."
      : state === "paid"
        ? "This one is paid for. Declining it would leave their money with you and tell them nothing about it — cancel it on the bookings page instead, where the refund is part of the same decision."
        : "You have already declined this one, and they were told.";

  function ask(which: "approve" | "decline") {
    setRefusal(null);
    setOpen(which);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {canApprove ? (
          <button
            type="button"
            onClick={() => ask("approve")}
            className={PRIMARY}
            aria-label={
              again
                ? `Approve ${request.name}'s request again — the last approval ran out unpaid`
                : `Approve ${request.name}'s request for ${request.serviceName}`
            }
          >
            {again ? "Approve again" : "Approve"}
          </button>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => setRefusal(approveWhyNot)}
            className={SPENT}
            title={approveWhyNot}
            aria-label={approveWhyNot}
          >
            Approve
          </button>
        )}

        {canDecline ? (
          <button
            type="button"
            onClick={() => ask("decline")}
            className={OUTLINE}
            aria-label={`Decline ${request.name}'s request for ${request.serviceName}`}
          >
            Decline
          </button>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => setRefusal(declineWhyNot)}
            className={SPENT}
            title={declineWhyNot}
            aria-label={declineWhyNot}
          >
            Decline
          </button>
        )}
      </div>

      {refusal && (
        <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
          {refusal}
        </p>
      )}

      {/* ── approve ────────────────────────────────────────────────────────
          The two things she is deciding are the only two fields: what it
          costs and when it is. Both are pre-filled — the price from the
          service, the time from THEIR words — so the cheapest action is to
          accept what is already true, and changing either is one edit. */}
      <Modal
        open={open === "approve"}
        onClose={() => setOpen(null)}
        labelledBy={`approve-title-${request.id}`}
      >
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          {again ? "Approve again · the last one ran out" : "Approve"}
        </p>
        <h2
          id={`approve-title-${request.id}`}
          className="mt-2 font-display text-[26px] leading-tight text-ink"
        >
          Say yes to {request.name}?
        </h2>
        <p className={BODY}>
          {request.serviceName}. They will be emailed a link to pay, and it
          works for 48 hours. If it is not paid by then the time comes back to
          you and the link stops working &mdash; nothing is charged, and this
          row will say so.
        </p>

        <form action={approveAction} className="mt-6">
          <input type="hidden" name="id" value={request.id} />

          <label className="block">
            <span className={LABEL}>What it costs</span>
            <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
              In pounds. {formatMoney(request.listPence)} is what{" "}
              {request.serviceName} says on its page &mdash; change it if this
              one is different, and what you put here is what they are asked
              for.
            </span>
            <input
              type="text"
              name="amount"
              inputMode="decimal"
              defaultValue={poundsValue(
                request.approvedPence ?? request.listPence,
              )}
              className={FIELD}
              required
            />
          </label>

          <label className="mt-6 block">
            <span className={LABEL}>When it will happen</span>
            <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
              In your words, and this is what their email will say.{" "}
              {request.chosen
                ? "It is filled in with the time they chose, which is held for them — changing it here changes only what the email says, not what is out of your diary."
                : `Theirs was: “${request.wanted}”`}
            </span>
            <textarea
              name="agreedTime"
              rows={2}
              defaultValue={request.agreedTime ?? request.wanted}
              className={FIELD}
              required
            />
          </label>

          <Failure error={approveState.error} />

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="submit"
              disabled={approving}
              className={`${PRIMARY} disabled:opacity-60`}
            >
              {approving ? "Sending…" : "Approve and send the link"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className={GHOST}
            >
              Leave it as it is
            </button>
          </div>
        </form>
      </Modal>

      {/* ── decline ────────────────────────────────────────────────────────
          One field, and it is required. What she writes IS the message. */}
      <Modal
        open={open === "decline"}
        onClose={() => setOpen(null)}
        labelledBy={`decline-title-${request.id}`}
      >
        <p className={EYEBROW}>Decline</p>
        <h2
          id={`decline-title-${request.id}`}
          className="mt-2 font-display text-[26px] leading-tight text-ink"
        >
          Write back to {request.name}?
        </h2>
        <p className={BODY}>
          This closes the request and sends them what you write below. Nothing
          has been charged and nothing will be.
        </p>

        <form action={declineAction} className="mt-6">
          <input type="hidden" name="id" value={request.id} />

          <label className="block">
            <span className={LABEL}>What to say</span>
            <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
              A line or two, in your own words. They get this and nothing else
              &mdash; there is no template around it.
            </span>
            <textarea
              name="note"
              rows={4}
              placeholder="I am not taking anyone new until the autumn, I am afraid — do write again in September."
              className={FIELD}
              required
            />
          </label>

          <Failure error={declineState.error} />

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="submit"
              disabled={declining}
              className={`${OUTLINE} disabled:opacity-60`}
            >
              {declining ? "Sending…" : "Send this and close the request"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className={GHOST}
            >
              Leave it as it is
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
