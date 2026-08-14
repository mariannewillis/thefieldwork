/**
 * The rules about an offering that both sides of the wire need.
 *
 * A workshop and a course ask the same two questions — what address does this
 * name make, and how many pictures is too many — so there is one answer to
 * each. It was `workshop-rules.ts` while workshops were the only offering
 * there was.
 *
 * Kept out of `lib/workshops.ts` because that file is `server-only` — it holds
 * queries — and the form has to derive the address as she types and stop
 * offering picture slots at twelve, both without asking the server. One
 * definition, used in both places, so the browser and the server can never
 * disagree.
 *
 * They cannot travel through the actions file either: a `"use server"` module
 * may export nothing but async functions, so a constant re-exported from there
 * fails the build. Found the only way it could be — in a browser.
 */

/** How many pictures a rail carries before the form refuses more. */
export const MAX_IMAGES = 12;

/**
 * What a save that did not happen hands back to the form it came from.
 *
 * Lives here rather than beside either action because both forms are drawn
 * from it in the browser, and both actions fill it in on the server.
 */
export type OfferingFormState = {
  /** Keyed by the field's `name`, drawn under that field. */
  errors: Record<string, string>;
  /** The line at the top: how many things need another look. */
  message: string | null;
  /** What was typed, echoed back so a rejected form loses nothing. */
  values: Record<string, string>;
  /** Bumped on every failed attempt; the form remounts on it (see the form). */
  attempt: number;
};

/** Nothing saved yet, nothing wrong yet. What both forms open on. */
export const NO_ATTEMPT_YET: OfferingFormState = {
  errors: {},
  message: null,
  values: {},
  attempt: 0,
};

/**
 * The name, turned into an address.
 *
 * Offered when the workshop is created and editable afterwards. Characters
 * outside a-z and 0-9 are dropped rather than transliterated: a guess at what
 * someone meant produces addresses nobody can predict, and the field is
 * editable precisely so she can write it herself when this gets it wrong.
 */
export function slugify(name: string): string {
  return (
    name
      // NFKD splits an accented letter into letter + mark, and the sweep below
      // drops the mark with everything else that is not a letter or a digit.
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
  );
}
