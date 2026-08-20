import "server-only";
import { CONTACT_EMAIL } from "@/content/contact";
import { CANONICAL_SITE_URL, siteFooter } from "@/content/site";

/**
 * STRUCTURED DATA — what a machine reads when it reads this site.
 *
 * ── WHY THIS AND NOT SOMETHING ELSE ──────────────────────────────────────
 *
 * Researched 2026-08-20. Of everything sold as "AI SEO", JSON-LD is the part
 * with evidence behind it: it is the format Google, Bing, Perplexity and
 * ChatGPT all extract structured signals from, and `Event` in particular has a
 * high citation rate for the time-sensitive questions people actually ask an
 * assistant — "is there an aura healing workshop in Frome this month". A page
 * with prose alone makes an assistant guess the date out of a sentence; a page
 * with an `Event` hands it the date, the place, the price and whether there are
 * places left.
 *
 * `llms.txt` is the other half of the ask and is handled separately, honestly:
 * see `app/llms.txt/route.ts` for why it is here and what it is not.
 *
 * ── EVERY CLAIM IS ONE THE SITE ALREADY MAKES ────────────────────────────
 *
 * Structured data is the easiest place in a codebase to tell a lie, because
 * nobody reads it. So:
 *
 *   NO `aggregateRating`. She has no reviews. A rating nobody left is the
 *   single most common piece of schema fraud and it is a fabricated fact about
 *   a real person's practice.
 *
 *   NO medical typing. `LocalBusiness` and not `MedicalBusiness` or
 *   `HealthAndBeautyBusiness`: the site's own compliance line says this is
 *   complementary work that treats, cures, diagnoses and prevents nothing, and
 *   a schema type is a claim in exactly the way that sentence exists to avoid.
 *
 *   NOTHING IS RESTATED. Every value below is read from the same row the page
 *   renders from — the price a person sees IS `offers.price`. Two sources for
 *   one number is how a site comes to advertise a price it no longer charges.
 *
 * ── AND NOTHING HIDDEN IS DESCRIBED ──────────────────────────────────────
 *
 * These are called from pages that only render when the thing is published, so
 * a workshop she has taken down emits nothing. The whole-site "coming soon"
 * gate is upstream of all of it, and `robots.ts` turns to Disallow while it is
 * up — a holding page with rich structured data on it is worse than one
 * without, because it is a machine-readable claim to be open.
 */

type Json = Record<string, unknown>;

/** The practice itself. The `@id` every other object points back at. */
export const PRACTICE_ID = `${CANONICAL_SITE_URL}/#practice`;

export function practice(): Json {
  return {
    "@type": "LocalBusiness",
    "@id": PRACTICE_ID,
    name: "The Field Work",
    url: CANONICAL_SITE_URL,
    email: CONTACT_EMAIL,
    // NAP consistency is the thing local search actually rewards, and the one
    // place this site states its own is the footer — so it is read from there
    // rather than typed again here.
    address: {
      "@type": "PostalAddress",
      addressLocality: "Frome",
      addressRegion: "Somerset",
      addressCountry: "GB",
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Somerset",
    },
    description:
      "Aura healing with Marianne, in one room in Frome. You keep your clothes on, nobody touches you, and nothing is asked of your beliefs.",
    // The compliance sentence, in the machine-readable copy as well as on the
    // page. If a machine is going to quote this practice, it should have the
    // same caveat attached that a person reading the footer gets.
    disambiguatingDescription: siteFooter.legal,
    knowsAbout: ["Aura healing", "Energy work", "Complementary therapy"],
    logo: `${CANONICAL_SITE_URL}/brand/logo-horizontal.svg`,
  };
}

/** The site itself, on the home page only. */
export function website(): Json {
  return {
    "@type": "WebSite",
    "@id": `${CANONICAL_SITE_URL}/#website`,
    url: CANONICAL_SITE_URL,
    name: "The Field Work",
    publisher: { "@id": PRACTICE_ID },
    inLanguage: "en-GB",
  };
}

type Place = {
  venueName: string | null;
  addressLines: string | null;
  postcode: string | null;
};

/** Where something happens, when it happens somewhere with an address. */
function location(place: Place): Json | undefined {
  if (!place.venueName) return undefined;
  const lines = (place.addressLines ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    "@type": "Place",
    name: place.venueName,
    address: {
      "@type": "PostalAddress",
      streetAddress: lines[0] ?? undefined,
      addressLocality: lines[1] ?? undefined,
      addressRegion: lines[2] ?? undefined,
      postalCode: place.postcode ?? undefined,
      addressCountry: "GB",
    },
  };
}

/**
 * The offer on a dated thing.
 *
 * `availability` is READ FROM THE COUNT rather than assumed, so a sold-out
 * workshop says so to a machine at the same moment it says so to a person. An
 * `InStock` on a full room is the version of this that gets somebody to drive
 * to Frome for nothing.
 */
function offer(url: string, pence: number, left: number | null): Json {
  return {
    "@type": "Offer",
    url,
    price: (pence / 100).toFixed(2),
    priceCurrency: "GBP",
    availability:
      left === null || left > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
  };
}

