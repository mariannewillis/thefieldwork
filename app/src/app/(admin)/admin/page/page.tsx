import { permanentRedirect } from "next/navigation";

/**
 * The home page's editor moved when the pages panel landed (D-34).
 *
 * A redirect rather than a deletion: this is where the rail pointed for two
 * weeks, so it is in her history and possibly in a bookmark. Permanent, because
 * it is not coming back — `/admin/pages` lists every page on the site and the
 * home page is one entry in it.
 */
export default function RetiredHomePageEditor() {
  permanentRedirect("/admin/pages");
}
