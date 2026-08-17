/**
 * The about page wears the workshops pages' clothes.
 *
 * Not a copy of them — the same module, exactly as `services/layout.tsx` and
 * `subscribe/layout.tsx` re-export it. `workshops.css` is imported through here
 * so Next emits it in this route's chunk (D-8: each surface keeps what it was
 * designed in, and the boundary is where the stylesheet is imported), and the
 * three faces arrive as the same `--ws-*` variables every other interior page
 * uses.
 *
 * The COMPOSITION on this page is the home page's — full-bleed plates, one
 * clearing per beat — but the vocabulary it is written in is this one's, which
 * is what the approved screen was drawn in. See the `.plate` note in
 * workshops.css.
 */
export { default } from "../workshops/layout";