export type WorkshopFacts = {
  slug: string;
  name: string;
  summary: string;
  /** The day, and the two times as "HH:MM". */
  date: Date;
  startTime: string;
  endTime: string;
  priceGBP: number;
  placesLeft: number | null;
  heroImage: string | null;
  venueName: string | null;
  addressLines: string | null;
  postcode: string | null;
};

export function workshopEvent(workshop: WorkshopFacts): Json {
  const url = `${CANONICAL_SITE_URL}/workshops/${workshop.slug}`;
  return {
    "@type": "Event",
    "@id": `${url}#event`,
    name: workshop.name,
    description: workshop.summary,
    url,
    // LOCAL TIME WITH AN OFFSET-FREE STRING, which is what schema.org asks for
    // on an event that happens in a place: the place carries the timezone, and
    // a UTC instant here would put a 10am workshop at 9am for half the year.
    startDate: `${dayKey(workshop.date)}T${workshop.startTime}`,
    endDate: `${dayKey(workshop.date)}T${workshop.endTime}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: location(workshop),
    organizer: { "@id": PRACTICE_ID },
    performer: { "@id": PRACTICE_ID },
    image: workshop.heroImage
      ? [`${CANONICAL_SITE_URL}/media/${workshop.heroImage}-1200.jpg`]
      : undefined,
    offers: offer(url, workshop.priceGBP, workshop.placesLeft),
    isAccessibleForFree: false,
    inLanguage: "en-GB",
  };
}

export type CourseFacts = {
  slug: string;
  name: string;
  summary: string;
  priceGBP: number;
  placesLeft: number | null;
  heroImage: string | null;
  venueName: string | null;
  addressLines: string | null;
  postcode: string | null;
  sessions: { date: Date; startTime: string; endTime: string }[];
};

/**
 * A course is a `Course` with an `EventSchedule`-shaped run of instances.
 *
 * `Course` + `CourseInstance` rather than a bag of `Event`s, because a run of
 * six evenings is ONE thing somebody signs up to — there is no way to buy one
 * date of it, and describing six separate events would advertise six things
 * that cannot be bought.
 */
export function courseObject(course: CourseFacts): Json {
  const url = `${CANONICAL_SITE_URL}/courses/${course.slug}`;
  const first = course.sessions[0];
  const last = course.sessions[course.sessions.length - 1];

  return {
    "@type": "Course",
    "@id": `${url}#course`,
    name: course.name,
    description: course.summary,
    url,
    provider: { "@id": PRACTICE_ID },
    image: course.heroImage
      ? [`${CANONICAL_SITE_URL}/media/${course.heroImage}-1200.jpg`]
      : undefined,
    inLanguage: "en-GB",
    offers: offer(url, course.priceGBP, course.placesLeft),
    hasCourseInstance: first
      ? {
          "@type": "CourseInstance",
          courseMode: "https://schema.org/OfflineEventAttendanceMode",
          location: location(course),
          startDate: `${dayKey(first.date)}T${first.startTime}`,
          endDate: `${dayKey(last.date)}T${last.endTime}`,
          courseWorkload: `${course.sessions.length} sessions`,
        }
      : undefined,
  };
}

export type ServiceFacts = {
  slug: string;
  name: string;
  summary: string;
  priceGBP: number;
  durationMinutes: number;
  heroImage: string | null;
};

/**
 * A one-to-one hour is a `Service`, not an `Event`.
 *
 * It has no date — it is arranged — so an `Event` would need a `startDate` it
 * does not have, and inventing one is the difference between describing a thing
 * and making it up.
 */
export function serviceObject(service: ServiceFacts): Json {
  const url = `${CANONICAL_SITE_URL}/services/${service.slug}`;
  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.name,
    description: service.summary,
    url,
    provider: { "@id": PRACTICE_ID },
    areaServed: { "@type": "AdministrativeArea", name: "Somerset" },
    serviceType: "Aura healing",
    image: service.heroImage
      ? [`${CANONICAL_SITE_URL}/media/${service.heroImage}-1200.jpg`]
      : undefined,
    // ISO 8601 duration — "PT90M". The page says "1 hour 30 minutes"; this is
    // the same number in the form a machine parses.
    termsOfService: `${CANONICAL_SITE_URL}/privacy`,
    offers: {
      "@type": "Offer",
      url,
      price: (service.priceGBP / 100).toFixed(2),
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
    hoursAvailable: undefined,
    additionalProperty: {
      "@type": "PropertyValue",
      name: "Duration",
      value: `PT${service.durationMinutes}M`,
    },
  };
}

/**
 * The trail to this page, which is what an assistant uses to say where
 * something sits on a site rather than quoting a bare URL.
 */
export function breadcrumbs(trail: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${CANONICAL_SITE_URL}${step.path}`,
    })),
  };
}

/** An index page's list, in the order it is drawn. */
export function itemList(name: string, urls: string[]): Json {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url,
    })),
  };
}

/**
 * ONE GRAPH PER PAGE, not a script per object.
 *
 * `@graph` lets every object on a page cross-reference by `@id` — the event
 * points at the practice that runs it, and the practice is described once. Six
 * separate scripts would repeat the practice six times and give a parser six
 * chances to decide they are six different businesses.
 */
export function graph(...objects: (Json | undefined)[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": objects.filter(Boolean),
  });
}

/** `2026-08-27`, in her timezone, from a date-only column. */
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
