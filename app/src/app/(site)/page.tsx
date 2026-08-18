import HomeBody from "@/components/site/HomeBody";
import { home } from "@/content/home";
import { homeLedger } from "@/lib/pages/home-ledger";
import { HOME, readPage } from "@/lib/pages/read";
import "./home.css";
import "./sections.css";

/**
 * The home page — read from the LIVE copy of its content and composed by
 * `HomeBody`, which is the same component the editor renders behind the admin
 * session (D-34). What is left here is the one thing only the public page does:
 * choosing the live copy.
 *
 * Ported from `docs/screens/webapp/home.html`, the gate-4 approved composition;
 * the CSS is that file's stylesheet verbatim (`home.css`), plus `sections.css`
 * for the bands she adds herself.
 */

export default async function HomePage() {
  const [page, rowsByLabel] = await Promise.all([
    readPage(HOME, "live"),
    homeLedger(),
  ]);

  return (
    <HomeBody
      page={page}
      rowsByLabel={rowsByLabel}
      groups={home.schedule.groups}
    />
  );
}
