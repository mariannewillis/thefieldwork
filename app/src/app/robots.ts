import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

/**
 * NOTE: /admin is deliberately NOT disallowed here.
 *
 * The instinct is to add `disallow: "/admin"`, and it would be wrong twice
 * over. robots.txt is a public file, so a Disallow line advertises the exact
 * path you were trying to keep quiet. Worse, it stops crawlers FETCHING the
 * page — which means they never see the `noindex` we set in the admin layout,
 * and Google can still list a bare URL it was told not to read.
 *
 * `noindex` on the page is what actually keeps the portal out of results, and
 * it only works if the crawler is allowed to look. Access control is the job
 * of authentication, not of a text file asking politely.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
