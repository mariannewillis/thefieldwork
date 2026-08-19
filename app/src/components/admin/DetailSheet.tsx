"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * EVERYTHING ABOUT ONE ROW, once she has asked for it.
 *
 * The two ledgers used to print every fact on every row — the message somebody
 * typed, the line she wrote back, the refund period, the deposit, the phone
 * number — which made a table you read rather than one you scan. A queue is for
 * finding the one that needs you; the rest is what you want once you have found
 * it (operator, 2026-08-19).
 *
 * A REAL `<dialog>`, like every other modal in this portal: it takes the focus,
 * Escape closes it, and the page behind is genuinely unreachable rather than
 * merely covered. `showModal` is called from an effect rather than the element
 * being rendered open, because the two get out of step the moment React
 * re-renders for another reason.
 *
 * PORTALLED INTO `document.body`, which is not a stacking-context nicety: this
 * is opened FROM A TABLE ROW, and a `<dialog>` is not allowed inside `<tbody>`.
 * The browser hoists it out on parse, React finds the DOM it did not build, and
 * the whole page fails to hydrate — which on this screen means every Approve
 * and Decline on it goes dead. It is the same lesson `GalleryPicker` records
 * from the newsletter editor (D-30), reached from a different direction.
 *
 * `mounted` guards the portal because `document` does not exist on the server;
 * the sheet is closed on first paint either way, so nothing is lost by it
 * arriving one tick later.
 *
 * THE CONTROLS COME IN AS CHILDREN. This component knows nothing about
 * approving, declining, cancelling or refunding — it is the frame, and the
 * screen that opened it passes its own actions in. That is what lets Requests
 * and Bookings share it without either of them learning the other's rules.
 */
export default function DetailSheet({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  facts,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  /** One line under the title — what this row is, said plainly. */
  subtitle?: string;
  /**
   * The facts, in the order she would ask for them. A null value is DROPPED
   * rather than drawn empty: a labelled blank is a question the sheet asks and
   * does not answer.
   */
  facts: { label: string; value: React.ReactNode | null }[];
  /** The row's own controls, so she can act without going back to the table. */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const shown = facts.filter((fact) => fact.value !== null);
  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      onClose={() => open && onClose()}
      onCancel={() => open && onClose()}
      className="modal pool on-pool text-ink"
    >
      {/* Rendered only while open, so each opening starts from the row as it is
          now rather than from the row it was when the table was drawn. */}
      {open && (
        <div className="px-7 py-7 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
              {eyebrow}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="t min-h-[44px] text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
            >
              Close
            </button>
          </div>

          <h2
            id="sheet-title"
            className="mt-2 font-display text-[28px] leading-tight text-ink"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[17px] leading-relaxed text-ink-soft">
              {subtitle}
            </p>
          )}

          <dl className="mt-6 flex flex-col">
            {shown.map((fact) => (
              <div
                key={fact.label}
                className="grid gap-x-6 border-t border-pool-rule/50 py-3 sm:grid-cols-[13rem_1fr]"
              >
                <dt className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-[17px] leading-relaxed text-ink sm:mt-0">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          {children && (
            <div className="mt-7 border-t border-pool-rule pt-6">
              {children}
            </div>
          )}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
