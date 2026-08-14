import Link from "next/link";
import { formatDayShort, formatMoney, isPast } from "@/lib/format";
import { listAllWorkshops } from "@/lib/workshops";

/**
 * Offerings — the Workshops tab.
 *
 * Ported from docs/screens/workshopflow/admin-offerings.html. What that screen
 * shows and this does not:
 *
 *  · the money taken and the places gone. Both are countable now that bookings
 *    exist — the public pages already print what is left — but every figure
 *    about who has paid belongs on the portal's bookings page, and that is the
 *    next part of the portal to be built. Adding a sold count here first would
 *    put half an answer on the wrong screen. `placesSoldByWorkshop` in
 *    src/lib/bookings.ts is the one query it needs.
 *  · the Services and Courses tabs. They are shown, because the shape of the
 *    section is three kinds, but they are marked not-built rather than linked
 *    to a page that would 404.
 *  · the "already happened" figures. A finished workshop is listed; how many
 *    came is the same bookings question.
 */

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const MUTED_EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft";
const ROW = "border-t border-plate-rule/30 py-9";
const FIGURES = "fig font-mono tabular-nums md:text-right";

type Workshop = Awaited<ReturnType<typeof listAllWorkshops>>[number];

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

        {workshop.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/${workshop.heroImage}-1200.jpg`}
            alt={workshop.heroAlt ?? ""}
            width={140}
            height={175}
            className="aspect-[4/5] w-full max-w-[140px] object-cover"
          />
        ) : (
          <p className="flex aspect-[4/5] w-full max-w-[140px] items-center justify-center border border-plate-rule p-3 text-center fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft">
            No picture yet
          </p>
        )}

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
          <p className="mt-3 flex items-center gap-2 text-[15px] uppercase tracking-[0.14em] md:justify-end">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 ${workshop.published ? "bg-plate-success" : "bg-plate-soft"}`}
            />
            <span
              className={
                workshop.published ? "text-plate-success" : "text-plate-soft"
              }
            >
              {workshop.published ? "Live on the site" : "Not on the site"}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}

export default async function Page() {
  const workshops = await listAllWorkshops();
  const coming = workshops.filter((workshop) => !isPast(workshop.date));
  const finished = workshops
    .filter((workshop) => isPast(workshop.date))
    .reverse();

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

      {/* The three kinds. Only one of them has anything behind it yet, and the
          other two say so rather than leading to a page that isn't there. */}
      <nav
        aria-label="Kinds of offering"
        className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-1 border-b border-plate-rule/40"
      >
        <span
          aria-current="page"
          className="inline-flex min-h-[52px] items-center border-b-2 border-gold fig font-mono text-[18px] uppercase tracking-[0.14em] text-gold"
        >
          Workshops{" "}
          <span className="ml-2 tabular-nums">{workshops.length}</span>
        </span>
        <span className="inline-flex min-h-[52px] items-center border-b-2 border-transparent fig font-mono text-[18px] uppercase tracking-[0.14em] text-plate-soft">
          Services{" "}
          <span className="ml-2 text-[15px] normal-case tracking-normal">
            not built yet
          </span>
        </span>
        <span className="inline-flex min-h-[52px] items-center border-b-2 border-transparent fig font-mono text-[18px] uppercase tracking-[0.14em] text-plate-soft">
          Courses{" "}
          <span className="ml-2 text-[15px] normal-case tracking-normal">
            not built yet
          </span>
        </span>
      </nav>

      <section className="mt-9" aria-labelledby="coming-h">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <div>
            <h2 id="coming-h" className={EYEBROW}>
              Coming up
            </h2>
            <p className="mt-2 fig font-mono text-[15px] tabular-nums text-plate-soft">
              {coming.length === 0
                ? "Nothing in the diary"
                : `${coming.length} ${coming.length === 1 ? "day" : "days"} · ${coming.filter((w) => w.published).length} of them on the site`}
            </p>
          </div>
          <Link
            href="/admin/offerings/workshops/new"
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
            Put a new workshop in the diary
          </Link>
        </div>

        {coming.length === 0 ? (
          <div className="pool on-pool mt-8 max-w-[62ch] px-7 py-7">
            <p className="font-display text-[28px] leading-tight text-ink">
              Nothing in the diary just now
            </p>
            <p className="mt-3 text-[18px] leading-relaxed text-ink">
              The workshops page on the site says so too, and offers to let
              people know when the next dates go up. Put a day in and it appears
              there as soon as you tick it live.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {coming.map((workshop) => (
              <WorkshopRow key={workshop.id} workshop={workshop} />
            ))}
          </div>
        )}
      </section>

      {/* The count of places sold is the one figure this list wants and cannot
          have. Said once, here, rather than as a dash on every row. */}
      <p className="mt-8 max-w-[62ch] fig font-mono text-[15px] leading-relaxed text-plate-soft">
        Each line shows what the room holds. How many places have gone, and what
        has been taken for them, arrive with bookings — which is the next thing
        to be built.
      </p>

      {finished.length > 0 && (
        <section className="mt-20" aria-labelledby="past-h">
          <h2 id="past-h" className={MUTED_EYEBROW}>
            Already happened
          </h2>
          <p className="mt-2 fig font-mono text-[15px] text-plate-soft">
            Kept so the day stays on the record
          </p>
          <div className="mt-8 opacity-70">
            {finished.map((workshop) => (
              <WorkshopRow key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
