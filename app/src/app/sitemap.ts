import type { MetadataRoute } from "next";
import { SITE_PAGES } from "@/content/pages";
import { SITE_URL } from "@/content/site";
import { hiddenKeys } from "@/lib/site-visibility";
import { listPublishedCourses } from "@/lib/courses";
import { listPublishedServices } from "@/lib/services";
import { listPublishedWorkshops } from "@/lib/workshops";

/**
 * Only the public pages belong here. The portal is excluded on purpose — a
 * sitemap is an invitation to index, which is the opposite of what /admin
 * wants.
 *
 * All three kinds are read from the same queries their own pages use, so the
 * sitemap cannot drift: one she takes off the site leaves both at once. An
 * unpublished one never appears in either.
 */
/**
 * REBUILT HOURLY, NOT FROZEN AT BUILD (2026-08-21, found while preparing the
 * deploy).
 *
 * Next prerendered this, which would have meant the map listed exactly the
 * workshops, courses and services that existed on the day the site was
 * published — and nothing she added afterwards would have been in it until
 * somebody redeployed. A sitemap that never learns about new pages is worse
 * than no sitemap, because it is the file a crawler trusts to be current.
 *
 * An hour rather than every request: this is four queries, and no crawler needs
 * a map that is sixty seconds old. `robots.ts` is force-dynamic instead,
 * because the whole-site switch has to reach it at once.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [workshops, courses, services, hidden] = await Promise.all([
    listPublishedWorkshops(),
    listPublishedCourses(),
    listPublishedServices(),
    hiddenKeys(),
  ]);

  /**
   * A PAGE SHE HAS TAKEN OFF IS NOT IN THE MAP (operator, 2026-08-20).
   *
   * A hidden page answers 404, so listing it invites a crawler to fetch
   * something that is not there — and a sitemap full of 404s is the signal that
   * teaches a crawler to trust the rest of it less.
   *
   * The whole-site switch is handled in `robots.ts` instead: there is nothing
   * to map while every path answers with the same holding page, so it asks not
   * to be crawled at all rather than offering an empty map.
   *
   * The three record-backed sections drop their CHILDREN with them. Hiding
   * Workshops hides `/workshops/whatever` too — the layout enforces that, and a
   * map that disagreed with the layout would be a second opinion about what is
   * on the site.
   */
  const off = (href: string) => {
    const page = SITE_PAGES.find((entry) => entry.href === href);
    return page ? hidden.has(page.key) : false;
  };

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/workshops`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...workshops.map((workshop) => ({
      url: `${SITE_URL}/workshops/${workshop.slug}`,
      lastModified: workshop.updatedAt,
      // A workshop's page changes until the day, and then never again.
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...courses.map((course) => ({
      url: `${SITE_URL}/courses/${course.slug}`,
      lastModified: course.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...services.map((service) => ({
      url: `${SITE_URL}/services/${service.slug}`,
      lastModified: service.updatedAt,
      // A standing offer rather than something in the diary: it changes when
      // she rewrites it and not otherwise, so it is not crawled weekly the way
      // a dated page is.
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    /**
     * The pages with no records behind them. They are last rather than beside
     * the indexes because they sell nothing — somebody arriving from a search
     * for aura healing wants a date, and these are what they read once they
     * have found one.
     *
     * /privacy JOINS THEM (2026-08-17). It was deliberately absent while it did
     * not exist, on the note that a sitemap is a list of pages rather than a
     * list of intentions; it is a page now. Lowest priority of the three and
     * for the plainest reason — nobody searches for it, and everybody who wants
     * it arrives from the footer or from the contact form.
     */
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      // It changes when what the site DOES with people's details changes, which
      // is a code change rather than a content edit. Yearly is the honest guess.
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Matched by PREFIX so a section takes its own pages with it, exactly as the
  // layout does when it decides what answers.
  return entries.filter((entry) => {
    const path = entry.url.slice(SITE_URL.length) || "/";
    if (path === "/") return !off("/");
    const section = `/${path.split("/")[1]}`;
    return !off(section);
  });
}
