"use client";

import { useActionState } from "react";
import { mergeDuplicateGroup } from "@/app/(admin)/admin/media/actions";
import { mediaSrc } from "@/components/admin/OfferingFormParts";

/**
 * The same thing, held more than once — shown, explained, and cleared here.
 *
 * WHY IT IS ON THIS SCREEN AND NOT IN A SCRIPT. The eighteen files this was
 * written against are the pictures on live workshops and live letters. Clearing
 * them moves references on pages that are on the internet, which is Marianne's
 * decision to make, one group at a time, having read what will happen. So the
 * panel says exactly what each press will do BEFORE she presses it, and it does
 * nothing until she does.
 *
 * IT IS DRAWN EVEN WHEN THERE IS NOTHING TO SHOW, and that is deliberate rather
 * than untidy. What she has just merged is reported here; if the panel vanished
 * the moment the last group went, the report of the merge would vanish with it
 * and the screen would simply be one picture shorter with no account of why. So
 * the empty state is one quiet line, and the report sits under it.
 *
 * NO NESTED FORMS. The Media page is not a form — see `MediaLibrary` — so a
 * form per group is simply a form. And no `name` on any button: React encodes
 * which action a `formAction` button calls in that attribute, and setting our
 * own produced the `$ACTION_REF_6` mismatch D-30 records. Nothing here carries
 * `formAction` at all, which is the sturdier version of the same rule.
 */

/** One copy, as the panel needs it. */
export type DuplicateCopy = {
  ref: string;
  /** Already formatted on the server; null means "already on the site". */
  addedAt: string | null;
  /** Where it is named, in her words. */
  uses: string[];
};

/** One set of files that are all the same file, as the panel needs it. */
export type DuplicateGroupRow = {
  hash: string;
  kind: "picture" | "document";
  survivor: DuplicateCopy;
  losers: DuplicateCopy[];
  /** Null when it can be merged; a sentence when it cannot. */
  refusal: string | null;
};

const NOTHING = { report: null, error: null };

/** "Six copies", "Two copies" — read aloud rather than printed as a figure. */
function copiesWords(count: number): string {
  const words = ["", "one", "two", "three", "four", "five", "six", "seven"];
  return `${words[count] ?? count} copies`;
}

/** What the button will do, said before it is pressed. */
function plan(group: DuplicateGroupRow): string {
  const what = group.kind === "picture" ? "picture" : "document";
  const moves = group.losers.reduce(
    (total, loser) => total + loser.uses.length,
    0,
  );
  const files = group.losers.length * (group.kind === "picture" ? 6 : 1);

  const moving =
    moves === 0
      ? "Nothing on the site is pointing at the extra copies, so nothing has to move."
      : moves === 1
        ? "One page is pointing at an extra copy; it will be moved onto the one that stays, and it will go on showing exactly the same picture."
        : `${moves} places are pointing at an extra copy; they will be moved onto the one that stays, and every one of them will go on showing exactly the same picture.`;

  return `${moving} Then the other ${group.losers.length === 1 ? `copy goes, and its ${files === 1 ? "file" : `${files} files`} with it` : `${group.losers.length} copies go, and their ${files} files with them`}. The ${what} that stays is the one you have had longest.`;
}

