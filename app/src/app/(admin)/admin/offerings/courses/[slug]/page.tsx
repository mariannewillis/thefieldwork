import Link from "next/link";
import OfferingMessage from "@/components/admin/OfferingMessage";
import { offeringMessages } from "@/lib/offering-messages";
import AttendingTable from "@/components/admin/AttendingTable";
import FlyerTab from "@/components/admin/FlyerTab";
import OfferingSeo from "@/components/admin/OfferingSeo";
import OfferingTabs, { offeringTab } from "@/components/admin/OfferingTabs";
import { attendingOffering } from "@/lib/attending";
import { offeredWays } from "@/lib/bookings";
import type { PayChoice } from "@/lib/instalments-shape";
import { notFound } from "next/navigation";
import CourseForm from "@/components/admin/CourseForm";
import { getCourseBySlug } from "@/lib/courses";
import { formatDayShort, formatMoney } from "@/lib/format";
import { mapSearchUrl } from "@/lib/maps";
import { listMediaBasenames } from "@/lib/media";
import { toSource } from "@/lib/rich-text";
import { listVenues } from "@/lib/venues";

/**
 * One course, open for editing.
 *
 * Reachable whether or not it is on the site — a course she has taken down is
 * still hers to work on. The line at the top reads its state off the record
 * rather than off the last thing that happened, so refreshing the page cannot
 * make it say something that is no longer true (D-9). The run in that line is
 * the first and last of its dates, in date order, which is the only order the
 * record keeps.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const showing = offeringTab(tab);
  const [course, media, venues] = await Promise.all([
    getCourseBySlug(slug),
    listMediaBasenames(),
    listVenues(),
  ]);

  if (!course) notFound();

  const [attendees, mail] = await Promise.all([
    attendingOffering("course", course.id),
    offeringMessages("course", course.id),
  ]);

  const dates = course.sessions;
  const run =
    dates.length === 0
      ? "No dates yet"
      : dates.length === 1
        ? `One date · ${formatDayShort(dates[0].date)}`
        : `${dates.length} dates · ${formatDayShort(dates[0].date)} – ${formatDayShort(dates[dates.length - 1].date)}`;

  return (
    <>
      <section className="pt-8 pb-1" aria-labelledby="form-h">
        <Link
          href="/admin/offerings?kind=courses"
          className="t fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text"
        >
          &larr; Offerings
        </Link>

        <p className="mt-5 fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          Course
        </p>
        <h1
          id="form-h"
          className="mt-3 font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
        >
          {course.name}
        </h1>
        <p className="mt-3 fig font-mono text-[17px] tabular-nums text-plate-soft">
          {run} &middot; {formatMoney(course.priceGBP)} &middot;{" "}
          {course.capacity} places
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <p
            className={`flex items-center gap-2.5 fig font-mono text-[15px] uppercase tracking-[0.14em] ${
              course.published ? "text-plate-success" : "text-plate-soft"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 ${course.published ? "bg-plate-success" : "bg-plate-soft"}`}
            />
            {course.published
              ? `Meant for the site · thefieldwork.co.uk/courses/${course.slug}`
              : "Not on the site · only you can see this"}
          </p>
        </div>

        {/* Said once, at the top, rather than beside every field it touches:
            a published course is now genuinely for sale, and the money side of
            that is the one thing worth restating before she edits anything. */}
        {course.published && (
          <p className="mt-4 max-w-[68ch] text-[17px] leading-relaxed text-plate-soft">
            This one is live and places can be bought.{" "}
            {(() => {
              // WHAT A BUYER IS ACTUALLY OFFERED, from the same function the
              // page and the checkout read — so this line cannot say "a deposit
              // is taken" about a course whose deposit day has been.
              const ways = offeredWays(course);
              const said = ways.map((way: PayChoice) =>
                way === "deposit"
                  ? `a deposit of ${formatMoney(course.depositGBP as number)} with the rest by ${formatDayShort(course.balanceDueAt as Date)}`
                  : way === "plan"
                    ? `${course.instalments} payments${course.planInterestBps > 0 ? ` with ${course.planInterestBps / 100}% on top` : ""}, one every ${course.instalmentEveryDays} days`
                    : "the whole price at once",
              );
              return said.length === 1
                ? `They pay ${said[0]}.`
                : `They choose between ${said.slice(0, -1).join(", ")} and ${said[said.length - 1]}.`;
            })()}{" "}
            Changing any of it changes what the NEXT person pays — anyone who
            has already booked keeps the terms they bought on.
          </p>
        )}
        <OfferingTabs
          base={`/admin/offerings/courses/${course.slug}`}
          current={showing}
          attending={attendees.length}
          kind="course"
        />
      </section>

      {showing === "editor" && (
        <>
          <CourseForm
            media={media}
            venues={venues}
            // Built from the STORED address, not from what is in the fields, so
            // the link goes where the site will send people. Null while the place
            // is not set yet, and the form then shows nothing.
            mapUrl={mapSearchUrl(course)}
            course={{
              ...course,
              // The textarea shows her own marks, not the markup they became.
              body: toSource(course.bodyHtml),
              // In code they are CourseSessions; nothing Marianne reads says so.
              dates,
            }}
          />

          {/* WHAT A MACHINE IS TOLD, said where the fields that decide it are.
              All of it is generated from the row above — there is nothing to
              fill in — which is exactly why it is worth showing: a thing that
              happens silently is a thing she cannot check. */}
          <OfferingSeo
            kind="course"
            slug={course.slug}
            name={course.name}
            summary={course.summary}
            heroImage={course.heroImage}
            published={course.published}
            when={
              course.sessions.length > 0
                ? `${course.sessions.length} ${course.sessions.length === 1 ? "session" : "sessions"}, from ${formatDayShort(course.sessions[0].date)}`
                : null
            }
          />
        </>
      )}

      {showing === "attending" && (
        <AttendingTable attendees={attendees} kind="course" />
      )}

      {showing === "email" && (
        <OfferingMessage
          kind="course"
          offeringId={course.id}
          slug={course.slug}
          subject={mail.draft.subject}
          blocks={mail.draft.blocks}
          attendees={attendees}
          media={media}
          sent={mail.sent}
        />
      )}

      {/* THE FLYER IS ITS OWN COMPONENT and it reads its own data, unlike the
          three tabs above it. Those need what this page already has in hand —
          the record, who is coming, what she has written to them — and passing
          them down costs nothing. A flyer needs a DIFFERENT read: the offering
          resolved against her overrides, the whole media library, and a QR
          generated from the address. Loading all of that on every visit to the
          editor tab, for a tab she may never open, is work nobody asked for. */}
      {showing === "flyer" && <FlyerTab kind="course" slug={course.slug} />}
    </>
  );
}
