import {
  Azeret_Mono,
  Cormorant_Garamond,
  Source_Sans_3,
} from "next/font/google";
import "./workshops.css";

/**
 * The workshops pages' own shell.
 *
 * It exists for two reasons, both of them boundaries rather than layout:
 *
 *  1. `workshops.css` is imported HERE and nowhere else, so Next emits it as a
 *     route-scoped chunk that never loads beside the home page's bespoke
 *     `home.css`. Both define `.pool`, and Tailwind's preflight would reset
 *     margins home.css depends on (DECISIONS-BUILD.md D-8).
 *
 *  2. The mono face. Times, prices and place counts are content on these pages
 *     and are set in Azeret with tabular figures; the home page has no numbers
 *     on it, which is why the root layout does not load it.
 *
 * The variables are `--ws-*` rather than the site's `--font-display` /
 * `--font-body` for the same reason the portal's are `--admin-*`: two type
 * systems that cannot shadow one another. next/font de-duplicates the
 * underlying files, so declaring Cormorant a second time costs nothing.
 */

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--ws-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--ws-body",
  display: "swap",
});

const mono = Azeret_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ws-mono",
  display: "swap",
});

export default function WorkshopsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // No background on this wrapper. The page photograph is fixed at z-index
    // -2 behind everything, and an opaque element here would paint over it —
    // the ground colour lives on <html> in workshops.css for that reason.
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} font-body text-plate-text`}
    >
      {children}
    </div>
  );
}
