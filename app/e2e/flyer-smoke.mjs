// =============================================================================
// The flyer — however many photographs she picks, on a sheet that cannot spill
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. A flyer is the OFFERING until she changes something. Rename the workshop
//      and the flyer is renamed; a line she rewrites stops following, and only
//      that line.
//   2. She may put AS MANY photographs on it as she likes, and the sheet
//      arranges them by how many there are — one band, an asymmetric pair, a
//      pair with a third beneath, a run of three across, a mosaic of four.
//   3. IT NEVER SPILLS. A5 is a fixed budget and the sheet CLIPS, so anything
//      that does not fit is not pushed to a second page — it is gone, on paper,
//      silently. At every count, and with a sentence far longer than she would
//      write, the content still fits the sheet.
//   4. The background is not one of them: it has its own switch, and off gives
//      a plum sheet rather than a hole.
//   5. The printed sheet is A5 exactly — 559×794px at 96dpi — and carries none
//      of the portal around it.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3108.
//   2. node e2e/flyer-smoke.mjs
//
// Requires playwright; it is not a dependency of the app itself.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// IT WRITES NOTHING OF HERS. It creates its own workshop (`smoke-flyer-*`) with
// its own gallery of twelve rows pointing at pictures the site ALREADY has —
// so it uploads nothing, encodes nothing and leaves no files behind — and
// deletes the lot at the end. Her offerings are read for nothing at all.
//
// No mail: the server it starts has RESEND_API_KEY="" and this screen sends
// nothing anyway.
// =============================================================================

