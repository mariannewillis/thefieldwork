"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteDraft } from "@/app/(admin)/admin/newsletters/actions";

/**
 * Throwing a draft away, behind a modal.
 *
 * A MODAL AND NOT A BARE BUTTON, unlike the calendar's "give it back", because
 * what this destroys is an evening's writing and there is no way to get it
 * back. The rule this portal follows is that a guard belongs in front of
 * anything that cannot be undone by doing the same thing again.
 *
 * It only ever appears on a draft. There is no control anywhere in this portal
 * that deletes a letter which has been sent.
 */
export default function DeleteDraft({
  id,
  subject,
}: {
  id: number;
  subject: string;
}) {
  const [state, action, pending] = useActionState(deleteDraft, {
    error: null as string | null,
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="t min-h-[44px] text-[17px] font-medium text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text"
      >
        Throw this draft away
      </button>

      {state.error && (
        <p
          role="alert"
          className="mt-3 max-w-[58ch] text-[17px] leading-relaxed text-pool-error"
        >
          {state.error}
        </p>
      )}

      <dialog
        ref={ref}
        aria-labelledby="bin-h"
        onClose={() => open && setOpen(false)}
        onCancel={() => open && setOpen(false)}
        className="modal pool on-pool text-ink"
      >
        {open && (
          <div className="px-7 py-7 sm:px-8">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error">
              Throw this draft away
            </p>
            <h2
              id="bin-h"
              className="mt-3 font-display text-[28px] leading-tight text-ink"
            >
              &ldquo;{subject}&rdquo; and everything written into it.
            </h2>
            <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
              Nobody has been sent this, so nothing that has left changes. It
              cannot be got back.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <form action={action}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="t min-h-[52px] border border-pool-error bg-transparent px-7 py-3 text-[17px] font-medium text-pool-error hover:bg-pool-error hover:text-pool disabled:opacity-60"
                >
                  {pending ? "Throwing away…" : "Throw it away"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t min-h-[44px] py-2 text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
