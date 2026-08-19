"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteWorkshop,
  setWorkshopVisibility,
  type DeleteState,
  type VisibilityState,
} from "@/app/(admin)/admin/offerings/actions";
import {
  deleteCourse,
  setCourseVisibility,
} from "@/app/(admin)/admin/offerings/courses/actions";
import {
  deleteService,
  setServiceVisibility,
} from "@/app/(admin)/admin/offerings/services/actions";

/**
 * SHOW OR HIDE, AND DELETE — on the offerings list itself.
 *
 * Both already existed and both were only reachable by opening the thing first
 * (operator, 2026-08-19): delete lived at the foot of each edit form, and
 * whether a page was live was a tickbox halfway up it. Taking something off the
 * site is the one thing an operator wants at speed, and it was four clicks and
 * a save away.
 *
 * ONE COMPONENT FOR THREE KINDS. The three pairs of server actions have the
 * same two shapes, so the kind chooses the pair and nothing else here branches
 * on it. Three near-identical components would have been three places to fix
 * the next thing about either control.
 *
 * HIDING IS ONE PRESS; DELETING IS TWO. They are not the same risk and are not
 * drawn as though they were: hiding is reversible by pressing the same control
 * again, and deleting takes the record away for good. The confirm is a second
 * control that names what goes rather than a browser `confirm()` box, which is
 * chrome she cannot read her own workshop's name in.
 *
 * THE REFUSALS COME FROM THE SERVER and are drawn where they land. A workshop
 * somebody has paid for cannot be deleted; an unfinished one cannot be
 * published. Neither is a disabled button, because both sentences depend on
 * facts this component does not hold — a booking count, and which of the two
 * missing things is missing.
 */

export type OfferingKind = "workshop" | "course" | "service";

const DELETE_INITIAL: DeleteState = { error: null };
const VISIBILITY_INITIAL: VisibilityState = { error: null, done: 0 };

const CHIP =
  "t min-h-[38px] border border-plate-rule/60 px-3 py-1.5 text-[15px] text-plate-soft hover:border-gold hover:text-plate-text";
const CHIP_ON =
  "t min-h-[38px] border border-gold bg-gold px-3 py-1.5 text-[15px] text-ink hover:bg-plate-text hover:border-plate-text";
const DANGER =
  "t min-h-[38px] border border-plate-error px-3 py-1.5 text-[15px] text-plate-error hover:bg-plate-error hover:text-ground";
const GHOST =
  "t min-h-[38px] py-1.5 text-[15px] text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text";

export default function OfferingRowActions({
  kind,
  id,
  name,
  published,
}: {
  kind: OfferingKind;
  id: number;
  name: string;
  published: boolean;
}) {
  const visibilityAction =
    kind === "workshop"
      ? setWorkshopVisibility
      : kind === "course"
        ? setCourseVisibility
        : setServiceVisibility;
  const deleteAction =
    kind === "workshop"
      ? deleteWorkshop
      : kind === "course"
        ? deleteCourse
        : deleteService;

  const [visibility, submitVisibility, changing] = useActionState(
    visibilityAction,
    VISIBILITY_INITIAL,
  );
  const [removal, submitDelete, deleting] = useActionState(
    deleteAction,
    DELETE_INITIAL,
  );
  const [asked, setAsked] = useState(false);

  // A refusal from the server means the delete did not happen, so the confirm
  // step closes rather than sitting there looking like it is still going to.
  useEffect(() => {
    if (removal.error) setAsked(false);
  }, [removal.error]);

  const word = kind === "service" ? "session" : kind;

  return (
    <div className="mt-4 flex flex-col items-start gap-3 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {/* ONE FORM PER CONTROL, and no `formAction` with a name on it: both
            rules are D-30's, learned when a nested form left every button on
            the newsletter editor inert. */}
        <form action={submitVisibility}>
          <input type="hidden" name="id" value={id} />
          <input
            type="hidden"
            name="publish"
            value={published ? "off" : "on"}
          />
          <button
            type="submit"
            disabled={changing}
            className={published ? CHIP_ON : CHIP}
            aria-label={
              published
                ? `Take ${name} off the site`
                : `Put ${name} on the site`
            }
          >
            {changing
              ? "Working…"
              : published
                ? "On the site"
                : "Not on the site"}
          </button>
        </form>

        {asked ? (
          <form action={submitDelete}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={deleting}
              className={DANGER}
              aria-label={`Delete ${name} for good`}
            >
              {deleting ? "Deleting…" : "Delete it for good"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAsked(true)}
            className={GHOST}
            aria-label={`Delete ${name}`}
          >
            Delete
          </button>
        )}

        {asked && !deleting && (
          <button
            type="button"
            onClick={() => setAsked(false)}
            className={GHOST}
          >
            Keep it
          </button>
        )}
      </div>

      {asked && !removal.error && (
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-plate-soft md:text-right">
          This takes {name} away for good, and it cannot be undone. To stop
          showing it without losing it, use the control beside this one.
        </p>
      )}

      {/* Both refusals land here. "Somebody has paid for this one" and "it has
          no picture yet" are the two sentences this screen exists to say. */}
      {(removal.error || visibility.error) && (
        <p
          role="alert"
          className="max-w-[52ch] text-[15px] leading-relaxed text-plate-error md:text-right"
        >
          {removal.error ?? visibility.error}
        </p>
      )}

      <span className="sr-only">
        {published
          ? `${name} is on the site.`
          : `${name} is not on the site. Visitors cannot see this ${word}.`}
      </span>
    </div>
  );
}