import { spawn } from "node:child_process";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { cpSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { chromium } from "playwright";

const scrypt = promisify(scryptCb);
loadEnv({ path: ".env.local" });

const PORT = 3108;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const USER = "smoke-flyer@example.invalid";
const PASS = "smoke-flyer-password-not-real";
const SLUG = "smoke-flyer-an-evening-of-clearing";

/** A5 at 96dpi. The sheet is drawn at its real size, so these are millimetres. */
const A5 = { w: 559, h: 794 };

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

function makeCopy() {
  const root = resolve(".smoke-app-flyer");
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
        AUTH_SECRET: "smoke-flyer-secret-not-real-but-long-enough-32ch",
        NEXT_PUBLIC_SITE_URL: BASE,
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
  if (Date.now() >= deadline)
    throw new Error(`never came up:\n${log.join("")}`);
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

async function cleanUp() {
  await db.query(`DELETE FROM "Workshop" WHERE slug = $1`, [SLUG]);
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
}

await db.connect();
await cleanUp();

// ── the throwaway admin, and a workshop with twelve pictures ────────────────

{
  const salt = randomBytes(16);
  const hash = await scrypt(PASS.normalize("NFKC"), salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 128 * 32768 * 8 * 2,
  });
  const stored = [
    "scrypt",
    32768,
    8,
    1,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
  await db.query(
    `INSERT INTO "AdminUser" (username, email, "passwordHash", "mustChangePassword", "updatedAt")
     VALUES ($1, $2, $3, false, now())`,
    [USER, `${USER}.address`, stored],
  );
}

/**
 * PICTURES THE SITE ALREADY HAS, pointed at rather than uploaded.
 *
 * Twelve rows in `WorkshopImage` naming twelve existing basenames: no bytes are
 * written, no derivatives are encoded, and nothing is left in `public/media`
 * for somebody to find next week wondering what it was.
 */
const available = (
  await db.query(
    `SELECT DISTINCT url FROM "WorkshopImage"
      UNION SELECT DISTINCT url FROM "CourseImage"
      LIMIT 12`,
  )
).rows.map((row) => row.url);

if (available.length < 4) {
  console.log(
    "\n  Not enough pictures on the site to exercise this. Skipped.\n",
  );
  await cleanUp();
  await db.end();
  process.exit(0);
}

const workshopId = (
  await db.query(
    `INSERT INTO "Workshop"
       (slug, name, summary, "bodyHtml", date, "startTime", "endTime",
        "venueName", "addressLines", postcode, "gettingThere",
        capacity, "priceGBP", "refundDays", "heroImage", "heroAlt",
        published, "createdAt", "updatedAt")
     VALUES ($1, 'An evening of clearing',
             'Two hours in a room with the curtains open.',
             '<p>What the hour is like.</p>',
             (now() + interval '30 days')::date, '19:00', '21:00',
             'The Garden Room', E'Fromefield\nFrome\nSomerset', 'BA11 2QN',
             'Step-free from the pavement to the chair you sit in.',
             8, 3500, 14, $2, 'A candle burning at dusk.',
             true, now(), now())
     RETURNING id`,
    [SLUG, available[0]],
  )
).rows[0].id;

for (const [position, url] of available.entries()) {
  await db.query(
    `INSERT INTO "WorkshopImage" ("workshopId", url, alt, position)
     VALUES ($1, $2, 'A picture of the room.', $3)`,
    [workshopId, url, position],
  );
}

const server = await startServer();

try {
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1400, height: 1100 } })
  ).newPage();
  page.setDefaultTimeout(60_000);

  const complaints = [];
  page.on("pageerror", (error) => complaints.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") complaints.push(message.text());
  });

  await page.goto(`${BASE}/admin/offerings`);
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"));

  const PRINT = `${BASE}/admin/offerings/workshops/${SLUG}/flyer`;

  /** Everything worth knowing about the printed sheet, measured. */
  const measure = async () => {
    await page.goto(PRINT, { waitUntil: "networkidle" });
    return page.locator(".flyer").evaluate((sheet) => {
      const body = sheet.querySelector(".flyer__body");
      const strip = sheet.querySelector(".flyer__strip");
      const pictures = [...sheet.querySelectorAll(".flyer__strip img")];
      const first = pictures[0]?.getBoundingClientRect();
      return {
        sheet: Math.round(sheet.getBoundingClientRect().height),
        width: Math.round(sheet.getBoundingClientRect().width),
        content: Math.round(body.scrollHeight),
        shown: pictures.length,
        shape: strip
          ? [...strip.classList].find((one) => one.startsWith("flyer__strip--"))
          : null,
        cell: first
          ? `${Math.round(first.width)}×${Math.round(first.height)}`
          : null,
        ground: sheet.querySelectorAll("picture .flyer__plate").length,
        foot: sheet.querySelector(".flyer__foot")?.textContent?.slice(0, 24),
      };
    });
  };

  const setPictures = (refs) =>
    db.query(
      `INSERT INTO "Flyer" ("workshopId", pictures, "updatedAt")
       VALUES ($1, $2, now())
       ON CONFLICT ("workshopId") DO UPDATE SET pictures = $2, "updatedAt" = now()`,
      [workshopId, refs],
    );

  // ══ 1 · IT IS THE WORKSHOP UNTIL SHE CHANGES IT ════════════════════════════
  console.log("\n— it is the workshop until she says otherwise —\n");

  {
    const seen = await measure();
    ok("a flyer she has never opened draws", seen.shown >= 0 && seen.sheet > 0);
    // THROUGH THE SIGNED-IN PAGE, not a bare `fetch`. The print route is behind
    // the session like everything under /admin, so `fetch` here carries no
    // cookie and reads the LOGIN page — which contains neither the name (so the
    // check failed honestly) nor the portal rail (so the check below would have
    // passed dishonestly, which is the worse of the two).
    ok(
      "with the workshop's own name on it",
      (await page.content()).includes("An evening of clearing"),
    );
    ok(
      "and the site's own reassurance at the foot, which the workshop has no field for",
      (seen.foot ?? "").startsWith("You stay clothed"),
      seen.foot,
    );
  }

  // ══ 2 · HOWEVER MANY SHE PICKS ═════════════════════════════════════════════
  //
  // The operator's question on 2026-08-21: "what happens when she adds 12
  // images". The answer must be that the sheet arranges them, not that it shows
  // the first two and drops nine — and must be true at every count between.
  console.log("\n— however many she picks —\n");

  const SHAPES = {
    0: null,
    1: "flyer__strip--1",
    2: "flyer__strip--2",
    3: "flyer__strip--3",
    4: "flyer__strip--few",
    6: "flyer__strip--few",
    9: "flyer__strip--many",
    12: "flyer__strip--many",
  };

  for (const count of [0, 1, 2, 3, 4, 6, 9, 12]) {
    if (count > available.length) continue;
    await setPictures(available.slice(0, count));
    const seen = await measure();

    ok(
      `${count} chosen puts ${count} on the sheet`,
      seen.shown === count,
      `${seen.shown} shown`,
    );
    ok(
      `and arranges ${count === 0 ? "none of them" : `them as ${SHAPES[count]?.replace("flyer__strip--", "")}`}`,
      seen.shape === SHAPES[count],
      `${seen.shape}`,
    );
    // THE ONE THAT MATTERS. The sheet clips, so overflow is not a scrollbar —
    // it is the footnote gone from the paper without saying so.
    ok(
      `and still fits the sheet, so nothing falls off the paper`,
      seen.content <= seen.sheet,
      `${seen.content} in ${seen.sheet}`,
    );
  }

  // ══ 3 · AND A SENTENCE LONGER THAN THE SHEET ═══════════════════════════════
  //
  // Measured before the blurb was bounded: 260 characters pushed 5.6mm off the
  // bottom and took the reassurance line with it, silently, on paper.
  console.log("\n— and words longer than there is room for —\n");

  await db.query(`UPDATE "Flyer" SET blurb = $1 WHERE "workshopId" = $2`, [
    "A long afternoon in the garden room, seated and clothed throughout, with nobody touching you at any point and nothing whatsoever asked of your beliefs, for anybody who has been circling this for months and has not yet found a way in that did not feel like a performance.",
    workshopId,
  ]);
  for (const count of [0, 2, 12]) {
    if (count > available.length) continue;
    await setPictures(available.slice(0, count));
    const seen = await measure();
    ok(
      `a sentence twice the sheet's room still fits with ${count} pictures`,
      seen.content <= seen.sheet,
      `${seen.content} in ${seen.sheet}`,
    );
    ok(
      "and the foot of the page survives it",
      (seen.foot ?? "").startsWith("You stay clothed"),
      seen.foot,
    );
  }
  await db.query(`UPDATE "Flyer" SET blurb = NULL WHERE "workshopId" = $1`, [
    workshopId,
  ]);

  // ══ 4 · THE BACKGROUND IS NOT ONE OF THEM ══════════════════════════════════
  console.log("\n— the background is its own decision —\n");

  await setPictures(available.slice(0, 4));
  {
    const on = await measure();
    ok("with a background there is a photograph behind it", on.ground === 1);
    ok("and the four she chose are still four", on.shown === 4);

    await db.query(
      `UPDATE "Flyer" SET "showGround" = false WHERE "workshopId" = $1`,
      [workshopId],
    );
    const off = await measure();
    ok("turning it off leaves plum rather than a hole", off.ground === 0);
    ok(
      "and does not touch the photographs she chose",
      off.shown === 4,
      `${off.shown}`,
    );
    ok("and the sheet still fits", off.content <= off.sheet);
    await db.query(
      `UPDATE "Flyer" SET "showGround" = true WHERE "workshopId" = $1`,
      [workshopId],
    );
  }

  // ══ 5 · AND WHAT COMES OUT IS A5 ═══════════════════════════════════════════
  console.log("\n— and what comes out of the printer is A5 —\n");

  {
    const seen = await measure();
    ok(
      "the printed sheet is 148×210mm to the pixel",
      seen.width === A5.w && seen.sheet === A5.h,
      `${seen.width}×${seen.sheet}`,
    );
    ok(
      "and carries none of the portal around it",
      (await page.getByRole("link", { name: "Bookings" }).count()) === 0 &&
        (await page.locator("nav[aria-label]").count()) === 0,
    );
  }

  ok(
    "and the browser complained about nothing, all run",
    complaints.length === 0,
    complaints.slice(0, 2).join(" · "),
  );

  await browser.close();
} finally {
  await stopServer(server);
  await cleanUp();
  await db.end();
  rmSync(COPY, { recursive: true, force: true });
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
