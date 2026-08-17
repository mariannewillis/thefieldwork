/**
 * The cancellation page wears the workshops pages' clothes.
 *
 * Not a copy of them — the same module. It is the same composition: the fixed
 * page photograph, the blush pool, the three faces with tabular figures, and
 * `workshops.css` is imported through here so Next emits it in this route's
 * chunk exactly as it does for /workshops (D-8: each surface keeps what it was
 * designed in, and the boundary is where the stylesheet is imported).
 *
 * Duplicating the next/font declarations to save one indirection is how two
 * type systems drift apart by a weight.
 */
export { default } from "../workshops/layout";
