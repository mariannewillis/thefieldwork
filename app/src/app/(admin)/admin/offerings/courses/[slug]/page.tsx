import Link from "next/link";
import OfferingMessage from "@/components/admin/OfferingMessage";
import { offeringMessages } from "@/lib/offering-messages";
import AttendingTable from "@/components/admin/AttendingTable";
import OfferingTabs, { offeringTab } from "@/components/admin/OfferingTabs";
import { attendingOffering } from "@/lib/attending";
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
            {course.depositGBP && course.balanceDueAt
              ? `A deposit of ${formatMoney(course.depositGBP)} is taken at booking and the rest is due by ${formatDayShort(course.balanceDueAt)}.`
              : "The whole price is taken when somebody books."}{" "}
            Changing the price or the deposit changes what the NEXT person pays
            — anyone who has already booked keeps the terms they bought on.
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
    </>
  );
}
