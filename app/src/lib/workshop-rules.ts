/**
 * The rules about a workshop that both sides of the wire need.
 *
 * Kept out of `lib/workshops.ts` because that file is `server-only` — it holds
 * queries — and the form has to derive the address as she types, stop offering
 * picture slots at twelve, and know how much typing is worth a lookup, all
 * without asking the server. One definition, used in both places, so the
 * browser and the server can never disagree.
 *
 * They cannot travel through the actions file either: a `"use server"` module
 * may export nothing but async functions, so a constant re-exported from there
 * fails the build. Found the only way it could be — in a browser.
 */

/** How many pictures a workshop's rail carries before the form refuses more. */
export const MAX_IMAGES = 12;

/**
 * The shortest address term worth spending a request on.
 *
 * getAddress's own widget uses two. Three, here, because every letter typed is
 * a round trip through OUR server before it is one to theirs, and a two-letter
 * term answers with whatever the country has most of rather than anything she
 * was looking for. The form stops short of it; `lib/addresses` refuses below it
 * as well, because the form is not the only thing that can call the action.
 */
export const MIN_TERM_LENGTH = 3;

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
