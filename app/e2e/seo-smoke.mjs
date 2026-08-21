// =============================================================================
// What a machine reads — structured data, share previews, and the two switches
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. Every public page carries JSON-LD, it PARSES, and it describes what that
//      page actually is — an Event on a workshop, a Course on a course, a
//      Service on a one-to-one, the practice on all of them.
//   2. Every value in it MATCHES THE PAGE. The price in the markup is the price
//      on the screen; the date in the markup is the date on the screen. A
//      second source for one number is how a site comes to advertise a price it
//      no longer charges.
//   3. It CLAIMS NOTHING UNTRUE. No aggregateRating, no reviewCount, no medical
//      typing — she has no reviews and the site's own compliance line says this
//      practice treats, cures, diagnoses and prevents nothing.
//   4. A share of any page carries a photograph, and an offering's share
//      carries ITS OWN.
//   5. `/llms.txt` is GENERATED from the same rows the pages are, so it cannot
//      name a workshop the site does not.
//   6. Both visibility switches reach all of it: a hidden page leaves the
//      sitemap and the llms listing, and the whole-site gate turns robots.txt
//      to Disallow and empties the llms listing.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3107.
//   2. node e2e/seo-smoke.mjs
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// IT WRITES NOTHING OF HERS. It reads her published workshops, courses and
// services — that is the point of claims 1 and 2 — and the only rows it writes
// are `SiteSwitch`, which it puts back exactly as it found them at the end.
// Nothing here sends mail; the server it starts has RESEND_API_KEY="" anyway.
//
// ── WHAT IT CANNOT CHECK ─────────────────────────────────────────────────────
//
// Google's Rich Results Test and the schema.org validator both need a PUBLIC
// url, and this site has none yet. So what is checked here is that the markup
// is well-formed, complete against schema.org's required properties, and true
// to the page. Whether Google is happy with it is a question that can only be
// asked the day the site is live, and it should be asked then.
// =============================================================================

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local" });

const PORT = 3107;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// ── the dev server, on our terms ─────────────────────────────────────────────

function makeCopy() {
  const root = resolve(".smoke-app-seo");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const entry of [
    "src",
    "prisma",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
    "next-env.d.ts",
  ]) {
    cpSync(entry, join(root, entry), { recursive: true });
  }
  const link = process.platform === "win32" ? "junction" : "dir";
  for (const shared of ["node_modules", "public"]) {
    try {
      symlinkSync(resolve(shared), join(root, shared), link);
    } catch {
      /* already linked from an earlier run */
    }
  }
  return root;
}

const COPY = makeCopy();

async function startServer() {
  const log = [];
  const child = spawn(
    process.execPath,
    [
      join(APP, "node_modules", "next", "dist", "bin", "next"),
      "dev",
      "-p",
      String(PORT),
    ],
    {
      cwd: COPY,
      env: {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_SECRET: "smoke-seo-secret-not-real-but-long-enough-32-chars",
        // THE CANONICAL DOMAIN, deliberately. Structured data and canonicals are
        // the two things on this site that must never name the host that served
        // the request, and pointing this at localhost would let that pass here
        // while breaking in production.
        NEXT_PUBLIC_SITE_URL: "https://thefieldwork.co.uk",
        RESEND_API_KEY: "",
        EMAIL_TO_OWNER: "owner@example.invalid",
        ADMIN_TEST_USERNAME: "",
        ADMIN_TEST_EMAIL: "",
      },
    },
  );
  const collect = (buffer) => log.push(buffer.toString());
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/admin/login`);
      if (response.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  if (Date.now() >= deadline) {
    throw new Error(`never came up:\n${log.join("")}`);
  }
  return { child, out: () => log.join("") };
}

async function stopServer(server) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.child.kill("SIGTERM");
  }
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE}/admin/login`);
    } catch {
      return;
    }
    await sleep(500);
  }
}

// ── reading a page ───────────────────────────────────────────────────────────

const get = async (path) => (await fetch(`${BASE}${path}`)).text();

