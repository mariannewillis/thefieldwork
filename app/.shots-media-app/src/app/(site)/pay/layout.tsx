/**
 * The balance page wears the workshops pages' clothes.
 *
 * Not a copy of them — the same module, exactly as /cancel and /courses do it.
 * It is the same composition: the fixed page photograph, the blush pool, the
 * tabular figures, and `workshops.css` is imported through here so Next emits
 * it in this route's chunk (D-8: each surface keeps what it was designed in,
 * and the boundary is where the stylesheet is imported).
 */
export { default } from "../workshops/layout";
