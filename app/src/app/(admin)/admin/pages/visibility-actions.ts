"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_PAGES } from "@/content/pages";
import { getSession } from "@/lib/auth/server";
import { setHidden, WHOLE_SITE } from "@/lib/site-visibility";

/**
 * TAKING SOMETHING OFF THE SITE, AND PUTTING IT BACK.
 *
 * Two scales, one action, because they are the same decision: a page, or all of
 * them. The caller says which by sending a page key or the reserved "site".
 *
 * THE KEY IS CHECKED AGAINST THE CATALOGUE rather than trusted. A form posting
 * an arbitrary string would write rows nothing ever reads, and the day one of
 * those strings became a real page key it would take that page off the site
 * with no record of who asked for it.
 */

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
}

export async function setVisibility(formData: FormData): Promise<void> {
  await requireSession();

  const key = String(formData.get("key") ?? "");
  const hidden = String(formData.get("hidden")) === "true";

  const known =
    key === WHOLE_SITE || SITE_PAGES.some((page) => page.key === key);
  if (!known) return;

  await setHidden(key, hidden);

  // The panel, and the site itself — the whole site's switch changes every
  // page a visitor can reach, so nothing cached may survive it.
  revalidatePath("/admin/pages");
  revalidatePath("/", "layout");
}
