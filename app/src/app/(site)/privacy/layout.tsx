/**
 * The privacy page wears the workshops pages' clothes.
 *
 * The same module, exactly as `about/layout.tsx`, `contact/layout.tsx` and
 * `services/layout.tsx` re-export it, so `workshops.css` and the three faces
 * arrive in this route's chunk (D-8: each surface keeps what it was designed
 * in, and the boundary is where the stylesheet is imported).
 */
export { default } from "../workshops/layout";
