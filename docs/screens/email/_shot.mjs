/* Render every template and look at it.
 *
 * Three shots each, because an email has three states worth defending:
 *
 *   <name>-600.png            desktop preview pane, images loaded
 *   <name>-375.png            a phone, images loaded
 *   <name>-600-images-off.png images blocked — which is Outlook's default,
 *                             and every corporate mail client that asks
 *                             "download pictures?" before it draws anything
 *
 * The templates' src attributes are ABSOLUTE against https://thefieldwork.co.uk
 * because that is what they must be in an inbox. The site is not deployed, so
 * the images-on runs intercept that origin and fulfil it from the repo. The
 * images-off run simply does not install the route, which makes it a real
 * images-off render rather than a simulated one.
 *
 *   node docs/screens/email/_shot.mjs        # from the project root
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const SHOTS = join(HERE, "shots");
mkdirSync(SHOTS, { recursive: true });

const FILES = [
  "newsletter",
  "booking-confirmation",
  "session-request-received",
  "session-approved",
  "balance-due",
  "cancelled-refunded",
];

/** https://thefieldwork.co.uk/<path> → a file in this repo. */
function localFor(urlPath) {
  if (urlPath.startsWith("/brand/"))
    return join(HERE, "assets", urlPath.slice(7));
  if (urlPath.startsWith("/media/"))
    return join(ROOT, "app", "public", urlPath);
  return null;
}

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const browser = await chromium.launch();

for (const name of FILES) {
  const url = pathToFileURL(join(HERE, `${name}.html`)).href;

  for (const [tag, width, images] of [
    ["600", 600, true],
    ["375", 375, true],
    ["600-images-off", 600, false],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 2,
    });
    if (images) {
      await page.route("https://thefieldwork.co.uk/**", async (route) => {
        const p = localFor(new URL(route.request().url()).pathname);
        try {
          if (!p) throw new Error("no mapping");
          await route.fulfill({
            status: 200,
            contentType:
              MIME[extname(p).toLowerCase()] ?? "application/octet-stream",
            body: readFileSync(p),
          });
        } catch {
          await route.abort();
        }
      });
    } else {
      await page.route("https://thefieldwork.co.uk/**", (route) =>
        route.abort(),
      );
    }
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: join(SHOTS, `${name}-${tag}.png`),
      fullPage: true,
    });
    console.log(`${name}-${tag}.png`);
    await page.close();
  }
}

// The contact sheet, for the record.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(pathToFileURL(join(HERE, "index.html")).href, {
  waitUntil: "load",
});
await page.screenshot({ path: join(SHOTS, "index-1440.png"), fullPage: true });
console.log("index-1440.png");
await page.close();

await browser.close();
