/**
 * The contact page wears the workshops pages' clothes.
 *
 * The same module, exactly as `about/layout.tsx` and `services/layout.tsx`
 * re-export it, so `workshops.css` and the three faces arrive in this route's
 * chunk and the form's fields are the same fields the request form draws.
 */
export { default } from "../workshops/layout";
