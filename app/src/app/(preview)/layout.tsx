import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";

/**
 * THE EDITOR'S PREVIEW FRAME — the site's own world, with no portal around it.
 *
 * This route group exists for one reason: D-8. Tailwind is scoped to the portal
 * and the public site stays bespoke, and the pages editor is the one screen
 * that has to show both at once. Loading `home.css` into the admin layout would
 * put the site's `:root` variables and its bare-element rules (`p { margin: 0 }`
 * and the rest) underneath every admin screen in the app — so the page she is
 * editing is rendered HERE instead, in its own document, and the editor embeds
 * it in an iframe. The two stylesheets never meet.
 *
 * It is also the more honest preview. The page is laid out against a real
 * viewport width at real type sizes, so what she is looking at is not an
 * approximation of the site — it IS the site, drawn from the draft.
 *
 * BEHIND THE SAME GATE AS EVERYTHING ELSE. The path starts `/admin`, so the
 * middleware turns away anyone without a valid session before this renders; the
 * check below is the second gate, exactly as the admin layout is (see the note
 * on `src/middleware.ts` — neither alone is the whole answer).
 */
export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <>{children}</>;
}