export default function Duplicates({
  groups,
  kind,
}: {
  groups: DuplicateGroupRow[];
  kind: "picture" | "document";
}) {
  const [state, action, pending] = useActionState(mergeDuplicateGroup, NOTHING);

  const what = kind === "picture" ? "picture" : "document";
  const plural = kind === "picture" ? "pictures" : "documents";

  return (
    <section
      aria-labelledby="duplicates-h"
      className="mt-8 border-t border-pool-rule/40 pt-7"
    >
      <h2
        id="duplicates-h"
        className="font-display text-[26px] leading-tight text-ink"
      >
        {groups.length === 0
          ? "Nothing here twice"
          : groups.length === 1
            ? `One ${what} is here more than once`
            : `${groups.length} ${plural} are here more than once`}
      </h2>

      {groups.length === 0 ? (
        <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
          Every {what} in here is a different {what}. Anything you add from now
          on is checked against what is already here before it is saved, so the
          same one cannot arrive twice however it is named.
        </p>
      ) : (
        <p className="mt-3 max-w-[64ch] text-[17px] leading-relaxed text-ink-soft">
          These are the same {plural} stored under more than one name &mdash;
          the same file sent up more than once. Keeping one of each frees the
          room the rest are taking and leaves every page showing what it shows
          now.
        </p>
      )}

      <ul className="mt-7 flex list-none flex-col gap-0 p-0">
        {groups.map((group) => (
          <li
            key={group.hash}
            className="border-t border-pool-rule/40 py-7 first:border-t-0 first:pt-0"
          >
            <p className="fig font-mono text-[13px] uppercase tracking-[0.14em] text-ink">
              {copiesWords(group.losers.length + 1)} of one {what}
            </p>

            {/* The survivor, drawn large, and the copies beside it — because
                "these are all the same picture" is a claim she should be able
                to check with her eyes rather than take on trust. */}
            <div className="mt-4 flex flex-wrap gap-6">
              {kind === "picture" && (
                <div className="w-full max-w-[220px] shrink-0">
                  {/* NOT lazy, unlike the library's own grid. There are a
                      handful of these at most, and the whole question she is
                      being asked — are these really the same photograph? — is
                      one she answers with her eyes. A thumbnail that has not
                      loaded is a question she cannot answer. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaSrc(group.survivor.ref)}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              )}

              <div className="min-w-[18rem] flex-1">
                {/* The wording changes when the group is refused, because
                    "this one stays" is a promise about something that is not
                    going to happen. Nothing about a refused group changes. */}
                <p className="text-[17px] leading-relaxed text-ink">
                  <strong className="font-semibold">
                    {group.refusal ? "The oldest of these:" : "This one stays:"}
                  </strong>{" "}
                  {group.survivor.ref.replace(/-/g, " ")}
                  <span className="text-ink-soft">
                    {" "}
                    &mdash;{" "}
                    {group.survivor.addedAt
                      ? `added ${group.survivor.addedAt}`
                      : "already on the site"}
                  </span>
                </p>

                <p className="fig font-mono mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-soft">
                  {group.refusal
                    ? group.losers.length === 1
                      ? "The other copy"
                      : "The other copies"
                    : group.losers.length === 1
                      ? "The copy that goes"
                      : "The copies that go"}
                </p>
                <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                  {group.losers.map((loser) => (
                    <li
                      key={loser.ref}
                      className="text-[15px] leading-relaxed text-ink-soft"
                    >
                      {loser.ref.replace(/-/g, " ")}
                      {loser.uses.length > 0 && (
                        <> &mdash; {loser.uses.join("; ")}</>
                      )}
                    </li>
                  ))}
                </ul>

                {/* WHAT IT WILL DO, before it does it. */}
                <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink">
                  {group.refusal ?? plan(group)}
                </p>

                {group.refusal ? (
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    Nothing here can be pressed for this one, and that is the
                    point &mdash; half of this would leave a page pointing at a
                    picture that had gone.
                  </p>
                ) : (
                  <form action={action} className="mt-5">
                    <input type="hidden" name="kind" value={group.kind} />
                    <input type="hidden" name="hash" value={group.hash} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="t min-h-[48px] bg-action px-6 text-[16px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
                    >
                      {pending ? "Working…" : "Keep one, remove the rest"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* WHAT HAPPENED, afterwards, in words — and it outlives the group it
          describes, because the group is gone by the time this is drawn. */}
      {state.report && (
        <p
          role="status"
          className="mt-6 max-w-[64ch] border-l-2 border-action pl-4 text-[17px] leading-relaxed text-ink"
        >
          {state.report}
        </p>
      )}
      {state.error && (
        <p
          role="alert"
          className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-pool-error"
        >
          {state.error}
        </p>
      )}
    </section>
  );
}
