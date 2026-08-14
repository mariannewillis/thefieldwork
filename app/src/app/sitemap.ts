import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { listPublishedWorkshops } from "@/lib/workshops";

/**
 * Only the public pages belong here. The portal is excluded on purpose — a
 * sitemap is an invitation to index, which is the opposite of what /admin
 * wants.
 *
 * The workshops are read from the same query the workshops page itself uses,
 * so the sitemap cannot drift: a workshop she takes off the site leaves both
 * at once. An unpublished one never appears in either.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const workshops = await listPublishedWorkshops();

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
  ];
}
