import Link from "next/link";
import OfferingRowActions from "@/components/admin/OfferingRowActions";
import { listAllCourses } from "@/lib/courses";
import {
  formatDayShort,
  formatDuration,
  formatMoney,
  isPast,
} from "@/lib/format";
import { listAllServices } from "@/lib/services";
import { listAllWorkshops } from "@/lib/workshops";

/**
 * Offerings — three kinds, one list each.
 *
 * Ported from docs/screens/workshopflow/admin-offerings.html. What that screen
 * shows and this does not: the money taken and the places gone. Both are
 * countable for workshops now that bookings exist, but every figure about who
 * has paid belongs on the portal's bookings page. Courses and services cannot
 * be bought at all yet, so for them there is nothing to count.
 *
 * The three lists are the same list three times, and deliberately: the rows
 * differ in one column each. Where a workshop prints its day, a course prints
 * the span of its run and a service prints how long it takes. Everything else
 * about reading the list is the same job.
 */

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const MUTED_EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft";
const ROW = "border-t border-plate-rule/30 py-9";
const FIGURES = "fig font-mono tabular-nums md:text-right";
const TAB =
  "inline-flex min-h-[52px] items-center border-b-2 fig font-mono text-[18px] uppercase tracking-[0.14em]";
const TAB_ON = `${TAB} border-gold text-gold`;
const TAB_OFF = `${TAB} t border-transparent text-plate-soft hover:text-plate-text`;

type Workshop = Awaited<ReturnType<typeof listAllWorkshops>>[number];
type Course = Awaited<ReturnType<typeof listAllCourses>>[number];
type Service = Awaited<ReturnType<typeof listAllServices>>[number];

/** The picture, or the space where one is not. Both lists want the same one. */
function Thumbnail({ image, alt }: { image: string | null; alt: string }) {
  if (!image) {
    return (
      <p className="flex aspect-[4/5] w-full max-w-[140px] items-center justify-center border border-plate-rule p-3 text-center fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft">
        No picture yet
      </p>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/media/${image}-1200.jpg`}
      alt={alt}
      width={140}
      height={175}
      className="aspect-[4/5] w-full max-w-[140px] object-cover"
    />
  );
}

/** Whether it is on the site, in the words the row uses for it. */
function LiveMark({ published }: { published: boolean }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-[15px] uppercase tracking-[0.14em] md:justify-end">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 ${published ? "bg-plate-success" : "bg-plate-soft"}`}
      />
      <span className={published ? "text-plate-success" : "text-plate-soft"}>
        {published ? "Live on the site" : "Not on the site"}
      </span>
    </p>
  );
}

