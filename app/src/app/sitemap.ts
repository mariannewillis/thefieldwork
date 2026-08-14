import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { listPublishedCourses } from "@/lib/courses";
import { listPublishedWorkshops } from "@/lib/workshops";

/**
 * Only the public pages belong here. The portal is excluded on purpose — a
 * sitemap is an invitation to index, which is the opposite of what /admin
 * wants.
 *
 * The workshops and courses are read from the same queries their own pages
 * use, so the sitemap cannot drift: one she takes off the site leaves both at
 * once. An unpublished one never appears in either.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [workshops, courses] = await Promise.all([
    listPublishedWorkshops(),
    listPublishedCourses(),
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
  ];
}
