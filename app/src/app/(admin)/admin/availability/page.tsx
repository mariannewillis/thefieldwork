import type { Metadata } from "next";
import Link from "next/link";
import { formatDuration } from "@/lib/format";
import { listAllServices } from "@/lib/services";
import { BOOKING_WINDOW_DAYS, daysInWords, lastStartClock } from "@/lib/slots";

/**
 * When she is open to be asked, read across every session at once.
 *
 * NOTHING IS SET HERE, and that is the screen. The hours belong to each service
 * and are edited on it — the operator considered one working week for the whole
 * site and turned it down, because an hour in the garden room and a half-day she
 * drives to are not the same offer and one pattern would have to be the least
 * she does anywhere.
 *
 * What was missing was the OTHER half of that decision: with the answer in five
 * places, there was nowhere to see whether the five agreed. So this is a table
 * and a set of links. It answers "what am I actually offering?" in one look and
 * sends her to the one row that is wrong.
 *
 * IT SAYS THE ARITHMETIC OUT LOUD. Ninety minutes finishing by five makes half
 * past three the last start, and that sum is the single thing on this screen
 * most likely to surprise her — so it is a column rather than something she has
 * to work out from the two beside it.
 */

export const metadata: Metadata = {
  title: "Availability — The Field Work",
};

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const HEAD =
  "pb-3 pr-5 text-left align-bottom fig font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-ink-soft";
const CAPTION = "mt-0.5 block normal-case tracking-normal";
const CELL = "py-5 pr-5 align-top";
const FIG = "fig font-mono text-[17px] tabular-nums text-ink";
const NOTE = "mt-1 block fig font-mono text-[15px] tabular-nums text-ink-soft";

export default async function Page() {
  const services = await listAllServices();

  const offering = services.filter(
    (service) => service.published && service.availableDays.length > 0,
  );
  const silent = services.filter(
    (service) => service.published && service.availableDays.length === 0,
  );

  return (
    <section className="pt-8" aria-labelledby="availability-h">
      <p className={EYEBROW}>When you work</p>

      <h1
        id="availability-h"
        className="mt-3 max-w-[28ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {services.length === 0 ? (
          <>There are no sessions to be open for yet.</>
        ) : offering.length === 0 ? (
          <>Nothing on the site is offering times at the moment.</>
        ) : offering.length === 1 ? (
          <>One session on the site is offering times.</>
        ) : (
          <>{offering.length} sessions on the site are offering times.</>
        )}
        {silent.length > 0 && (
          <>
            <br />
            <span className="text-gold">
              {silent.length === 1
                ? "One has no days set, so it asks people in words instead."
                : `${silent.length} have no days set, so they ask people in words instead.`}
            </span>
          </>
        )}
      </h1>

      {services.length > 0 ? (
        <div className="pool on-pool mt-9 px-6 py-2 sm:px-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <caption className="sr-only">
                Every session, and when it is offered
              </caption>
              <thead>
                <tr className="border-b-2 border-ink">
                  <th scope="col" className={HEAD}>
                    Session
                    <span className={CAPTION}>and how long it runs</span>
                  </th>
                  <th scope="col" className={HEAD}>
                    Days
                  </th>
                  <th scope="col" className={HEAD}>
                    Hours
                    <span className={CAPTION}>and the last start</span>
                  </th>
                  <th scope="col" className={HEAD}>
                    Travel
                  </th>
                  <th scope="col" className={`${HEAD} pr-0`}>
                    Notice
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const last = lastStartClock(service);
                  const none = service.availableDays.length === 0;

                  return (
                    <tr
                      key={service.id}
                      className="border-b border-pool-rule/25 last:border-b-0"
                    >
                      <td className={CELL}>
                        <Link
                          href={`/admin/offerings/services/${service.slug}`}
                          className="t block font-display text-[21px] leading-tight text-ink underline decoration-pool-rule/50 underline-offset-4 hover:decoration-ink"
                        >
                          {service.name}
                        </Link>
                        <span className={NOTE}>
                          {formatDuration(service.durationMinutes)}
                          {service.published ? "" : " · not on the site"}
                        </span>
                      </td>

                      <td className={CELL}>
                        <span className={none ? `${FIG} text-ink-soft` : FIG}>
                          {daysInWords(service.availableDays)}
                        </span>
                        {none && (
                          <span className={NOTE}>
                            asks people in their own words
                          </span>
                        )}
                      </td>

                      <td className={CELL}>
                        <span className={FIG}>
                          {service.availableFrom}&ndash;{service.availableTo}
                        </span>
                        {/* THE SUM, as a fact rather than as an explanation.
                            It is the one figure here she cannot see by looking
                            at the two beside it. */}
                        <span className={NOTE}>
                          {last
                            ? `last start ${last}`
                            : "too long to fit — nothing is offered"}
                        </span>
                      </td>

                      <td className={CELL}>
                        <span className={FIG}>
                          {service.travelBufferMinutes === 0
                            ? "—"
                            : `${service.travelBufferMinutes} min`}
                        </span>
                        {service.travelBufferMinutes > 0 && (
                          <span className={NOTE}>each side</span>
                        )}
                      </td>

                      <td className="py-5 align-top">
                        <span className={FIG}>
                          {service.minimumNoticeHours === 0
                            ? "none"
                            : `${service.minimumNoticeHours} h`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Drawn deliberately. An empty table with headers reads as something
           that failed to load. */
        <div className="pool on-pool mt-9 max-w-[62ch] px-7 py-7">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
            Nothing yet
          </p>
          <p className="mt-2 font-display text-[26px] leading-tight text-ink">
            There are no one-to-one sessions written yet.
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
            Write one in{" "}
            <Link
              href="/admin/offerings?kind=services"
              className="underline decoration-pool-rule underline-offset-4 hover:decoration-ink"
            >
              Offerings
            </Link>{" "}
            and its hours are part of the same form.
          </p>
        </div>
      )}

      <p className="mt-8 max-w-[66ch] text-[19px] leading-relaxed text-plate-soft">
        People are shown times up to {BOOKING_WINDOW_DAYS} days ahead, and only
        ones that are clear of everything in your{" "}
        <Link
          href="/admin/calendar"
          className="text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
        >
          Calendar
        </Link>{" "}
        &mdash; workshops, course dates, sessions already paid for, requests
        holding a time, and anything you have blocked. To close a date, block it
        there.
      </p>
    </section>
  );
}
