import { redirect } from "next/navigation";

/**
 * Documents moved into the library.
 *
 * There were two rail entries and one job. Pictures and Documents are now the
 * Media screen's tabs, alongside Videos, because "find the thing, know what it
 * is, know where it is used" is the same errand whichever of the three she is
 * looking for — and a second screen would have meant a second answer to "where
 * is this used".
 *
 * A REDIRECT RATHER THAN A DELETED ROUTE. This address may be in her browser
 * history or bookmarked; landing on a 404 would read as the portal having lost
 * her paperwork. `redirect` in a server component is permanent enough for that
 * and costs nothing.
 */
export default function Page() {
  redirect("/admin/media?tab=documents");
}
