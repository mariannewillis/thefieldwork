"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  removeSubscriber,
  resendConfirmation,
  type SubscriberState,
} from "@/app/(admin)/admin/subscribers/actions";

/**
 * What she can do to one row: send the confirmation again, or take them off.
 *
 * THE REMOVAL IS GUARDED AND THE RESEND IS NOT, which is the portal's rule
 * applied rather than a judgement about these two buttons: a guard belongs in
 * front of anything that cannot be undone by doing the same thing again.
 * Sending a confirmation twice is sending a confirmation twice. Removing
 * somebody cannot be undone from this screen at all — they would have to
 * subscribe again themselves, which is the whole point of the consent record
 * and is exactly why she cannot put them back.
 */
/** Nothing done yet. Here because a `"use server"` module exports only async
 *  functions — a constant beside the actions is a build error. */
const NOTHING: SubscriberState = { error: null, done: 0 };

export default function SubscriberActions({
  id,
  who,
  pending,
}: {
  id: number;
  /** Their name if they gave one, otherwise their address. For the modal. */
  who: string;
  /** True while they have asked and not confirmed — the resend is for them. */
  pending: boolean;
}) {
  const [removeState, removeAction, removing] = useActionState(
    removeSubscriber,
    NOTHING,
  );
  const [resendState, resendAction, resending] = useActionState(
    resendConfirmation,
    NOTHING,
  );

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The row disappears on a good removal, so nothing here has to close itself
  // — but a removal that FAILED must not leave the modal open over an error
  // the operator cannot see behind it.
  useEffect(() => {
    if (removeState.error) setOpen(false);
  }, [removeState.error]);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {pending && (
        <form action={resendAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={resending}
            className="t min-h-[44px] text-[15px] font-medium text-ink underline decoration-pool-rule underline-offset-4 hover:text-action disabled:opacity-60"
          >
            {resending ? "Sending…" : "Send the confirmation again"}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="t min-h-[44px] text-[15px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
      >
        Remove
      </button>

      {(removeState.error || resendState.error) && (
        <p role="alert" className="basis-full text-[15px] text-pool-error">
          {removeState.error ?? resendState.error}
        </p>
      )}
      {resendState.done > 0 && !resendState.error && (
        <p className="basis-full text-[15px] text-ink-soft">
          Sent again. It is the same link as before, not a new one.
        </p>
      )}

      <dialog
        ref={ref}
        aria-labelledby={`remove-h-${id}`}
        onClose={() => open && setOpen(false)}
        onCancel={() => open && setOpen(false)}
        className="modal pool on-pool text-ink"
      >
        {open && (
          <div className="px-7 py-7 sm:px-8">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error">
              Remove this subscriber
            </p>
            <h2
              id={`remove-h-${id}`}
              className="mt-3 font-display text-[28px] leading-tight text-ink"
            >
              Stop sending {who} the letter?
            </h2>
            <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
              They will not receive another one. This does not touch their
              bookings or anything they have paid for &mdash; it only takes them
              off this list. It cannot be undone from here: they would have to
              subscribe again themselves, which is what makes the list evidence
              of who asked for it.
            </p>
            <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
              The record of every letter they have already been sent stays, with
              the address it went to.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <form action={removeAction}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  disabled={removing}
                  className="t min-h-[52px] border border-pool-error bg-transparent px-7 py-3 text-[17px] font-medium text-pool-error hover:bg-pool-error hover:text-pool disabled:opacity-60"
                >
                  {removing ? "Removing…" : "Remove them"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t min-h-[44px] py-2 text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
              >
                Keep them on the list
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