function WorkshopRow({ workshop }: { workshop: Workshop }) {
  const finished = isPast(workshop.date);

  return (
    <article className={ROW}>
      <Link
        href={`/admin/offerings/workshops/${workshop.slug}`}
        className="grid gap-6 md:grid-cols-[118px_140px_1fr_auto] md:items-start md:gap-8"
      >
        <p
          className={`fig font-mono text-[18px] tabular-nums ${finished ? "text-plate-soft" : "text-gold"}`}
        >
          {formatDayShort(workshop.date)}
          <br />
          <span className="text-plate-soft">
            {workshop.startTime}
            {workshop.endTime ? `–${workshop.endTime}` : ""}
          </span>
        </p>

        <Thumbnail image={workshop.heroImage} alt={workshop.heroAlt ?? ""} />

        <div>
          <h3 className="font-display text-[28px] font-normal leading-tight text-plate-text">
            {workshop.name}
          </h3>
          <p className="mt-3 max-w-[52ch] text-[18px] leading-relaxed text-plate-soft">
            {workshop.summary}
          </p>
          <p className="mt-4 fig font-mono text-[15px] text-plate-soft">
            {workshop.venueName || "No place set yet"}
            {workshop._count.images > 0 &&
              ` · ${workshop._count.images} picture${workshop._count.images === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className={FIGURES}>
          <p className="text-[19px] text-plate-text">
            {formatMoney(workshop.priceGBP)}
          </p>
          <p className="mt-1 text-[17px] text-plate-text">
            {workshop.capacity} places
          </p>
          <LiveMark published={workshop.published} />
        </div>
      </Link>

      {/* OUTSIDE THE LINK, and it has to be: a button inside an anchor is
          invalid HTML, and every press would navigate before it did anything.
          The row stays a link to the form; these two are the things she should
          not have to open the form for. */}
      <OfferingRowActions
        kind="workshop"
        id={workshop.id}
        name={workshop.name}
        published={workshop.published}
      />
    </article>
  );
}

/**
 * A course, in the same row as a workshop.
 *
 * Where the workshop prints its one day, this prints the run: how many dates
 * and the first and last of them, read off the dates themselves in date order.
 * There is nothing else it could be read off — a course has no date column of
 * its own, on purpose.
 */
function CourseRow({ course }: { course: Course }) {
  const dates = course.sessions;
  const last = dates[dates.length - 1];
  const finished = Boolean(last && isPast(last.date));

  return (
    <article className={ROW}>
      <Link
        href={`/admin/offerings/courses/${course.slug}`}
        className="grid gap-6 md:grid-cols-[118px_140px_1fr_auto] md:items-start md:gap-8"
      >
        <p
          className={`fig font-mono text-[18px] tabular-nums ${finished ? "text-plate-soft" : "text-gold"}`}
        >
          {dates.length === 0 ? (
            <span className="text-plate-soft">No dates yet</span>
          ) : (
            <>
              {formatDayShort(dates[0].date)}
              {dates.length > 1 && (
                <>
                  <br />
                  <span className="text-plate-soft">
                    to {formatDayShort(last.date)}
                  </span>
                </>
              )}
            </>
          )}
        </p>

        <Thumbnail image={course.heroImage} alt={course.heroAlt ?? ""} />

        <div>
          <h3 className="font-display text-[28px] font-normal leading-tight text-plate-text">
            {course.name}
          </h3>
          <p className="mt-3 max-w-[52ch] text-[18px] leading-relaxed text-plate-soft">
            {course.summary}
          </p>
          <p className="mt-4 fig font-mono text-[15px] text-plate-soft">
            {course.venueName || "No place set yet"}
            {` · ${dates.length} ${dates.length === 1 ? "date" : "dates"}`}
            {course._count.images > 0 &&
              ` · ${course._count.images} picture${course._count.images === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className={FIGURES}>
          <p className="text-[19px] text-plate-text">
            {formatMoney(course.priceGBP)}
          </p>
          <p className="mt-1 text-[17px] text-plate-text">
            {course.capacity} places
          </p>
          <LiveMark published={course.published} />
        </div>
      </Link>

      {/* OUTSIDE THE LINK, and it has to be: a button inside an anchor is
          invalid HTML, and every press would navigate before it did anything.
          The row stays a link to the form; these two are the things she should
          not have to open the form for. */}
      <OfferingRowActions
        kind="course"
        id={course.id}
        name={course.name}
        published={course.published}
      />
    </article>
  );
}

/**
 * A service, in the same row as the other two.
 *
 * Where the workshop prints its one day and the course prints its run, this
 * prints how long it takes — which is the only thing a service says about
 * time. It is not in the diary until somebody asks for a slot, so there is no
 * "already happened" list below: a service is a standing offer rather than a
 * date, and it stops being one when she takes it off the site.
 */
function ServiceRow({ service }: { service: Service }) {
  const travels = service.location === "travels";

  return (
    <article className={ROW}>
      <Link
        href={`/admin/offerings/services/${service.slug}`}
        className="grid gap-6 md:grid-cols-[118px_140px_1fr_auto] md:items-start md:gap-8"
      >
        <p className="fig font-mono text-[18px] tabular-nums text-gold">
          {formatDuration(service.durationMinutes)}
          <br />
          <span className="text-plate-soft">one to one</span>
        </p>

        <Thumbnail image={service.heroImage} alt={service.heroAlt ?? ""} />

        <div>
          <h3 className="font-display text-[28px] font-normal leading-tight text-plate-text">
            {service.name}
          </h3>
          <p className="mt-3 max-w-[52ch] text-[18px] leading-relaxed text-plate-soft">
            {service.summary}
          </p>
          <p className="mt-4 fig font-mono text-[15px] text-plate-soft">
            {travels
              ? `Travels ${service.travelRadiusMiles} ${service.travelRadiusMiles === 1 ? "mile" : "miles"} from ${service.basePostcode}`
              : service.venueName || "No place set yet"}
            {service._count.images > 0 &&
              ` · ${service._count.images} picture${service._count.images === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className={FIGURES}>
          <p className="text-[19px] text-plate-text">
            {formatMoney(service.priceGBP)}
          </p>
          <p className="mt-1 text-[17px] text-plate-text">a session</p>
          <LiveMark published={service.published} />
        </div>
      </Link>

      {/* OUTSIDE THE LINK, and it has to be: a button inside an anchor is
          invalid HTML, and every press would navigate before it did anything.
          The row stays a link to the form; these two are the things she should
          not have to open the form for. */}
      <OfferingRowActions
        kind="service"
        id={service.id}
        name={service.name}
        published={service.published}
      />
    </article>
  );
}

/** The button that starts a new one, in the words of the tab it sits on. */
function AddButton({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="t inline-flex min-h-[56px] items-center gap-3 bg-gold px-9 text-[18px] font-semibold text-ink hover:bg-plate-text"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {children}
    </Link>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  // Anything else — a hand-typed address, a stale bookmark — lands on
  // workshops, which is the tab the page opens on.
  const showing =
    kind === "courses"
      ? "courses"
      : kind === "services"
        ? "services"
        : "workshops";

  const [workshops, courses, services] = await Promise.all([
    listAllWorkshops(),
    listAllCourses(),
    listAllServices(),
  ]);

  const comingWorkshops = workshops.filter(
    (workshop) => !isPast(workshop.date),
  );
  const finishedWorkshops = workshops
    .filter((workshop) => isPast(workshop.date))
    .reverse();

  // A course is finished when its LAST date has been and gone. One with no
  // dates at all is coming up — it is the one she is still writing, and it
  // sorts to the end of the list because it has no place in the diary yet.
  const runEnded = (course: Course) => {
    const last = course.sessions[course.sessions.length - 1];
    return Boolean(last && isPast(last.date));
  };
  const byFirstDate = (one: Course, other: Course) => {
    const first = one.sessions[0]?.date.getTime() ?? Infinity;
    const otherFirst = other.sessions[0]?.date.getTime() ?? Infinity;
    return first - otherFirst;
  };
  const comingCourses = courses.filter((course) => !runEnded(course));
  comingCourses.sort(byFirstDate);
  const finishedCourses = courses.filter(runEnded);
  finishedCourses.sort(byFirstDate);
  finishedCourses.reverse();

  return (
    <section className="pt-8" aria-labelledby="section-title">
      <p className={EYEBROW}>What you offer</p>
      <h1
        id="section-title"
        className="mt-3 max-w-[34ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        Offerings
      </h1>
      <p className="mt-4 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        Three kinds, one list each. Open any line to change it. Whether a thing
        is live on the site is marked on its own line.
      </p>

      {/* All three kinds have something behind them now. */}
      <nav
        aria-label="Kinds of offering"
        className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-1 border-b border-plate-rule/40"
      >
        <Link
          href="/admin/offerings"
          aria-current={showing === "workshops" ? "page" : undefined}
          className={showing === "workshops" ? TAB_ON : TAB_OFF}
        >
          Workshops{" "}
          <span className="ml-2 tabular-nums">{workshops.length}</span>
        </Link>
        <Link
          href="/admin/offerings?kind=services"
          aria-current={showing === "services" ? "page" : undefined}
          className={showing === "services" ? TAB_ON : TAB_OFF}
        >
          Services <span className="ml-2 tabular-nums">{services.length}</span>
        </Link>
        <Link
          href="/admin/offerings?kind=courses"
          aria-current={showing === "courses" ? "page" : undefined}
          className={showing === "courses" ? TAB_ON : TAB_OFF}
        >
          Courses <span className="ml-2 tabular-nums">{courses.length}</span>
        </Link>
      </nav>

      {showing === "services" ? (
        <section className="mt-9" aria-labelledby="services-h">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
            <div>
              <h2 id="services-h" className={EYEBROW}>
                What you offer one to one
              </h2>
              <p className="mt-2 fig font-mono text-[15px] tabular-nums text-plate-soft">
                {services.length === 0
                  ? "No services yet"
                  : `${services.length} ${services.length === 1 ? "service" : "services"} · ${services.filter((service) => service.published).length} of them marked for the site`}
              </p>
            </div>
            <AddButton href="/admin/offerings/services/new">
              Write a new service
            </AddButton>
          </div>

          {services.length === 0 ? (
            <div className="pool on-pool mt-8 max-w-[62ch] px-7 py-7">
              <p className="font-display text-[28px] leading-tight text-ink">
                No services yet
              </p>
              <p className="mt-3 text-[18px] leading-relaxed text-ink">
                A service is one person and one session — no date, because
                somebody asks you for a slot rather than you setting one. Write
                one and it sits here with its length beside it.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              {services.map((service) => (
                <ServiceRow key={service.id} service={service} />
              ))}
            </div>
          )}

          {/* The one thing this list cannot say, said once rather than as a
              dash on every row. */}
          <p className="mt-8 max-w-[62ch] fig font-mono text-[15px] leading-relaxed text-plate-soft">
            A session is asked for rather than bought — nobody can pay for one
            online, and there is no diary to pick a time out of. Requests land
            in Requests and you answer them by email. Each line here shows how
            long a session runs and what it costs.
          </p>
        </section>
      ) : showing === "courses" ? (
        <>
          <section className="mt-9" aria-labelledby="coming-courses-h">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
              <div>
                <h2 id="coming-courses-h" className={EYEBROW}>
                  Running and being written
                </h2>
                <p className="mt-2 fig font-mono text-[15px] tabular-nums text-plate-soft">
                  {comingCourses.length === 0
                    ? "No courses yet"
                    : `${comingCourses.length} ${comingCourses.length === 1 ? "course" : "courses"} · ${comingCourses.filter((course) => course.published).length} of them marked for the site`}
                </p>
              </div>
              <AddButton href="/admin/offerings/courses/new">
                Write a new course
              </AddButton>
            </div>

            {comingCourses.length === 0 ? (
              <div className="pool on-pool mt-8 max-w-[62ch] px-7 py-7">
                <p className="font-display text-[28px] leading-tight text-ink">
                  No courses yet
                </p>
                <p className="mt-3 text-[18px] leading-relaxed text-ink">
                  A course is one purchase covering a run of dates — six
                  Wednesdays rather than one Saturday. Write one and it sits
                  here with its run beside it.
                </p>
              </div>
            ) : (
              <div className="mt-8">
                {comingCourses.map((course) => (
                  <CourseRow key={course.id} course={course} />
                ))}
              </div>
            )}
          </section>

          {/* The one thing this list cannot say, said once rather than as a
              dash on every row. */}
          <p className="mt-8 max-w-[62ch] fig font-mono text-[15px] leading-relaxed text-plate-soft">
            Courses cannot be booked yet — there is no checkout for them, and no
            deposit is taken. Each line shows what the room holds and what the
            run costs; who has paid arrives with the booking pages.
          </p>

          {finishedCourses.length > 0 && (
            <section className="mt-20" aria-labelledby="past-courses-h">
              <h2 id="past-courses-h" className={MUTED_EYEBROW}>
                Already finished
              </h2>
              <p className="mt-2 fig font-mono text-[15px] text-plate-soft">
                Kept so the run stays on the record
              </p>
              <div className="mt-8 opacity-70">
                {finishedCourses.map((course) => (
                  <CourseRow key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="mt-9" aria-labelledby="coming-h">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
              <div>
                <h2 id="coming-h" className={EYEBROW}>
                  Coming up
                </h2>
                <p className="mt-2 fig font-mono text-[15px] tabular-nums text-plate-soft">
                  {comingWorkshops.length === 0
                    ? "Nothing in the diary"
                    : `${comingWorkshops.length} ${comingWorkshops.length === 1 ? "day" : "days"} · ${comingWorkshops.filter((w) => w.published).length} of them on the site`}
                </p>
              </div>
              <AddButton href="/admin/offerings/workshops/new">
                Put a new workshop in the diary
              </AddButton>
            </div>

            {comingWorkshops.length === 0 ? (
              <div className="pool on-pool mt-8 max-w-[62ch] px-7 py-7">
                <p className="font-display text-[28px] leading-tight text-ink">
                  Nothing in the diary just now
                </p>
                <p className="mt-3 text-[18px] leading-relaxed text-ink">
                  The workshops page on the site says so too, and offers to let
                  people know when the next dates go up. Put a day in and it
                  appears there as soon as you tick it live.
                </p>
              </div>
            ) : (
              <div className="mt-8">
                {comingWorkshops.map((workshop) => (
                  <WorkshopRow key={workshop.id} workshop={workshop} />
                ))}
              </div>
            )}
          </section>

          {/* The count of places sold is the one figure this list wants and
              cannot have. Said once, here, rather than as a dash on every
              row. */}
          <p className="mt-8 max-w-[62ch] fig font-mono text-[15px] leading-relaxed text-plate-soft">
            Each line shows what the room holds. How many places have gone, and
            what has been taken for them, are on the bookings page.
          </p>

          {finishedWorkshops.length > 0 && (
            <section className="mt-20" aria-labelledby="past-h">
              <h2 id="past-h" className={MUTED_EYEBROW}>
                Already happened
              </h2>
              <p className="mt-2 fig font-mono text-[15px] text-plate-soft">
                Kept so the day stays on the record
              </p>
              <div className="mt-8 opacity-70">
                {finishedWorkshops.map((workshop) => (
                  <WorkshopRow key={workshop.id} workshop={workshop} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
