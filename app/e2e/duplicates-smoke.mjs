// =============================================================================
// The library refuses to hold the same thing twice — and clears what it already
// holds twice
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. IDENTITY IS THE BYTES. The same photograph sent up under two names is
//      ONE picture: no second basename, no second six files, and the one she
//      already has comes back chosen. Two different photographs sharing a name
//      are still two, and are still named apart.
//   2. EVERY UPLOAD PATH IS COVERED — the library's own upload, the offering
//      forms' picture picker, and the letter's document upload.
//   3. A FILM CANNOT LAND TWICE under two spellings of one address:
//      `youtu.be/x` and `youtube.com/watch?v=x` are one row.
//   4. A GROUP IN USE IS MERGED, and every reference is repointed BEFORE
//      anything is deleted — the pages go on showing the same picture.
//   5. THE DERIVATIVES GO WITH IT. The copies' files leave the store; the
//      survivor's stay.
//   6. A GROUP WHOSE COPY IS NAMED IN `src/content/home.ts` IS REFUSED, with a
//      reason, and NOTHING about it is changed — because no database write
//      reaches a TypeScript file and half a merge is worse than none.
//   7. The tab counts are right afterwards.
//
// A sibling of media-smoke.mjs, and it runs the same way:
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3106.
//   2. node e2e/duplicates-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); not a dependency of the app.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL. The app runs from a COPY with no `.env.local` in it, so the
// child inherits only the variables named in `startServer` and the operator's
// real RESEND_API_KEY has no path into it. Nothing here sends anything anyway.
//
// IT NEVER MERGES THE OPERATOR'S OWN DUPLICATES. His four groups — the two
// WhatsApp photographs, the service-drive picture and the pair — are VISIBLE on
// the panel this suite drives, and they are the point of the feature, so they
// are his to clear when he looks at the screen. Every press below is aimed at a
// group this run created, located by the `smoke-dup-` name printed on it.
//
// IT NEVER TOUCHES THE OPERATOR'S OWN DATA otherwise. Everything it needs it
// creates: one admin account, one workshop, one letter, its own photographs and
// its own PDF, all named `smoke-dup-*` and all removed at the end. The
// untouchable rows — workshops the-long-attention and lorem-ipsum, course
// ifr-course, the two real services, the nine EmailTemplate rows, the two
// Subscriber rows and newsletters 12/13/14/26/30 — are read and never written
// to, and the last checks assert they came through unchanged.
// =============================================================================

import { spawn } from "node:child_process";
import { createHash, randomBytes, scrypt as scryptCb } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { chromium } from "playwright";
import sharp from "sharp";

loadEnv({ path: ".env.local" });

const scrypt = promisify(scryptCb);

const PORT = 3106;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const STORE = resolve("public", "media");
const USER = "smoke-dup@example.invalid";
const PASS = "smoke-dup-password-not-real";
const MAILBOX = "smoke-dup-mailbox@example.invalid";
const SHOTS = resolve("e2e", "_duplicate-shots");

/** The client's real address. Nothing in this run may ever name it. */
const FORBIDDEN = "marianne@thefieldwork.co.uk";

/** The six shapes one basename means on disk. */
const DERIVATIVES = [1200, 2400].flatMap((width) =>
  ["avif", "webp", "jpg"].map((ext) => `-${width}.${ext}`),
);

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

// ── the copy ─────────────────────────────────────────────────────────────────

function makeCopy() {
  const root = resolve(".smoke-dup-app");
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

const SECRET = "smoke-dup-secret-not-real-but-long-enough-to-pass-32";
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
        AUTH_SECRET: SECRET,
        NEXT_PUBLIC_SITE_URL: BASE,
        RESEND_API_KEY: "",
        EMAIL_TO_OWNER: MAILBOX,
        EMAIL_REPLY_TO: "replies@example.invalid",
        EMAIL_FROM: "The Field Work <smoke@example.invalid>",
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

await db.connect();

// The throwaway admin, written straight in with the EXACT scrypt shape
// `lib/auth/password.ts` parses, so nothing here has to reach the real
// credential.
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
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
  await db.query(
    `INSERT INTO "AdminUser" (username, email, "passwordHash", "mustChangePassword", "updatedAt")
     VALUES ($1, $2, $3, false, now())`,
    [USER, MAILBOX, stored],
  );
}

