import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
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
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [workshops, courses, services] = await Promise.all([
    listPublishedWorkshops(),
    listPublishedCourses(),
    listPublishedServices(),
  ]);

  return [
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
  ];
}
