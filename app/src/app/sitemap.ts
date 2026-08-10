import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

/**
 * Only the public pages belong here. The portal is excluded on purpose — a
 * sitemap is an invitation to index, which is the opposite of what /admin
 * wants.
 *
 * This lists the one page that exists today. It grows as the site does; when
 * offerings become real pages they are generated from the same source the
 * pages are, so the sitemap cannot drift out of date by hand.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