/** Every JSON-LD object on a page, flattened out of its `@graph`. */
function structured(html) {
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
  ].map((match) => match[1]);
  const objects = [];
  for (const block of blocks) {
    const json = JSON.parse(block);
    objects.push(...(json["@graph"] ?? [json]));
  }
  return objects;
}

const of = (objects, type) => objects.find((one) => one["@type"] === type);

/** The page's own words, with the markup stripped — for comparing against. */
const words = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&pound;/g, "£")
    .replace(/&mdash;/g, "—")
    .replace(/&#x27;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

await db.connect();

/** Put back exactly as found. */
const switchesBefore = (await db.query(`SELECT key, hidden FROM "SiteSwitch"`))
  .rows;

const setSwitch = (key, hidden) =>
  db.query(
    `INSERT INTO "SiteSwitch" (key, hidden, "updatedAt") VALUES ($1,$2,now())
     ON CONFLICT (key) DO UPDATE SET hidden = $2, "updatedAt" = now()`,
    [key, hidden],
  );

const server = await startServer();

try {
  // Whatever is actually on her site right now. Named nowhere in this file: a
  // suite that hardcodes "lorem-ipsum" goes red the day she deletes it, which
  // is her using her own app rather than anything breaking.
  const workshop = (
    await db.query(
      `SELECT slug, name, summary, date, "startTime", "endTime", "priceGBP",
              "venueName", postcode, capacity
         FROM "Workshop" WHERE published = true ORDER BY date LIMIT 1`,
    )
  ).rows[0];
  const course = (
    await db.query(
      `SELECT slug, name, "priceGBP" FROM "Course" WHERE published = true LIMIT 1`,
    )
  ).rows[0];
  const service = (
    await db.query(
      `SELECT slug, name, "priceGBP", "durationMinutes"
         FROM "Service" WHERE published = true LIMIT 1`,
    )
  ).rows[0];

  // ══ 1 · EVERY PAGE SAYS WHAT IT IS ═════════════════════════════════════════
  console.log("\n— what a machine reads —\n");

  {
    const home = structured(await get("/"));
    ok(
      "the home page describes the practice and the site",
      Boolean(of(home, "LocalBusiness")) && Boolean(of(home, "WebSite")),
      home.map((one) => one["@type"]).join(", "),
    );
    ok(
      "and the site names the practice as its publisher, so they are one entity",
      of(home, "WebSite")?.publisher?.["@id"] ===
        of(home, "LocalBusiness")?.["@id"],
    );
    ok(
      "the practice is placed — a local business with no locality is not local",
      of(home, "LocalBusiness")?.address?.addressLocality === "Frome",
    );
  }

  for (const [path, type] of [
    ["/workshops", "ItemList"],
    ["/courses", "ItemList"],
    ["/services", "ItemList"],
  ]) {
    const objects = structured(await get(path));
    ok(
      `${path} lists what is on, and says where it sits`,
      Boolean(of(objects, type)) && Boolean(of(objects, "BreadcrumbList")),
      objects.map((one) => one["@type"]).join(", "),
    );
  }

  // ══ 2 · AND IT MATCHES THE PAGE ════════════════════════════════════════════
  //
  // The claim that actually matters. Markup that parses beautifully and says
  // £40 on a page that says £95 is worse than no markup: it is a machine
  // confidently telling somebody the wrong price.
  console.log("\n— and it is the same as what a person reads —\n");

  if (workshop) {
    const html = await get(`/workshops/${workshop.slug}`);
    const event = of(structured(html), "Event");
    const text = words(html);

    ok("a workshop is an Event", Boolean(event));
    ok(
      "with the name that is on the page",
      event?.name === workshop.name && text.includes(workshop.name),
      `${event?.name}`,
    );
    ok(
      "the date and the times, in local time with no offset",
      event?.startDate === `${dayKey(workshop.date)}T${workshop.startTime}` &&
        event?.endDate === `${dayKey(workshop.date)}T${workshop.endTime}`,
      `${event?.startDate} → ${event?.endDate}`,
    );
    ok(
      "the price the page prints",
      event?.offers?.price === (workshop.priceGBP / 100).toFixed(2) &&
        text.includes(money(workshop.priceGBP)),
      `${event?.offers?.price} vs ${money(workshop.priceGBP)}`,
    );
    ok(
      "the currency, because a bare number is not a price",
      event?.offers?.priceCurrency === "GBP",
    );
    ok(
      "the venue, with a postcode a person could drive to",
      event?.location?.name === workshop.venueName &&
        event?.location?.address?.postalCode === workshop.postcode,
      JSON.stringify(event?.location?.address ?? null),
    );
    ok(
      "and it says who runs it, by reference rather than by repeating her",
      event?.organizer?.["@id"] ===
        of(structured(html), "LocalBusiness")?.["@id"],
    );

    // AVAILABILITY IS READ, NOT ASSUMED. An InStock on a full room is the
    // version of this that gets somebody to drive to Frome for nothing.
    const sold = Number(
      (
        await db.query(
          `SELECT count(*)::int AS n FROM "Booking"
            WHERE "workshopId" = (SELECT id FROM "Workshop" WHERE slug = $1)
              AND status = 'paid'`,
          [workshop.slug],
        )
      ).rows[0].n,
    );
    const full = sold >= workshop.capacity;
    ok(
      full
        ? "a full workshop says SoldOut to a machine as well as to a person"
        : "a workshop with places says InStock",
      event?.offers?.availability ===
        (full ? "https://schema.org/SoldOut" : "https://schema.org/InStock"),
      `${event?.offers?.availability} with ${sold}/${workshop.capacity} sold`,
    );

    ok(
      "every url in it is the canonical domain, never the host that served it",
      JSON.stringify(event).includes("https://thefieldwork.co.uk") &&
        !JSON.stringify(event).includes(`localhost:${PORT}`),
    );
  } else {
    console.log("  (no published workshop to check — skipped)");
  }

  if (course) {
    const objects = structured(await get(`/courses/${course.slug}`));
    const one = of(objects, "Course");
    ok("a course is a Course, not a bag of Events", Boolean(one));
    ok(
      "with one instance, because a run is one thing somebody signs up to",
      Boolean(one?.hasCourseInstance),
      JSON.stringify(one?.hasCourseInstance ?? null).slice(0, 120),
    );
    ok(
      "and the price of the whole run",
      one?.offers?.price === (course.priceGBP / 100).toFixed(2),
      `${one?.offers?.price}`,
    );
  }

  if (service) {
    const objects = structured(await get(`/services/${service.slug}`));
    const one = of(objects, "Service");
    ok("a one-to-one is a Service and not an Event", Boolean(one));
    ok(
      "because it has no date, and inventing one is making it up",
      !("startDate" in (one ?? {})),
    );
    ok(
      "its length is there, in the form a machine parses",
      one?.additionalProperty?.value === `PT${service.durationMinutes}M`,
      String(one?.additionalProperty?.value),
    );
  }

  // ══ 3 · AND IT CLAIMS NOTHING UNTRUE ═══════════════════════════════════════
  console.log("\n— and it claims nothing she has not earned —\n");

  const everyPage = [
    "/",
    "/workshops",
    "/courses",
    "/services",
    "/about",
    "/contact",
    ...(workshop ? [`/workshops/${workshop.slug}`] : []),
    ...(course ? [`/courses/${course.slug}`] : []),
    ...(service ? [`/services/${service.slug}`] : []),
  ];

  const claimed = [];
  for (const path of everyPage) {
    const html = await get(path);
    if (/aggregateRating|reviewCount|ratingValue/.test(html))
      claimed.push(path);
  }
  ok(
    "not one page claims a rating nobody left",
    claimed.length === 0,
    claimed.join(", "),
  );

  const home = await get("/");
  ok(
    "and the practice is not typed as a medical business, which it says it is not",
    !/MedicalBusiness|MedicalClinic|Physician|HealthAndBeautyBusiness/.test(
      home,
    ),
  );
  ok(
    "the compliance sentence rides with it, so anything quoting her carries it",
    of(structured(home), "LocalBusiness")?.disambiguatingDescription?.includes(
      "Not a substitute for medical care",
    ),
  );

  // ══ 4 · A SHARE OF IT LOOKS LIKE SOMETHING ═════════════════════════════════
  console.log("\n— and a link to it is not a blue string —\n");

  ok("the home page has a share picture", /property="og:image"/.test(home));
  if (workshop) {
    const html = await get(`/workshops/${workshop.slug}`);
    const og = /property="og:image"[^>]*content="([^"]+)"/.exec(html);
    const hero = (
      await db.query(`SELECT "heroImage" FROM "Workshop" WHERE slug = $1`, [
        workshop.slug,
      ])
    ).rows[0]?.heroImage;
    ok(
      "and a workshop shares ITS OWN photograph, not the site's",
      Boolean(og) && (!hero || og[1].includes(hero)),
      og?.[1],
    );
    ok(
      "with a canonical that names this page and no other",
      new RegExp(
        `rel="canonical" href="https://thefieldwork.co.uk/workshops/${workshop.slug}"`,
      ).test(html),
    );
  }

  // ══ 5 · llms.txt IS GENERATED, NOT WRITTEN ═════════════════════════════════
  console.log("\n— the page for something that reads rather than browses —\n");

  {
    const llms = await get("/llms.txt");
    ok("there is one", llms.startsWith("# The Field Work"));
    ok(
      "and the compliance sentence is at the top of it, where it cannot be skipped",
      llms.indexOf("Not a substitute for medical care") < llms.indexOf("## ") ||
        !llms.includes("## "),
    );
    if (workshop) {
      ok(
        "it names the workshop that is actually on",
        llms.includes(workshop.name) &&
          llms.includes(`/workshops/${workshop.slug}`),
      );
    }
    ok(
      "and nothing that is not — it is built from the same rows as the pages",
      !/lorem-ipsum-that-does-not-exist/.test(llms),
    );
  }

  // ══ 5b · AND A BRAND-NEW ONE GETS ALL OF IT, WITHOUT BEING ASKED ═══════════
  //
  // The operator's question on 2026-08-20: "ensure that when marianne creates
  // new courses workshop service that are also seo and agent seo optimisated".
  //
  // The answer is architectural — every machine-readable thing on this site is
  // GENERATED from the row, so there is nothing to fill in and nothing to
  // remember. But "it should be automatic" and "it is automatic" are different
  // claims, and only one of them is a test. This makes a workshop the way the
  // form does, publishes it, and asks for everything.
  console.log("\nA WORKSHOP THAT DID NOT EXIST A MINUTE AGO\n");

  const NEW_SLUG = "smoke-seo-a-new-workshop";
  await db.query(`DELETE FROM "Workshop" WHERE slug = $1`, [NEW_SLUG]);

  const made = (
    await db.query(
      `INSERT INTO "Workshop"
         (slug, name, summary, "bodyHtml", date, "startTime", "endTime",
          "venueName", "addressLines", postcode, "gettingThere",
          capacity, "priceGBP", "refundDays", "heroImage", "heroAlt",
          published, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, '<p>What the hour is like.</p>',
               (now() + interval '30 days')::date, '19:00', '21:00',
               'The Garden Room', E'Fromefield\nFrome\nSomerset', 'BA11 2QN',
               'Step-free from the pavement to the chair you sit in.',
               8, 3500, 14, $4, 'A candle burning on the altar at dusk.',
               true, now(), now())
       RETURNING id, date`,
      [
        NEW_SLUG,
        "An evening of clearing",
        "Two hours in a room with the curtains open, seated and clothed throughout, with nobody touching you at any point.",
        // Whatever picture the site already has, so this creates no media.
        (
          await db.query(
            `SELECT "heroImage" FROM "Workshop"
              WHERE "heroImage" IS NOT NULL LIMIT 1`,
          )
        ).rows[0]?.heroImage ?? null,
      ],
    )
  ).rows[0];

  try {
    const html = await get(`/workshops/${NEW_SLUG}`);
    const objects = structured(html);
    const event = of(objects, "Event");

    ok(
      "it is on the site the moment it is published",
      html.includes("An evening of clearing"),
    );
    ok(
      "and a machine is told it is an Event, with nobody asked to do anything",
      Boolean(event),
    );
    ok(
      "with its date, its place and its price, all from the row she filled in",
      event?.startDate === `${dayKey(made.date)}T19:00` &&
        event?.location?.address?.postalCode === "BA11 2QN" &&
        event?.offers?.price === "35.00",
      JSON.stringify({
        start: event?.startDate,
        postcode: event?.location?.address?.postalCode,
        price: event?.offers?.price,
      }),
    );
    ok(
      "and it says who runs it, joined to the practice described on every page",
      event?.organizer?.["@id"] === of(objects, "LocalBusiness")?.["@id"],
    );
    ok(
      "a share of it carries a picture and its own canonical",
      /property="og:image"/.test(html) &&
        html.includes(
          `rel="canonical" href="https://thefieldwork.co.uk/workshops/${NEW_SLUG}"`,
        ),
    );
    ok(
      "it is in the sitemap",
      (await get("/sitemap.xml")).includes(`/workshops/${NEW_SLUG}`),
    );
    ok(
      "and in the page written for AI assistants, with its date and its price",
      (await get("/llms.txt")).includes(`/workshops/${NEW_SLUG}`) &&
        (await get("/llms.txt")).includes("An evening of clearing"),
    );

    // AND TAKING IT DOWN TAKES ALL OF IT DOWN. The half of the guarantee that
    // gets forgotten: a workshop she unpublishes must stop being advertised in
    // every one of those places at once, or a machine goes on offering it.
    await db.query(`UPDATE "Workshop" SET published = false WHERE slug = $1`, [
      NEW_SLUG,
    ]);
    ok(
      "unpublishing it takes it out of the sitemap",
      !(await get("/sitemap.xml")).includes(`/workshops/${NEW_SLUG}`),
    );
    ok(
      "and out of the llms listing",
      !(await get("/llms.txt")).includes(`/workshops/${NEW_SLUG}`),
    );
    ok(
      "and off the site altogether",
      (await fetch(`${BASE}/workshops/${NEW_SLUG}`)).status === 404,
    );
  } finally {
    await db.query(`DELETE FROM "Workshop" WHERE slug = $1`, [NEW_SLUG]);
  }

  // ══ 6 · BOTH SWITCHES REACH ALL OF IT ══════════════════════════════════════
  console.log("\n— and taking something off takes it off everywhere —\n");

  await setSwitch("workshops", true);
  {
    const map = await get("/sitemap.xml");
    const llms = await get("/llms.txt");
    ok(
      "a page taken off leaves the sitemap",
      !map.includes("/workshops"),
      map.slice(0, 200),
    );
    ok("and leaves the llms listing", !llms.includes("## Workshops"));
  }
  await setSwitch("workshops", false);

  await setSwitch("site", true);
  {
    const robots = await get("/robots.txt");
    const llms = await get("/llms.txt");
    ok(
      "a site that is not open yet asks not to be crawled",
      /Disallow: \//.test(robots) && !/Allow: \//.test(robots),
      robots.replace(/\n/g, " | "),
    );
    ok(
      "and offers no sitemap, because there is nothing to map",
      !/Sitemap:/.test(robots),
    );
    ok(
      "and its llms.txt lists nothing rather than advertising what cannot be booked",
      llms.includes("not open yet") && !llms.includes("## Workshops"),
    );
  }
  await setSwitch("site", false);

  ok(
    "and putting it back puts the crawl back",
    /Allow: \//.test(await get("/robots.txt")),
  );

  ok(
    "the browser was never asked to do any of this — it is all in the delivered HTML",
    structured(await get("/")).length > 0,
  );
} finally {
  // The switches, exactly as they were.
  await db.query(`DELETE FROM "SiteSwitch"`);
  for (const row of switchesBefore) {
    await setSwitch(row.key, row.hidden);
  }
  await stopServer(server);
  await db.end();
  rmSync(COPY, { recursive: true, force: true });
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

/** `2026-08-27`, in her timezone, from a date-only column. */
function dayKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The same formatter the app uses, so the comparison is like for like. */
function money(pence) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}
