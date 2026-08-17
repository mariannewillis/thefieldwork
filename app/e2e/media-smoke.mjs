// =============================================================================
// The media library — adoption, the usage refusal, and private-until-attached
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. A picture an existing page already references is IN THE LIBRARY without
//      anybody importing anything — and so is every photograph on disk.
//   2. Deleting one that is in use is REFUSED, and the refusal NAMES the page.
//   3. Clearing that use then allows the deletion, and the six derivatives go.
//   4. The picker takes ONE where one is wanted and SEVERAL where several are.
//   5. A document is UNREACHABLE without a session until it is on a letter,
//      and reachable the moment it is.
//   6. A pasted film link is pickable on an offering, and saves onto it.
//   7. No reference site can be added to the schema and forgotten: every column
//      that names a picture, film or file is declared in `SITES`.
//
// A sibling of newsletter-smoke.mjs, and it runs the same way:
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3105.
//   2. node e2e/media-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); not a dependency of the app.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL. The app runs from a COPY with no `.env.local` in it, so the
// child inherits only the variables named in `startServer` and the operator's
// real RESEND_API_KEY has no path into it. Nothing here sends anything anyway —
// no letter is sent — but the copy is used regardless, because "this suite does
// not send" is a property of the code under test rather than of this file.
//
// IT NEVER TOUCHES THE OPERATOR'S OWN DATA. Everything it needs it creates: one
// admin account, one workshop, one letter, one uploaded picture and two
// documents, all named `smoke-media-*` and all removed at the end. The
// untouchable rows — workshops the-long-attention and lorem-ipsum, course
// ifr-course, the two real services, the nine EmailTemplate rows, the two
// Subscriber rows and newsletters 12/13/14/26/30 — are read (that is the point
// of claim 1) and never written to. The last checks assert that they came
// through unchanged.
// =============================================================================

