import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { isHidden, WHOLE_SITE } from "@/lib/site-visibility";

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
export default async function robots(): Promise<MetadataRoute.Robots> {
  /**
   * A SITE THAT IS NOT OPEN YET ASKS NOT TO BE READ (operator, 2026-08-20).
   *
   * While the "coming soon" gate is up, every browsable path answers with one
   * page. Letting a crawler index that means the site's first appearance in a
   * search result is a holding page — and the day she opens, the thing already
   * ranked for her own name is a sentence saying she is not open. Crawlers
   * revisit slowly; a first impression made now is one she lives with.
   *
   * `disallow` rather than `noindex` here because there is nothing to index
   * yet, and no sitemap either: offering a map of pages that all answer with
   * the same holding page is a map of one room drawn eight times.
   */
  if (await isHidden(WHOLE_SITE)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
