/**
 * The two field names the request form and its guard have to agree on.
 *
 * Their own module, and deliberately NOT server-only, for the reason
 * `lib/format.ts` and `lib/maps.ts` give on theirs: the form that draws these
 * fields is a client component and the code that reads them is a server
 * action, so both sides need the same two strings. Writing them out twice is
 * how a honeypot quietly stops catching anything — the trap is renamed on one
 * side, nothing fails, nothing is logged, and the guard silently passes
 * everything from then on.
 *
 * Nothing secret lives here. The names are in the delivered HTML either way;
 * what makes the trap work is that a person never sees the field, not that a
 * robot cannot learn its name. The counters and the clock that DO have to stay
 * on the server are in `lib/request-guard.ts`, which is server-only.
 */

/** The field the trap wears. Plausible enough to be filled in. */
export const HONEYPOT_FIELD = "website";

/** Carries when the form was drawn, in epoch milliseconds. */
export const DRAWN_AT_FIELD = "drawnAt";