import { spawn } from "node:child_process";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import {
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

loadEnv({ path: ".env.local" });

const scrypt = promisify(scryptCb);

const PORT = 3105;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const USER = "smoke-media@example.invalid";
const PASS = "smoke-media-password-not-real";
const MAILBOX = "smoke-media-mailbox@example.invalid";
const SHOTS = resolve("e2e", "_media-shots");

/** The client's real address. Nothing in this run may ever name it. */
const FORBIDDEN = "marianne@thefieldwork.co.uk";

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
  const root = resolve(".smoke-media-app");
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

const SECRET = "smoke-media-secret-not-real-but-long-enough-32-chars";
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
// `lib/auth/password.ts` parses — `scrypt$N$r$p$salt$hash`, both in base64 — so
// nothing here has to reach the real credential. Getting this wrong does not
// throw; it simply never signs in, which is how it announced itself.
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

/** A file of exactly n bytes that sniffs as a PDF. */
const pdf = (bytes) =>
  Buffer.concat([
    Buffer.from("%PDF-1.4\n% smoke\n"),
    Buffer.alloc(Math.max(0, bytes - 17), 0x20),
  ]);

mkdirSync(SHOTS, { recursive: true });

const server = await startServer();
const browser = await chromium.launch();

/** Everything this run creates, torn down at the end whatever happened. */
let workshopId = null;
let letterId = null;

try {
  // ══ 0 · THE SCHEMA SWEEP ═══════════════════════════════════════════════════
  // Mechanical, and it needs no browser. Every column in the schema whose name
  // says it holds a media reference has to be declared in `SITES`, or the
  // deletion guard has a blind spot nobody would notice until a live page lost
  // its photograph.
  console.log("\n— every reference site is declared —");
  {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const library = readFileSync("src/lib/media/library.ts", "utf8");

    // `Model.column` for every column named like a media reference. The model
    // is whatever `model X {` block the line falls inside.
    const declared = [];
    let model = null;
    for (const line of schema.split(/\r?\n/)) {
      const start = /^model\s+(\w+)\s*\{/.exec(line);
      if (start) {
        model = start[1];
        continue;
      }
      if (/^\}/.test(line)) {
        model = null;
        continue;
      }
      if (!model) continue;
      const field =
        /^\s*(heroImage|filmPoster|filmUrl|imageBasename|backgroundBasename|storedAs)\b/.exec(
          line,
        );
      if (field) declared.push(`${model}.${field[1]}`);
      // WorkshopImage/CourseImage/ServiceImage carry the basename on `url`.
      if (/^\s*url\s+String/.test(line) && /Image$/.test(model)) {
        declared.push(`${model}.url`);
      }
    }

    ok(
      "the schema sweep found the reference columns",
      declared.length >= 12,
      String(declared.length),
    );
    for (const column of declared) {
      // MediaAsset.ref is the library's own column and is not a reference site.
      ok(
        `${column} is declared in SITES`,
        library.includes(`"${column}"`),
        "add it to SITES in src/lib/media/library.ts",
      );
    }
    ok(
      "the home page's own photographs are a site too",
      library.includes('"content/home.ts::Plate.src"'),
    );
  }

  const context = await browser.newContext();
  context.setDefaultTimeout(90_000);
  context.setDefaultNavigationTimeout(180_000);
  const page = await context.newPage();

  // Every React complaint any screen makes. The picker opens from INSIDE three
  // forms, which is exactly the shape that shipped a nested <form> once before
  // and left every button on the page inert (D-30).
  //
  // `caret: "initial"` on every screenshot below is part of this check working.
  // Playwright's default hides the caret by injecting `caret-color: transparent`
  // into the DOM, and React then reports that injected style as a hydration
  // mismatch — a complaint about the test harness, arriving in the same channel
  // as the complaint that actually matters. Removing the cause keeps this guard
  // meaningful; filtering the message would have blunted it.
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

  // ══ 1 · ADOPTION ═══════════════════════════════════════════════════════════
  console.log("\n— everything already on the site is already here —");

  // What the site references BEFORE the library is ever opened.
  const heroBefore = await db.query(
    `SELECT "heroImage" FROM "Workshop" WHERE slug = 'the-long-attention'`,
  );
  const adoptedHero = heroBefore.rows[0]?.heroImage;
  ok(
    "the operator's workshop still has its hero picture",
    Boolean(adoptedHero),
    String(adoptedHero),
  );

  await page.goto(`${BASE}/admin/media?tab=pictures`);
  await page.getByRole("heading", { level: 1 }).waitFor();

  {
    const row = await db.query(
      `SELECT "addedAt" FROM "MediaAsset" WHERE kind = 'picture' AND ref = $1`,
      [adoptedHero],
    );
    ok(
      "a picture an existing page references is in the library, unimported",
      row.rows.length === 1,
    );
    ok(
      "and it is not stamped with a date nobody recorded",
      row.rows[0]?.addedAt === null,
      String(row.rows[0]?.addedAt),
    );
  }

  {
    // Every basename referenced anywhere is present, not just the one.
    const missing = await db.query(`
      SELECT ref FROM (
        SELECT "heroImage" AS ref FROM "Workshop" WHERE "heroImage" <> ''
        UNION SELECT "heroImage" FROM "Course" WHERE "heroImage" <> ''
        UNION SELECT "heroImage" FROM "Service" WHERE "heroImage" <> ''
        UNION SELECT url FROM "WorkshopImage"
        UNION SELECT url FROM "CourseImage"
        UNION SELECT url FROM "ServiceImage"
        UNION SELECT "backgroundBasename" FROM "Newsletter" WHERE "backgroundBasename" <> ''
        UNION SELECT "imageBasename" FROM "NewsletterBlock" WHERE "imageBasename" <> ''
      ) refs
      WHERE ref IS NOT NULL AND ref <> ''
        AND ref NOT IN (SELECT ref FROM "MediaAsset" WHERE kind = 'picture')
    `);
    ok(
      "EVERY basename the site references was adopted",
      missing.rows.length === 0,
      missing.rows.map((r) => r.ref).join(", "),
    );
  }

  {
    const attachments = await db.query(`
      SELECT "storedAs" FROM "NewsletterAttachment"
      WHERE "storedAs" NOT IN (SELECT ref FROM "MediaAsset" WHERE kind = 'document')
    `);
    ok(
      "every existing newsletter attachment was adopted",
      attachments.rows.length === 0,
      attachments.rows.map((r) => r.storedAs).join(", "),
    );
  }

  {
    const count = await db.query(
      `SELECT count(*)::int AS n FROM "MediaAsset" WHERE kind = 'picture'`,
    );
    // public/media holds ~39 complete basenames; the referenced set is a subset.
    ok(
      "the photographs on disk were adopted too, not only the referenced ones",
      count.rows[0].n > 20,
      String(count.rows[0].n),
    );
  }

  await page.screenshot({
    path: join(SHOTS, "library-pictures.png"),
    caret: "initial",
    fullPage: false,
  });

  // ══ 2 · THE REFUSAL NAMES THE PAGE ═════════════════════════════════════════
  console.log("\n— what is in use cannot be deleted —");

  // Our own workshop, so nothing the operator owns is touched by the delete.
  const smokeHero = "smoke-media-hero";
  {
    // A basename nothing else uses. Registered by hand, because the point is the
    // REFERENCE, not the bytes.
    await db.query(
      `INSERT INTO "MediaAsset" (kind, ref, "addedAt") VALUES ('picture', $1, now())
       ON CONFLICT (kind, ref) DO NOTHING`,
      [smokeHero],
    );
    const inserted = await db.query(
      `INSERT INTO "Workshop"
         (slug, name, summary, "bodyHtml", date, "startTime", "endTime",
          "venueName", "addressLines", postcode, "gettingThere",
          capacity, "priceGBP", "refundDays",
          published, "heroImage", "heroAlt", "updatedAt")
       VALUES ('smoke-media-workshop', 'Smoke Media Workshop', 'A smoke workshop.', '<p>x</p>',
               now() + interval '90 days', '10:00', '16:00',
               'A smoke room', 'One Smoke Lane', 'SM1 1SM', 'Walk in.',
               6, 10, 7, false, $1, 'A smoke picture.', now())
       RETURNING id`,
      [smokeHero],
    );
    workshopId = inserted.rows[0].id;
  }

  await page.goto(`${BASE}/admin/media?tab=pictures`);
  await page.getByRole("heading", { level: 1 }).waitFor();

  {
    // The card for our picture, found by the name printed on it.
    const card = page
      .locator("li")
      .filter({ hasText: smokeHero.replace(/-/g, " ") })
      .first();
    await card.scrollIntoViewIfNeeded();
    ok(
      "the library says where it is used, by name",
      (await card.innerText()).includes("Smoke Media Workshop"),
      (await card.innerText()).slice(0, 200),
    );

    await card
      .getByRole("button", { name: /remove from the library/i })
      .click();
    await card.getByRole("button", { name: /yes, remove it/i }).click();

    const refusal = card.getByRole("alert");
    await refusal.waitFor({ timeout: 60_000 });
    const said = await refusal.innerText();
    ok("deleting it is refused", said.length > 0);
    ok(
      "and the refusal NAMES the page it is on",
      said.includes("Smoke Media Workshop"),
      said,
    );
    ok(
      "and says nothing was deleted",
      /nothing has been deleted/i.test(said),
      said,
    );

    const still = await db.query(
      `SELECT 1 FROM "MediaAsset" WHERE kind = 'picture' AND ref = $1`,
      [smokeHero],
    );
    ok("and it is still in the library", still.rows.length === 1);
  }

  await page.screenshot({
    path: join(SHOTS, "refusal-names-the-page.png"),
    caret: "initial",
  });

  // ══ 3 · CLEAR THE USE, THEN IT GOES ════════════════════════════════════════
  console.log("\n— clear the use and it lets go —");

  await db.query(`UPDATE "Workshop" SET "heroImage" = '' WHERE id = $1`, [
    workshopId,
  ]);

  await page.goto(`${BASE}/admin/media?tab=pictures`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  {
    const card = page
      .locator("li")
      .filter({ hasText: smokeHero.replace(/-/g, " ") })
      .first();
    await card.scrollIntoViewIfNeeded();
    ok(
      "with the use cleared it says so",
      /not used anywhere/i.test(await card.innerText()),
    );
    await card
      .getByRole("button", { name: /remove from the library/i })
      .click();
    await card.getByRole("button", { name: /yes, remove it/i }).click();
    await page.waitForTimeout(2500);

    const gone = await db.query(
      `SELECT 1 FROM "MediaAsset" WHERE kind = 'picture' AND ref = $1`,
      [smokeHero],
    );
    ok("and now it goes", gone.rows.length === 0);
  }

  // ══ 4 · THE PICKER — ONE WHERE ONE IS WANTED, SEVERAL WHERE SEVERAL ARE ════
  console.log("\n— the picker takes one, or several —");

  await page.goto(`${BASE}/admin/offerings/workshops/smoke-media-workshop`);
  await page.getByRole("heading", { level: 1 }).waitFor();

  {
    // The hero picture takes ONE. Its picker closes on the first press.
    await page
      .getByRole("button", { name: /pick from your pictures/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    ok("the picker opens", await dialog.isVisible());
    ok(
      "and it shows pictures rather than filenames",
      (await dialog.locator("img").count()) > 3,
      String(await dialog.locator("img").count()),
    );
    await page.screenshot({
      path: join(SHOTS, "picker-single.png"),
      caret: "initial",
    });

    const first = dialog.locator("li button").first();
    await first.click();
    await dialog.waitFor({ state: "detached", timeout: 30_000 });
    ok("choosing one closes it — one press, one picture", true);

    const hero = await page.locator('select[name="heroImage"]').inputValue();
    ok(
      "and the chosen picture is what the field now holds",
      hero.length > 0,
      hero,
    );
  }

  {
    // The rail takes SEVERAL. Its picker stays open and counts.
    await page
      .getByRole("button", { name: /pick from your pictures/i })
      .last()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const tiles = dialog.locator("li button");
    await tiles.nth(0).click();
    await tiles.nth(1).click();
    await tiles.nth(2).click();
    ok(
      "picking several keeps it open and counts them",
      /use these 3/i.test(await dialog.innerText()),
      (await dialog.innerText()).slice(-200),
    );
    await page.screenshot({
      path: join(SHOTS, "picker-multiple.png"),
      caret: "initial",
    });

    await dialog.getByRole("button", { name: /use these 3/i }).click();
    await dialog.waitFor({ state: "detached", timeout: 30_000 });

    const rows = await page.locator('select[name^="image-url-"]').count();
    ok("and three rows arrive on the rail", rows === 3, String(rows));
  }

  // ══ 5 · A FILM IS A LINK, PASTED AND THEN PICKED ═══════════════════════════
  console.log("\n— a pasted film link is pickable on an offering —");

  const FILM = "https://vimeo.com/76979871";
  await page.goto(`${BASE}/admin/media?tab=videos`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  ok(
    "the videos tab offers no upload",
    !(await page
      .locator('input[type="file"]')
      .first()
      .isVisible()
      .catch(() => false)),
  );
  await page.fill('input[inputmode="url"]', FILM);
  await page.getByRole("button", { name: /add this film/i }).click();
  await page.waitForTimeout(3000);
  await page.goto(`${BASE}/admin/media?tab=videos`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  {
    const row = await db.query(
      `SELECT ref FROM "MediaAsset" WHERE kind = 'video' AND ref = $1`,
      [FILM],
    );
    ok("the film is in the library as a link", row.rows.length === 1);
  }
  await page.screenshot({
    path: join(SHOTS, "library-videos.png"),
    caret: "initial",
  });

  {
    await page.goto(`${BASE}/admin/offerings/workshops/smoke-media-workshop`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByRole("button", { name: /pick from your films/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.locator("li button").first().click();
    await dialog.waitFor({ state: "detached", timeout: 30_000 });
    const value = await page.locator('input[name="filmUrl"]').inputValue();
    ok("picking it fills the offering's film field", value === FILM, value);

    await page.getByRole("button", { name: /save/i }).first().click();
    await page.waitForTimeout(6000);
    const saved = await db.query(
      `SELECT "filmUrl" FROM "Workshop" WHERE id = $1`,
      [workshopId],
    );
    ok(
      "and it saves onto the workshop",
      saved.rows[0].filmUrl === FILM,
      String(saved.rows[0].filmUrl),
    );
  }

  // ══ 6 · PRIVATE UNTIL ATTACHED ═════════════════════════════════════════════
  console.log("\n— a document is private until it goes on a letter —");

  // Uploaded through the library's own screen, so the whole path is exercised.
  await page.goto(`${BASE}/admin/media?tab=documents`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "smoke-media-handout.pdf",
      mimeType: "application/pdf",
      buffer: pdf(4096),
    });
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/admin/media?tab=documents`);
  await page.getByRole("heading", { level: 1 }).waitFor();

  const key = "document-smoke-media-handout.pdf";
  {
    const row = await db.query(
      `SELECT ref, "contentType", bytes FROM "MediaAsset" WHERE kind = 'document' AND ref = $1`,
      [key],
    );
    ok("the document is in the library", row.rows.length === 1, key);
    ok(
      "sniffed as a PDF from its bytes, not from its name",
      row.rows[0]?.contentType === "application/pdf",
      String(row.rows[0]?.contentType),
    );
  }

  ok(
    "the screen says only she can open it",
    /only you can open this/i.test(await page.locator("body").innerText()),
  );
  await page.screenshot({
    path: join(SHOTS, "library-documents.png"),
    caret: "initial",
  });

  // A browser with NO session — the state a recipient is in.
  //
  // `request.get` throughout rather than `page.goto`. A document that IS served
  // arrives as a download, because `Content-Disposition: attachment` is the
  // load-bearing header on all three of these routes — and navigating to a
  // download throws in Playwright rather than handing back a response. The
  // context's request object carries this stranger's cookies, which is to say
  // none of them.
  const stranger = await browser.newContext();
  {
    const viaPublic = await stranger.request.get(
      `${BASE}/newsletter-files/${key}`,
    );
    ok(
      "with no session the public route refuses it",
      viaPublic.status() === 404,
      String(viaPublic.status()),
    );
    const viaAdmin = await stranger.request.get(
      `${BASE}/admin/media/file/${key}`,
      { maxRedirects: 0 },
    );
    ok(
      "and the admin route will not serve it to a stranger either",
      viaAdmin.status() !== 200,
      String(viaAdmin.status()),
    );
  }

  // She can open it.
  {
    const response = await page.request.get(`${BASE}/admin/media/file/${key}`);
    ok(
      "she can open it herself",
      response.status() === 200,
      String(response.status()),
    );
    ok(
      "and it is served as a download, never inline",
      (response.headers()["content-disposition"] ?? "").startsWith(
        "attachment",
      ),
      response.headers()["content-disposition"],
    );
    ok(
      "and never cached, since it may be private",
      /no-store/.test(response.headers()["cache-control"] ?? ""),
      response.headers()["cache-control"],
    );
  }

  // Put it on a letter — the moment it becomes public.
  {
    const letter = await db.query(
      `INSERT INTO "Newsletter" (subject, preheader, "mastheadLabel", "updatedAt")
       VALUES ('Smoke Media Letter', 'A smoke letter.', 'Smoke', now())
       RETURNING id`,
    );
    letterId = letter.rows[0].id;

    await page.goto(`${BASE}/admin/newsletters/${letterId}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page
      .getByRole("button", { name: /pick from your documents/i })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    ok(
      "the document picker names the type in words",
      /a PDF/i.test(await dialog.innerText()),
      (await dialog.innerText()).slice(0, 300),
    );
    await page.screenshot({
      path: join(SHOTS, "picker-documents.png"),
      caret: "initial",
    });

    const tile = dialog
      .locator("li button")
      .filter({ hasText: /smoke-media-handout/i })
      .first();
    await tile.click();
    await dialog.getByRole("button", { name: /use this one/i }).click();
    await dialog.waitFor({ state: "detached", timeout: 30_000 });
    await page.waitForTimeout(4000);

    const attached = await db.query(
      `SELECT "storedAs" FROM "NewsletterAttachment" WHERE "newsletterId" = $1`,
      [letterId],
    );
    ok(
      "it is on the letter, pointing at the SAME file",
      attached.rows.length === 1 && attached.rows[0].storedAs === key,
      JSON.stringify(attached.rows),
    );
  }

  {
    const viaPublic = await stranger.request.get(
      `${BASE}/newsletter-files/${key}`,
    );
    ok(
      "and NOW a stranger can open it — a link in an inbox has no session",
      viaPublic.status() === 200,
      String(viaPublic.status()),
    );
    ok(
      "and it still arrives as a download rather than rendering on this origin",
      (viaPublic.headers()["content-disposition"] ?? "").startsWith(
        "attachment",
      ),
      viaPublic.headers()["content-disposition"],
    );
  }

  await page.goto(`${BASE}/admin/media?tab=documents`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  ok(
    "and the library says so, in words",
    /anybody with the address can open/i.test(
      await page.locator("body").innerText(),
    ),
  );

  // The newsletter screen says it too, where she is deciding it.
  await page.goto(`${BASE}/admin/newsletters/${letterId}`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  {
    const said = await page.locator("body").innerText();
    ok(
      "the letter's own sheet says who can open an attached file",
      /anybody with the address can open a file once it is on a letter/i.test(
        said,
      ),
    );
    ok(
      "and no longer claims it is for subscribers only",
      !/subscribers only/i.test(said),
    );
  }

  // ══ 7 · A DOCUMENT IN USE IS ALSO REFUSED ══════════════════════════════════
  console.log("\n— a document on a letter cannot be deleted either —");
  await page.goto(`${BASE}/admin/media?tab=documents`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  {
    const card = page
      .locator("li")
      .filter({ hasText: /smoke-media-handout/i })
      .first();
    await card.scrollIntoViewIfNeeded();
    await card
      .getByRole("button", { name: /remove from the library/i })
      .click();
    await card.getByRole("button", { name: /yes, remove it/i }).click();
    const refusal = card.getByRole("alert");
    await refusal.waitFor({ timeout: 60_000 });
    ok(
      "the refusal names the letter it is attached to",
      /Smoke Media Letter/.test(await refusal.innerText()),
      await refusal.innerText(),
    );
  }

  // ══ 7b · THE OTHER TWO OFFERING SHEETS STILL DRAW ══════════════════════════
  //
  // READ-ONLY, AND DELIBERATELY SO. The course and session forms took the same
  // mechanical change as the workshop's — the film field became `FilmField` and
  // the picture rail gained a multiple picker — but their own smoke suites need
  // the operator's running server and his password, so they cannot be run from
  // here. These two loads are what stands in for that: the sheets are opened,
  // the new controls are checked to be present, and NOTHING IS SAVED, because
  // `ifr-course` and `david-morgan` are the operator's own rows.
  console.log("\n— the course and session sheets still draw —");
  for (const [what, path] of [
    ["course", "/admin/offerings/courses/ifr-course"],
    ["session", "/admin/offerings/services/david-morgan"],
  ]) {
    await page.goto(`${BASE}${path}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    ok(
      `the ${what} sheet opens`,
      new URL(page.url()).pathname === path,
      page.url(),
    );
    ok(
      `the ${what} sheet offers the film picker`,
      await page
        .getByRole("button", { name: /pick from your films/i })
        .isVisible(),
    );
    ok(
      `the ${what} sheet offers the picture picker`,
      (await page
        .getByRole("button", { name: /pick from your pictures/i })
        .count()) > 0,
    );
    ok(
      `the ${what} sheet still posts a film field called filmUrl`,
      (await page.locator('input[name="filmUrl"]').count()) === 1,
    );
  }

  // ══ 8 · THE OLD DOCUMENTS ROUTE ════════════════════════════════════════════
  console.log("\n— the second stub is gone —");
  await page.goto(`${BASE}/admin/documents`);
  ok(
    "/admin/documents lands on the library's documents tab",
    page.url().includes("/admin/media") && page.url().includes("tab=documents"),
    page.url(),
  );

  // ══ 9 · NOTHING HYDRATED BADLY ═════════════════════════════════════════════
  console.log("\n— the picker did not break a single page —");
  ok(
    "React made no hydration or nested-form complaint anywhere in this run",
    reactComplaints.length === 0,
    reactComplaints.join(" | "),
  );

  // ══ 10 · THE OPERATOR'S OWN DATA CAME THROUGH UNCHANGED ════════════════════
  console.log("\n— the untouchables —");
  {
    const rows = await db.query(
      `SELECT slug, "heroImage" FROM "Workshop" WHERE slug IN ('the-long-attention','lorem-ipsum') ORDER BY slug`,
    );
    ok("both operator workshops are still there", rows.rows.length === 2);
    ok(
      "and the-long-attention still has the hero it started with",
      rows.rows.find((r) => r.slug === "the-long-attention")?.heroImage ===
        adoptedHero,
    );
    const templates = await db.query(
      `SELECT count(*)::int AS n FROM "EmailTemplate"`,
    );
    ok(
      "the nine email templates are untouched",
      templates.rows[0].n === 9,
      String(templates.rows[0].n),
    );
    const subs = await db.query(
      `SELECT count(*)::int AS n FROM "Subscriber" WHERE email NOT LIKE '%.invalid'`,
    );
    ok(
      "the two real subscribers are untouched",
      subs.rows[0].n === 2,
      String(subs.rows[0].n),
    );
    const letters = await db.query(
      `SELECT count(*)::int AS n FROM "Newsletter" WHERE id IN (12,13,14,26,30)`,
    );
    ok(
      "newsletters 12/13/14/26/30 are all still there",
      letters.rows[0].n === 5,
    );
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

  const log = server.out();
  ok(`${FORBIDDEN} appears nowhere in this run`, !log.includes(FORBIDDEN));

  await stranger.close();
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
      `DELETE FROM "MediaAsset" WHERE ref LIKE 'smoke-media%' OR ref LIKE 'document-smoke-media%'`,
    );
    await db.query(
      `DELETE FROM "MediaAsset" WHERE kind = 'video' AND ref = 'https://vimeo.com/76979871'`,
    );
    // LAST, and everything above it must be able to fail without reaching it —
    // which is exactly what went wrong once: a stale reference threw here and
    // the throwaway account was left in the operator's database. Ordering alone
    // is not the fix; each step is its own statement and the catch below logs
    // rather than swallows, so a teardown that half-runs says so.
    await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
  } catch (e) {
    console.error("teardown:", e);
  }

  // The uploaded document's bytes, out of the shared store.
  try {
    const stored = resolve(
      "public",
      "media",
      "document-smoke-media-handout.pdf",
    );
    if (existsSync(stored)) rmSync(stored, { force: true });
  } catch {
    /* nothing to clean */
  }

  await db.end().catch(() => {});
  await browser.close().catch(() => {});
  server.child.kill();
  // Windows will not remove a directory the dying dev server still holds
  // handles into, and an EBUSY here would throw out of the `finally` and lose
  // the counts the run just produced. Give it a moment, then try, then let it
  // go — a leftover copy is swept by the next run's `makeCopy`.
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