/**
 * A photograph, made rather than fetched.
 *
 * Two of these with different colours are two genuinely different pictures, so
 * "same name, different bytes" is a real case rather than a contrived one. The
 * noise is what stops sharp's encoders producing a suspiciously small file.
 */
async function madePicture(seed) {
  const size = 900;
  const pixels = Buffer.alloc(size * size * 3);
  let n = seed;
  for (let i = 0; i < pixels.length; i += 1) {
    n = (n * 1103515245 + 12345) % 2147483648;
    pixels[i] = n % 256;
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** A file of exactly n bytes that sniffs as a PDF. */
const pdf = (bytes) =>
  Buffer.concat([
    Buffer.from("%PDF-1.4\n% smoke-dup\n"),
    Buffer.alloc(Math.max(0, bytes - 21), 0x20),
  ]);

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Every `-2400.jpg` in the store, hashed — the library's own identity rule. */
const storedHash = (basename) => {
  const file = join(STORE, `${basename}-2400.jpg`);
  return existsSync(file) ? sha(readFileSync(file)) : null;
};

/** Copy one basename's six derivatives to another name, bytes untouched. */
function copyBasename(from, to) {
  for (const tail of DERIVATIVES) {
    const source = join(STORE, `${from}${tail}`);
    if (existsSync(source)) copyFileSync(source, join(STORE, `${to}${tail}`));
  }
}

/** How many of a basename's six derivatives are on disk right now. */
const filesOnDisk = (basename) =>
  DERIVATIVES.filter((tail) => existsSync(join(STORE, `${basename}${tail}`)))
    .length;

/**
 * The photographs `src/content/home.ts` names, read out of the code.
 *
 * Only the `plate:` ones. The file holds other `src:` lines — a portrait that
 * is not a beat's plate among them — and `SITES` reads plates alone, so a
 * looser match would hand back a basename the home page does not actually claim
 * and the refusal below would never fire.
 */
function homePlates() {
  const source = readFileSync("src/content/home.ts", "utf8");
  return [...source.matchAll(/plate:\s*\{\s*src:\s*"([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );
}

mkdirSync(SHOTS, { recursive: true });

const server = await startServer();
const browser = await chromium.launch();

/** Everything this run creates, torn down at the end whatever happened. */
let workshopId = null;
let letterId = null;
/** Basenames this run put in the store, so teardown knows what is its own. */
const mine = new Set();
// Eleven characters, because that is what a YouTube identifier is and what
// `lib/film.ts` matches. A twelfth would be truncated by both spellings, which
// would still prove the point but would prove it by accident.
const FILM_ID = "smokedupfil";
const FILM = `https://www.youtube.com/watch?v=${FILM_ID}`;

try {
  const context = await browser.newContext();
  context.setDefaultTimeout(90_000);
  context.setDefaultNavigationTimeout(180_000);
  const page = await context.newPage();

  // Every React complaint any screen makes. The duplicates panel puts a form
  // per group on a page that also carries the library's own per-item forms, and
  // a nested form is what left every button on the newsletter sheet inert once
  // before (D-30). `caret: "initial"` on every screenshot is part of this check
  // working — Playwright's default injects `caret-color` into the DOM and React
  // reports the injection as a hydration mismatch.
  const reactComplaints = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/hydrat|cannot be a descendant|<form>/i.test(text)) {
      reactComplaints.push(text);
    }
  });

  // ── signing in ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page
    .waitForURL((url) => new URL(url).pathname === "/admin", {
      timeout: 120_000,
    })
    .catch(() => {});
  ok(
    "the throwaway account signs in",
    new URL(page.url()).pathname === "/admin",
    page.url(),
  );

  // First load of the library, which is what backfills the hashes of everything
  // already on the site. Nothing is pressed.
  await page.goto(`${BASE}/admin/media?tab=pictures`);
  await page.getByRole("heading", { level: 1 }).waitFor();

  {
    const hashed = await db.query(
      `SELECT count(*)::int AS n FROM "MediaAsset" WHERE kind = 'picture' AND hash IS NOT NULL`,
    );
    ok(
      "opening the library hashes the photographs already on the site",
      hashed.rows[0].n > 20,
      String(hashed.rows[0].n),
    );
  }

  // The panel as the operator will first see it: his own four groups, unmerged.
  // The panel alone rather than the whole page — the library above it is forty
  // cards long and the panel is what this is a proof of.
  await page
    .locator('section[aria-labelledby="duplicates-h"]')
    .screenshot({ path: join(SHOTS, "duplicates-before.png"), caret: "initial" });

  // ══ 1 · THE SAME PICTURE UNDER TWO NAMES IS ONE PICTURE ════════════════════
  console.log("\n— identity is the bytes, not the name —");

  const alpha = await madePicture(11);
  const other = await madePicture(29);

  const upload = async (name, bytes) => {
    await page.goto(`${BASE}/admin/media?tab=pictures`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name, mimeType: "image/jpeg", buffer: bytes });
    // The upload is a server action fired from a change handler, so there is no
    // navigation to wait for — only the sentence, or the absence of one.
    await page.waitForTimeout(9000);
    return page.locator("body").innerText();
  };

  await upload("smoke-dup-alpha.jpg", alpha);
  mine.add("smoke-dup-alpha");
  {
    const row = await db.query(
      `SELECT ref, hash FROM "MediaAsset" WHERE kind = 'picture' AND ref = 'smoke-dup-alpha'`,
    );
    ok("the first upload lands", row.rows.length === 1);
    ok(
      "and its row carries the hash of the file it is identified by",
      row.rows[0]?.hash === storedHash("smoke-dup-alpha"),
      String(row.rows[0]?.hash),
    );
    ok("and six derivatives are on disk", filesOnDisk("smoke-dup-alpha") === 6);
  }

  {
    // THE SAME BYTES, A DIFFERENT NAME.
    const said = await upload("smoke-dup-beta.jpg", alpha);
    const rows = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'picture' AND ref LIKE 'smoke-dup-beta%'`,
    );
    ok(
      "the same photograph under another name adds no second row",
      rows.rows.length === 0,
      rows.rows.map((r) => r.ref).join(", "),
    );
    ok(
      "and no second set of files",
      filesOnDisk("smoke-dup-beta") === 0,
      String(filesOnDisk("smoke-dup-beta")),
    );
    ok(
      "and she is told she already has it, rather than shown an error",
      /you already have this picture/i.test(said),
      said.slice(0, 400),
    );
  }

  {
    // THE SAME NAME, DIFFERENT BYTES — two pictures, and still named apart.
    await upload("smoke-dup-alpha.jpg", other);
    mine.add("smoke-dup-alpha-2");
    const rows = await db.query(
      `SELECT ref, hash FROM "MediaAsset" WHERE kind = 'picture' AND ref LIKE 'smoke-dup-alpha%' ORDER BY ref`,
    );
    ok(
      "a different photograph sharing a name is NOT treated as a duplicate",
      rows.rows.length === 2,
      rows.rows.map((r) => r.ref).join(", "),
    );
    ok(
      "and the two rows hash differently, which is why",
      rows.rows[0]?.hash !== rows.rows[1]?.hash,
    );
  }

  // ══ 2 · THE OFFERING FORM'S OWN UPLOAD TAKES THE SAME GUARD ════════════════
  console.log("\n— every path in, not just the library's own —");

  {
    const inserted = await db.query(
      `INSERT INTO "Workshop"
         (slug, name, summary, "bodyHtml", date, "startTime", "endTime",
          "venueName", "addressLines", postcode, "gettingThere",
          capacity, "priceGBP", "refundDays",
          published, "heroImage", "heroAlt", "updatedAt")
       VALUES ('smoke-dup-workshop', 'Smoke Dup Workshop', 'A smoke workshop.', '<p>x</p>',
               now() + interval '90 days', '10:00', '16:00',
               'A smoke room', 'One Smoke Lane', 'SM1 1SM', 'Walk in.',
               6, 10, 7, true, '', 'A smoke picture.', now())
       RETURNING id`,
    );
    workshopId = inserted.rows[0].id;
  }

  await page.goto(`${BASE}/admin/offerings/workshops/smoke-dup-workshop`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  {
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "smoke-dup-gamma.jpg",
        mimeType: "image/jpeg",
        buffer: alpha,
      });
    await page.waitForTimeout(9000);

    const said = await page.locator("body").innerText();
    ok(
      "the offering form's own picture upload says it already has it",
      /you already have this picture/i.test(said),
      said.slice(0, 400),
    );
    ok(
      "and the field holds the copy she already had",
      (await page.locator('select[name="heroImage"]').inputValue()) ===
        "smoke-dup-alpha",
      await page.locator('select[name="heroImage"]').inputValue(),
    );
    const rows = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'picture' AND ref LIKE 'smoke-dup-gamma%'`,
    );
    ok("and nothing new was stored", rows.rows.length === 0);
  }

  // ══ 3 · A FILM IS ONE ROW, HOWEVER THE ADDRESS IS SPELLED ══════════════════
  console.log("\n— a film cannot land twice under two spellings —");

  for (const spelling of [
    `https://youtu.be/${FILM_ID}`,
    `https://www.youtube.com/watch?v=${FILM_ID}`,
  ]) {
    await page.goto(`${BASE}/admin/media?tab=videos`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.fill('input[inputmode="url"]', spelling);
    await page.getByRole("button", { name: /add this film/i }).click();
    await page.waitForTimeout(4000);
  }
  {
    const rows = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'video' AND ref LIKE '%${FILM_ID}%'`,
    );
    ok(
      "youtu.be and youtube.com/watch are ONE film in the library",
      rows.rows.length === 1,
      rows.rows.map((r) => r.ref).join(", "),
    );
    ok(
      "and it is stored in the canonical form",
      rows.rows[0]?.ref === FILM,
      String(rows.rows[0]?.ref),
    );
  }

  // ══ 4 · A GROUP IN USE IS MERGED, AND EVERY REFERENCE MOVES ════════════════
  console.log("\n— a group in use is merged, references first —");

  // The state this feature was written against, reproduced: the same photograph
  // sitting in the store under three names, two of them on live pages. Built by
  // hand because the guard above now makes it impossible to create by uploading.
  //
  // `addedAt` is set on the copies and NOT on the survivor's competitors by
  // accident: `smoke-dup-alpha` was uploaded a moment ago and carries a date, so
  // the copies are given LATER dates to make it the oldest — which is the rule
  // the panel prints.
  for (const copy of ["smoke-dup-copy", "smoke-dup-copy-two"]) {
    copyBasename("smoke-dup-alpha", copy);
    mine.add(copy);
    await db.query(
      `INSERT INTO "MediaAsset" (kind, ref, "addedAt") VALUES ('picture', $1, now() + interval '1 hour')
       ON CONFLICT (kind, ref) DO NOTHING`,
      [copy],
    );
  }
  await db.query(`UPDATE "Workshop" SET "heroImage" = $1 WHERE id = $2`, [
    "smoke-dup-copy",
    workshopId,
  ]);
  await db.query(
    `INSERT INTO "WorkshopImage" ("workshopId", url, alt, position)
     VALUES ($1, $2, 'A smoke rail picture.', 0)`,
    [workshopId, "smoke-dup-copy-two"],
  );

  await page.goto(`${BASE}/admin/media?tab=pictures`);
  await page.getByRole("heading", { level: 1 }).waitFor();

  // Scoped to the panel: the library's own card for the same basename prints
  // the same words higher up the page.
  const panel = page.locator('section[aria-labelledby="duplicates-h"]');
  const group = panel
    .locator("li")
    .filter({ hasText: /this one stays: smoke dup alpha\b/i })
    .first();
  await group.scrollIntoViewIfNeeded();
  {
    const said = await group.innerText();
    ok("the panel finds the group", said.length > 0);
    ok(
      "and says which copy stays, and why",
      /this one stays: smoke dup alpha/i.test(said) &&
        /had longest/i.test(said),
      said.slice(0, 500),
    );
    ok(
      "and names every place a copy is used, before anything is pressed",
      said.includes("Smoke Dup Workshop"),
      said.slice(0, 700),
    );
    ok(
      "and says exactly what will happen",
      /will be moved onto the one that stays/i.test(said),
      said.slice(0, 700),
    );
  }
  await page.screenshot({
    path: join(SHOTS, "duplicates-group-in-use.png"),
    caret: "initial",
  });

  await group.getByRole("button", { name: /keep one, remove the rest/i }).click();
  await page.waitForTimeout(9000);

  {
    const hero = await db.query(
      `SELECT "heroImage" FROM "Workshop" WHERE id = $1`,
      [workshopId],
    );
    ok(
      "the workshop's hero now names the survivor",
      hero.rows[0].heroImage === "smoke-dup-alpha",
      String(hero.rows[0].heroImage),
    );
    const rail = await db.query(
      `SELECT url FROM "WorkshopImage" WHERE "workshopId" = $1`,
      [workshopId],
    );
    ok(
      "and so does the picture on its rail",
      rail.rows[0].url === "smoke-dup-alpha",
      String(rail.rows[0].url),
    );
    const gone = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'picture' AND ref IN ('smoke-dup-copy','smoke-dup-copy-two')`,
    );
    ok(
      "the copies are out of the library",
      gone.rows.length === 0,
      gone.rows.map((r) => r.ref).join(", "),
    );
    ok(
      "and their derivative files are off the disk",
      filesOnDisk("smoke-dup-copy") === 0 &&
        filesOnDisk("smoke-dup-copy-two") === 0,
      `${filesOnDisk("smoke-dup-copy")} / ${filesOnDisk("smoke-dup-copy-two")}`,
    );
    ok(
      "while the survivor's six are still there",
      filesOnDisk("smoke-dup-alpha") === 6,
      String(filesOnDisk("smoke-dup-alpha")),
    );
  }

  {
    const said = await page.locator("body").innerText();
    ok(
      "and the screen says what it did, in words",
      /kept one picture: smoke dup alpha/i.test(said) &&
        /now point at the one that stayed/i.test(said),
      said.slice(0, 900),
    );
    ok(
      "naming the pages it moved",
      said.includes("Smoke Dup Workshop"),
      said.slice(0, 900),
    );
  }
  await page.screenshot({
    path: join(SHOTS, "duplicates-after.png"),
    caret: "initial",
    fullPage: true,
  });
  // And the panel on its own, because the account of what just happened is the
  // point of the "after" and it is one paragraph at the bottom of a very long
  // page.
  await page
    .locator('section[aria-labelledby="duplicates-h"]')
    .screenshot({ path: join(SHOTS, "duplicates-report.png"), caret: "initial" });

  // THE PAGE ITSELF, which is the only thing that actually matters.
  {
    const stranger = await browser.newContext();
    stranger.setDefaultTimeout(90_000);
    stranger.setDefaultNavigationTimeout(180_000);
    const visitor = await stranger.newPage();
    await visitor.goto(`${BASE}/workshops/smoke-dup-workshop`);
    await visitor.getByRole("heading", { level: 1 }).waitFor();
    const sources = await visitor.locator("img, source").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("src") ?? node.getAttribute("srcset") ?? ""),
    );
    ok(
      "the live workshop page still shows the same photograph",
      sources.some((value) => value.includes("smoke-dup-alpha")),
      sources.join(" | ").slice(0, 300),
    );
    ok(
      "and names no file that has been deleted",
      !sources.some((value) => value.includes("smoke-dup-copy")),
      sources.join(" | ").slice(0, 300),
    );
    await visitor.screenshot({
      path: join(SHOTS, "workshop-after-merge.png"),
      caret: "initial",
    });
    await stranger.close();
  }

  // ══ 5 · A COPY NAMED IN THE SITE'S CODE IS REFUSED ═════════════════════════
  console.log("\n— a group the home page names is refused, not half-done —");

  // The LONGEST-named home-page photograph, so the copy below is certain to
  // sort ahead of it: both carry no date, and the tie-break is the shorter
  // name. That is what makes the home page's own plate one of the copies that
  // would be deleted, which is the exact state the refusal exists for — and it
  // is a state that cannot be reached by uploading, because the guard would
  // have recognised the bytes.
  const plate = homePlates().sort((a, b) => b.length - a.length)[0];
  ok("a home-page photograph was found to test against", Boolean(plate), plate);

  {
    copyBasename(plate, "smoke-dup-incode");
    mine.add("smoke-dup-incode");
    await db.query(
      `INSERT INTO "MediaAsset" (kind, ref, "addedAt") VALUES ('picture', 'smoke-dup-incode', NULL)
       ON CONFLICT (kind, ref) DO NOTHING`,
    );

    await page.goto(`${BASE}/admin/media?tab=pictures`);
    await page.getByRole("heading", { level: 1 }).waitFor();

    // "The oldest of these", not "This one stays" — a refused group makes no
    // promise about what will happen, because nothing will.
    const refused = page
      .locator('section[aria-labelledby="duplicates-h"] li')
      .filter({ hasText: /the oldest of these: smoke dup incode/i })
      .first();
    await refused.scrollIntoViewIfNeeded();
    const said = await refused.innerText();
    ok(
      "the group is shown, and the refusal names the home page",
      /home page/i.test(said),
      said.slice(0, 600),
    );
    ok(
      "and says it is written into the site's own code",
      /written into the site's own code/i.test(said),
      said.slice(0, 600),
    );
    ok(
      "and offers no button to press",
      (await refused
        .getByRole("button", { name: /keep one, remove the rest/i })
        .count()) === 0,
    );
    await page.screenshot({
      path: join(SHOTS, "duplicates-refused-in-code.png"),
      caret: "initial",
    });

    const plateRow = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'picture' AND ref = $1`,
      [plate],
    );
    ok("and the home page's own photograph is untouched", plateRow.rows.length === 1);
    ok(
      "with all six of its files still on disk",
      filesOnDisk(plate) === 6,
      String(filesOnDisk(plate)),
    );
  }

  // ══ 6 · ONE DOCUMENT, HOWEVER MANY LETTERS ═════════════════════════════════
  console.log("\n— the same handout on three letters is one file —");

  const handout = pdf(5000);
  await page.goto(`${BASE}/admin/media?tab=documents`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "smoke-dup-handout.pdf",
      mimeType: "application/pdf",
      buffer: handout,
    });
  await page.waitForTimeout(6000);

  const documentKey = "document-smoke-dup-handout.pdf";
  {
    const row = await db.query(
      `SELECT ref, hash FROM "MediaAsset" WHERE kind = 'document' AND ref = $1`,
      [documentKey],
    );
    ok("the document lands", row.rows.length === 1, documentKey);
    ok(
      "with the hash of its own bytes",
      row.rows[0]?.hash === sha(handout),
      String(row.rows[0]?.hash),
    );
  }

  {
    // The same PDF again, into the library.
    await page.goto(`${BASE}/admin/media?tab=documents`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "a-different-name.pdf",
        mimeType: "application/pdf",
        buffer: handout,
      });
    await page.waitForTimeout(6000);
    const rows = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'document' AND ref LIKE '%smoke-dup%' OR ref LIKE '%a-different-name%'`,
    );
    ok(
      "the same document under another name adds no second row",
      rows.rows.length === 1,
      rows.rows.map((r) => r.ref).join(", "),
    );
    ok(
      "and says she already has it",
      /you already have this file/i.test(await page.locator("body").innerText()),
    );
  }

  {
    // And the letter's OWN upload — the path that made three copies of one PDF.
    const letter = await db.query(
      `INSERT INTO "Newsletter" (subject, preheader, "mastheadLabel", "updatedAt")
       VALUES ('Smoke Dup Letter', 'A smoke letter.', 'Smoke', now())
       RETURNING id`,
    );
    letterId = letter.rows[0].id;

    await page.goto(`${BASE}/admin/newsletters/${letterId}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page
      .locator('input[type="file"][accept*="pdf"]')
      .first()
      .setInputFiles({
        name: "smoke-dup-handout.pdf",
        mimeType: "application/pdf",
        buffer: handout,
      });
    await page.waitForTimeout(8000);

    const attached = await db.query(
      `SELECT "storedAs" FROM "NewsletterAttachment" WHERE "newsletterId" = $1`,
      [letterId],
    );
    ok(
      "uploading it onto a letter points the letter at the file she already has",
      attached.rows.length === 1 && attached.rows[0].storedAs === documentKey,
      JSON.stringify(attached.rows),
    );
    ok(
      "rather than storing a second copy under the letter's own key",
      !existsSync(join(STORE, `newsletter-${letterId}-smoke-dup-handout.pdf`)),
    );
    const rows = await db.query(
      `SELECT count(*)::int AS n FROM "MediaAsset" WHERE kind = 'document' AND hash = $1`,
      [sha(handout)],
    );
    ok("and the library still holds it once", rows.rows[0].n === 1);
  }

  // ══ 7 · THE COUNTS ═════════════════════════════════════════════════════════
  console.log("\n— the tabs count what is actually there —");
  await page.goto(`${BASE}/admin/media?tab=pictures`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  {
    const actual = await db.query(
      `SELECT kind, count(*)::int AS n FROM "MediaAsset" GROUP BY kind`,
    );
    const nav = await page.locator('nav[aria-label="What kind of thing"]').innerText();
    for (const row of actual.rows) {
      const label =
        row.kind === "video"
          ? "Videos"
          : row.kind === "picture"
            ? "Pictures"
            : "Documents";
      // Case-insensitively: the tab labels are set in uppercase by the
      // stylesheet, and `innerText` reports what is rendered rather than what
      // is written.
      ok(
        `the ${label} tab counts ${row.n}`,
        new RegExp(`${label}\\s+${row.n}\\b`, "i").test(nav),
        nav.replace(/\n/g, " · "),
      );
    }
  }

  // ══ 8 · NOTHING HYDRATED BADLY ═════════════════════════════════════════════
  console.log("\n— the panel did not break a single page —");
  ok(
    "React made no hydration or nested-form complaint anywhere in this run",
    reactComplaints.length === 0,
    reactComplaints.join(" | "),
  );

  // ══ 9 · THE OPERATOR'S OWN DATA CAME THROUGH UNCHANGED ═════════════════════
  console.log("\n— the untouchables —");
  {
    const rows = await db.query(
      `SELECT slug FROM "Workshop" WHERE slug IN ('the-long-attention','lorem-ipsum')`,
    );
    ok("both operator workshops are still there", rows.rows.length === 2);
    const course = await db.query(
      `SELECT slug FROM "Course" WHERE slug = 'ifr-course'`,
    );
    ok("the course is still there", course.rows.length === 1);
    const services = await db.query(
      `SELECT slug FROM "Service" WHERE slug IN ('1-hour-restructing','david-morgan')`,
    );
    ok("both operator services are still there", services.rows.length === 2);
    const templates = await db.query(
      `SELECT count(*)::int AS n FROM "EmailTemplate"`,
    );
    ok("the nine email templates are untouched", templates.rows[0].n === 9);
    const subs = await db.query(
      `SELECT count(*)::int AS n FROM "Subscriber" WHERE email NOT LIKE '%.invalid'`,
    );
    ok("the two real subscribers are untouched", subs.rows[0].n === 2);
    const letters = await db.query(
      `SELECT count(*)::int AS n FROM "Newsletter" WHERE id IN (12,13,14,26,30)`,
    );
    ok("newsletters 12/13/14/26/30 are all still there", letters.rows[0].n === 5);
    const bookings = await db.query(
      `SELECT count(*)::int AS n FROM "Booking" WHERE id IN (25,368)`,
    );
    ok("bookings 25 and 368 are still there", bookings.rows[0].n === 2);
    const requests = await db.query(
      `SELECT count(*)::int AS n FROM "ServiceRequest" WHERE id IN (3,4,55)`,
    );
    ok("service requests 3/4/55 are still there", requests.rows[0].n === 3);
    const cred = await db.query(
      `SELECT "credentialVersion" FROM "AdminUser" WHERE username <> $1 LIMIT 1`,
      [USER],
    );
    ok(
      "credentialVersion is still 3",
      cred.rows.length === 0 || cred.rows[0].credentialVersion === 3,
      String(cred.rows[0]?.credentialVersion),
    );
  }

  // HIS OWN DUPLICATES ARE STILL HIS TO CLEAR. This suite drove the panel they
  // are drawn on and pressed nothing but its own group.
  {
    const his = await db.query(`
      SELECT count(*)::int AS n FROM (
        SELECT hash FROM "MediaAsset"
        WHERE kind = 'picture' AND hash IS NOT NULL AND ref NOT LIKE 'smoke-dup%'
        GROUP BY hash HAVING count(*) > 1
      ) groups
    `);
    ok(
      "the operator's own four duplicate groups are untouched, for him to clear",
      his.rows[0].n === 4,
      String(his.rows[0].n),
    );
  }

  const log = server.out();
  ok(`${FORBIDDEN} appears nowhere in this run`, !log.includes(FORBIDDEN));

  await context.close();
} finally {
  // ── teardown ───────────────────────────────────────────────────────────────
  try {
    if (letterId) {
      await db.query(
        `DELETE FROM "NewsletterAttachment" WHERE "newsletterId" = $1`,
        [letterId],
      );
      await db.query(`DELETE FROM "Newsletter" WHERE id = $1`, [letterId]);
    }
    if (workshopId) {
      await db.query(`DELETE FROM "WorkshopImage" WHERE "workshopId" = $1`, [
        workshopId,
      ]);
      await db.query(`DELETE FROM "Workshop" WHERE id = $1`, [workshopId]);
    }
    await db.query(
      `DELETE FROM "MediaAsset" WHERE ref LIKE 'smoke-dup%' OR ref LIKE 'document-smoke-dup%' OR ref = $1`,
      [FILM],
    );
    // LAST, and everything above it must be able to fail without reaching it.
    await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
  } catch (e) {
    console.error("teardown:", e);
  }

  // The files this run put in the shared store — its own, and only its own.
  // The merge above already removed the copies through the app; these are what
  // is left.
  for (const basename of mine) {
    for (const tail of DERIVATIVES) {
      try {
        rmSync(join(STORE, `${basename}${tail}`), { force: true });
      } catch {
        /* nothing to clean */
      }
    }
  }
  try {
    rmSync(join(STORE, "document-smoke-dup-handout.pdf"), { force: true });
  } catch {
    /* nothing to clean */
  }

  await db.end().catch(() => {});
  await browser.close().catch(() => {});
  server.child.kill();
  // Windows will not remove a directory the dying dev server still holds
  // handles into, and an EBUSY here would throw out of the `finally` and lose
  // the counts the run just produced.
  await sleep(2000);
  try {
    rmSync(COPY, { recursive: true, force: true });
  } catch {
    /* the next run removes it */
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`proofs in ${SHOTS}`);
process.exit(fail === 0 ? 0 : 1);
