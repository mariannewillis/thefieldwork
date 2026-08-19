import { redirect } from "next/navigation";

/**
 * `/admin` — no longer a screen of its own (operator, 2026-08-19).
 *
 * It was Today: a `SectionStub` promising "everything waiting on a decision
 * from you, in one place". It was never built, and the things it promised now
 * exist on their own screens — Requests holds what is waiting on her yes or no,
 * Calendar holds who is booked in.
 *
 * A REDIRECT RATHER THAN A DELETION, because this path is not optional. Signing
 * in lands here (`login/actions.ts` defaults `next` to it), changing a password
 * lands here, resetting one lands here, and the mark at the top of every admin
 * screen links here. Removing the route would 404 all four; removing the route
 * AND changing all four to point at Calendar would leave any bookmark she has
 * pointing at nothing.
 *
 * Calendar, because it is the top of the rail now, so signing in lands her on
 * the first thing in the list — which is what a rail with no dashboard should
 * do. `replace` rather than a push, so Back does not bounce her through here.
 */
export default function AdminHome() {
  redirect("/admin/calendar");
}
