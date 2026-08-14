// Minimal static server for previewing the screen mockups.
//
// `python -m http.server` was resetting connections on this machine for
// anything over a few hundred KB, which made screenshots unreliable and looked
// like page defects (it isn't — the pages are fine). This serves the project
// root so the screens' `../../../assets/...` paths resolve.
//
//   node docs/screens/_serve.mjs [port]        # run from the project root
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = Number(process.argv[2] || 8901);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

/* ── routes ───────────────────────────────────────────────────────────────────
   The screens link to real site paths (`/workshops/reading-the-field`), not to
   each other's filenames, because that is what the built app will serve. So the
   preview maps those paths onto the mockups and the whole set becomes
   clickable — public site and admin both.

   A regex wins over a literal; first match wins. */
const S = "docs/screens";

/* ── routes that have been BUILT ──────────────────────────────────────────────
   Once a screen exists in the real app, serving its mockup at the same path is
   a trap: the two look alike, the app is on :3000 and the mockup on :8902, and
   changes made to one appear to have vanished when you reload the other. It
   cost an afternoon.

   So these paths 302 to the running app instead of rendering the stale HTML.
   The mockups are still on disk and still the design record — they are just no
   longer reachable at the address their built version now owns. Add a pattern
   here as each further screen lands. */
const APP_ORIGIN = process.env.TFW_APP_ORIGIN ?? "http://localhost:3000";
const BUILT = [
  /^\/workshops\/?$/,
  /^\/workshops\/[^/]+\/?$/,
  /^\/admin\/offerings(\/.*)?$/,
];

const ROUTES = [
  // ── public site ──
  [/^\/$/, `${S}/webapp/home.html`],
  [/^\/workshops\/?$/, `${S}/webapp/workshops-index.html`],
  [/^\/workshops\/[^/]+\/?$/, `${S}/webapp/workshop-detail.html`],
  [/^\/services\/?$/, `${S}/webapp/services-index.html`],
  [/^\/services\/[^/]+\/?$/, `${S}/webapp/service-detail.html`],
  [/^\/courses\/?$/, `${S}/webapp/courses-index.html`],
  [/^\/courses\/[^/]+\/?$/, `${S}/webapp/course-detail.html`],
  [/^\/about\/?$/, `${S}/webapp/about.html`],
  [/^\/contact\/?$/, `${S}/webapp/contact.html`],
  [/^\/subscribe\/?$/, `${S}/webapp/subscribe.html`],
  [/^\/privacy\/?$/, `${S}/webapp/privacy-notice.html`],
  [/^\/book\/[^/]+\/?$/, `${S}/workshopflow/workshop-detail-purchase.html`],
  [/^\/cancel\/[^/]+\/?$/, `${S}/workshopflow/cancel-refund-landing.html`],

  // ── admin · the workshop-flow screens win over the older equivalents ──
  [/^\/admin\/?$/, `${S}/admin/admin-dashboard.html`],
  [
    /^\/admin\/offerings\/workshops\/new\/?$/,
    `${S}/workshopflow/admin-workshop-detail.html`,
  ],
  [
    /^\/admin\/offerings\/workshops\/[^/]+\/attendees\/?$/,
    `${S}/workshopflow/admin-workshop-attendees.html`,
  ],
  [
    /^\/admin\/offerings\/workshops\/[^/]+\/?$/,
    `${S}/workshopflow/admin-workshop-detail.html`,
  ],
  [
    /^\/admin\/offerings\/workshops\/?$/,
    `${S}/workshopflow/admin-offerings.html`,
  ],
  [/^\/admin\/offerings\/?$/, `${S}/workshopflow/admin-offerings.html`],
  [
    /^\/admin\/offerings\/[^/]+\/new\/?$/,
    `${S}/admin/admin-offering-edit.html`,
  ],
  [
    /^\/admin\/workshop-bookings\/?$/,
    `${S}/workshopflow/admin-workshop-bookings.html`,
  ],
  [/^\/admin\/bookings\/?$/, `${S}/admin/admin-bookings.html`],
  [/^\/admin\/calendar\/?$/, `${S}/admin/admin-calendar.html`],
  [/^\/admin\/availability\/?$/, `${S}/admin/admin-availability.html`],
  [/^\/admin\/page\/?$/, `${S}/admin/admin-landing-sections.html`],
  [/^\/admin\/media\/?$/, `${S}/admin/admin-media.html`],
  [/^\/admin\/newsletters\/?$/, `${S}/admin/admin-newsletters.html`],
  [/^\/admin\/subscribers\/?$/, `${S}/admin/admin-subscribers.html`],
  [/^\/admin\/documents\/?$/, `${S}/admin/admin-documents.html`],
  [/^\/admin\/settings\/?$/, `${S}/admin/admin-settings.html`],
  [/^\/admin\/login\/?$/, `${S}/admin/admin-login.html`],
];

function route(url) {
  for (const [re, target] of ROUTES) if (re.test(url)) return target;
  return null;
}

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0].split("#")[0]);

  // Built screens belong to the app, not to this preview. 302 rather than 301:
  // a permanent redirect would stick in the browser cache long after the app
  // stopped running, and then the mockup would be unreachable with no clue why.
  if (BUILT.some((re) => re.test(url))) {
    res.writeHead(302, {
      location: APP_ORIGIN + req.url,
      "cache-control": "no-store",
    });
    return res.end(
      `This screen is built. It lives in the app at ${APP_ORIGIN}${req.url}`,
    );
  }

  const mapped = route(url);
  const path = mapped
    ? join(ROOT, mapped)
    : join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ""));
  let st;
  try {
    st = statSync(path);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("not found");
  }
  if (st.isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("directory");
  }
  res.writeHead(200, {
    "content-type":
      TYPES[extname(path).toLowerCase()] || "application/octet-stream",
    "content-length": st.size,
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
  });
  createReadStream(path).pipe(res);
}).listen(PORT, () =>
  console.log(`serving ${ROOT} on http://localhost:${PORT}`),
);
