// =============================================================================
// The pages panel — editing the home page in place, and publishing it
// =============================================================================
//
// One claim, exercised: the home page can be CHANGED on the home page, the
// change reaches nobody until she publishes it, and publishing puts exactly
// what she changed in front of a visitor.
//
// Everything else here is a thing that had to be true on the way: the panel
// lists every page and says which are not editable yet; an empty database still
// renders the composition that was signed off on; the seven beats cannot be
// deleted and can be hidden; a section she adds lands between the two she chose
// and takes a box of words, words on the picture and a picture, each left,
// centre or right; typing back what was already there stops counting as a
// change; and nothing she does before pressing Publish is visible on the site.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3106.
//   2. node e2e/pages-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL. RESEND_API_KEY is empty in the child's environment, which
// BEATS the one in .env.local (@next/env only fills variables that are
// undefined), and EMAIL_TO_OWNER is a .invalid address. Nothing on this screen
// sends anything anyway — a page has no recipients — and it is asserted at the
// end regardless, because "this screen does not send mail" is exactly the kind
// of thing that stops being true when somebody adds a notification.
//
// IT WRITES ONLY PAGE CONTENT, and it puts it all back: every PageSection,
// PageText and PagePicture row for the `home` page is deleted at both ends of
// the run. That is the whole of what this feature owns. The operator's
// offerings, bookings, requests and media are READ and never written, and
// Booking 25 is checked at both ends to prove it.
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

const PORT = 3106;
const BASE = `http://localhost:${PORT}`;
const OWNER = "owner@example.invalid";
const USER = "smoke-pages@example.invalid";
const PASS = "smoke-pages-password-not-real";
/** The address this run must never write to. Checked over the whole log. */
const HERS = "marianne@thefieldwork.co.uk";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const APP = resolve(".");

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

async function makeCopy() {
  const root = resolve(".smoke-app-pages");
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
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), link);
  symlinkSync(resolve("public"), join(root, "public"), link);
  return root;
}

let COPY;

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
        AUTH_SECRET: process.env.AUTH_SECRET ?? "smoke-pages-secret-not-real",
        NEXT_PUBLIC_SITE_URL: BASE,
        EMAIL_TO_OWNER: OWNER,
        RESEND_API_KEY: "",
        // Signing in calls ensureSeeded(); left unset it falls back to its own
        // defaults and would quietly seed a second admin into her database.
        ADMIN_TEST_USERNAME: "",
        ADMIN_TEST_EMAIL: "",
      },
    },
  );
  const collect = (buffer) => log.push(buffer.toString());
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const deadline = Date.now() + 180_000;
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
    throw new Error(`the server never came up:\n${log.join("")}`);
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
  throw new Error("the dev server would not let go of the port");
}

// ── reading back ─────────────────────────────────────────────────────────────

const rowsOf = async (sql, params = []) => (await db.query(sql, params)).rows;

const textRow = (state, key) =>
  rowsOf(
    `SELECT value FROM "PageText" WHERE page='home' AND state=$1 AND key=$2`,
    [state, key],
  ).then((rows) => rows[0]?.value ?? null);

const sectionRows = (state) =>
  rowsOf(
    `SELECT id, position, kind, "beatKey", hidden FROM "PageSection"
     WHERE page='home' AND state=$1 ORDER BY position, id`,
    [state],
  );

const oneLine = (text) => text.replace(/\s+/g, " ").slice(0, 300);

/** The public home page, as anybody visiting would get it. */
async function publicHome() {
  const response = await fetch(BASE, { cache: "no-store" });
  return response.text();
}

async function cleanUp() {
  // The three tables this feature owns, and nothing else. Blocks and items go
  // with their sections; both relations cascade.
  await db.query(`DELETE FROM "PageSection" WHERE page='home'`);
  await db.query(`DELETE FROM "PageText" WHERE page='home'`);
  await db.query(`DELETE FROM "PagePicture" WHERE page='home'`);
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
}

// ── driving the editor ───────────────────────────────────────────────────────

const EDITOR = `${BASE}/admin/pages/home`;

async function signIn(page) {
  await page.goto(`${BASE}/admin/pages`);
  const gate = new URL(page.url()).pathname === "/admin/login";
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"));
  return gate;
}

/** The iframe the page is drawn in, once it has drawn. */
async function preview(page) {
  // The frame is 74vh tall inside a screen that scrolls, so the parent has to
  // be looking at it before anything inside it can be clicked — Playwright will
  // scroll WITHIN the frame on its own, but not the page the frame sits on.
  // `scrollIntoViewIfNeeded` leaves it PARTLY visible, which is not enough: an
  // element low in the frame is then still off the bottom of the window and
  // Playwright refuses to click it. Put the frame's top edge at the top.
  await page.evaluate(() => {
    document
      .querySelector('iframe[title*="as you are editing it"]')
      ?.scrollIntoView({ block: "start" });
  });
  const frame = page.frameLocator('iframe[title*="as you are editing it"]');
  await frame.locator("section.beat").first().waitFor({ timeout: 60_000 });
  return frame;
}

/** Click a thing in the frame and wait for the panel to become its controls. */
async function select(page, selector, expect) {
  const frame = await preview(page);
  await frame.locator(selector).first().scrollIntoViewIfNeeded();
  await frame.locator(selector).first().click({ force: true });
  await page
    .getByRole("heading", { name: expect })
    .waitFor({ timeout: 20_000 });
}

/**
 * Select a whole SECTION, the way she does — by its tab.
 *
 * Not by clicking the band: every beat's photograph covers its whole section,
 * so a click anywhere on one lands on the plate or on the words in front of it.
 * The tab exists for exactly this reason and is the only way in.
 */
async function selectSection(page, beat, expect) {
  const frame = await preview(page);
  const tab = frame.locator(
    `[data-section][data-beat="${beat}"] [data-handle="true"]`,
  );
  await tab.scrollIntoViewIfNeeded();
  await tab.click({ force: true });
  await page
    .getByRole("heading", { name: expect })
    .waitFor({ timeout: 20_000 });
}

async function selectMade(page, id, expect) {
  const frame = await preview(page);
  const made = frame.locator(`[data-section="${id}"] [data-handle="true"]`);
  await made.scrollIntoViewIfNeeded();
  await made.click({ force: true });
  await page
    .getByRole("heading", { name: expect })
    .waitFor({ timeout: 20_000 });
}

/** Press a control in the panel and wait for the screen to come back. */
async function press(page, name) {
  await page.getByRole("button", { name, exact: false }).first().click();
  // Every change re-renders the screen from the server and reloads the frame.
  await page.waitForTimeout(1800);
  await preview(page);
}

// ── the run ──────────────────────────────────────────────────────────────────

COPY = await makeCopy();
await db.connect();
await cleanUp();

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

const server = await startServer();

try {
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1600, height: 1200 } })
  ).newPage();
  page.setDefaultNavigationTimeout(180_000);
  page.setDefaultTimeout(60_000);

  /**
   * EVERYTHING THE BROWSER COMPLAINS ABOUT, over the whole run.
   *
   * D-30's rule, applied to a second screen: the newsletter editor's nested
   * form and its `$ACTION_REF` mismatch both showed up here first and nowhere
   * else, and the page went on looking right while every button on it was
   * inert. This screen has the same shape of risk — a document inside a
   * document, a panel that redraws itself, and a data attribute per selectable
   * thing — and it has already caught one: `data-sectionKind`, camelCase, which
   * the browser lowercases so `dataset.sectionKind` never found it. React said
   * so in the console; nothing else did.
   */
  const complaints = [];
  const watch = (target) => {
    target.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        complaints.push(`[${message.type()}] ${message.text()}`);
      }
    });
    target.on("pageerror", (error) =>
      complaints.push(`[pageerror] ${error.message}`),
    );
  };
  watch(page);

  // ── the operator's own data, before anything else happens ─────────────────
  const b25Before = await rowsOf(
    `SELECT id, status, "totalPence" FROM "Booking" WHERE id = 25`,
  );

  // ── an empty database still renders the page that was signed off on ───────
  const virgin = await publicHome();
  ok(
    "with no content rows at all, the home page is the composition as authored",
    virgin.includes("You keep your clothes on.") &&
      virgin.includes("Nobody touches you.") &&
      virgin.includes("Restructuring.") &&
      virgin.includes("Not ready to book anything."),
    oneLine(virgin.slice(0, 200)),
  );
  ok(
    "and it has all seven of its sections",
    (virgin.match(/<section /g) ?? []).length === 7,
    String((virgin.match(/<section /g) ?? []).length),
  );
  ok(
    "and carries none of the editor's marks",
    !virgin.includes("data-section=") && !virgin.includes("data-block="),
  );

  // ── getting in ────────────────────────────────────────────────────────────
  const wasClosed = await signIn(page);
  ok("the pages panel is closed to anyone not signed in", wasClosed);

  // ── the panel ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/pages`);
  const panel = await page.locator("main").innerText();
  ok(
    "every page on the site is listed, not only the one that opens",
    [
      "Home",
      "About",
      "Contact",
      "Sessions",
      "Courses",
      "Workshops",
      "Privacy",
    ].every((label) => panel.includes(label)),
    oneLine(panel),
  );
  ok(
    "and the six that are not wired say so, and say where their words are",
    /Not editable here yet/.test(panel) &&
      panel.includes("src/content/about.ts"),
    oneLine(panel),
  );
  ok(
    "with nothing waiting to be published on a page nobody has touched",
    !/changes? not published/i.test(panel),
    oneLine(panel),
  );

  // ── the editor draws the page ─────────────────────────────────────────────
  await page.goto(EDITOR);
  const frame = await preview(page);
  ok(
    "the editor renders the page itself, all seven sections of it",
    (await frame.locator("section.beat").count()) === 7,
    String(await frame.locator("section.beat").count()),
  );
  ok(
    "and it is the page, not a picture of it — the words are the page's words",
    (await frame.locator('[data-slot="root.lines"]').innerText()).includes(
      "Nobody touches you.",
    ),
  );
  ok(
    "the panel starts by saying what to do rather than showing a form",
    /Click anything on the page/.test(
      await page.locator('aside[aria-label="The toolbox"]').innerText(),
    ),
    oneLine(await page.locator('aside[aria-label="The toolbox"]').innerText()),
  );

  // ── changing one of the seven beats' words, in place ──────────────────────
  await select(page, '[data-slot="sacral.poolBody"]', /The words in the box/);
  const NEW_WORDS =
    "Some describe warmth in the hands, some a heaviness, and some notice very little and say so afterwards.";
  await page
    .locator('aside[aria-label="The toolbox"] textarea')
    .first()
    .fill(NEW_WORDS);
  await press(page, /^Save$/);

  ok(
    "changing a sentence writes it to the DRAFT",
    (await textRow("draft", "sacral.poolBody")) === NEW_WORDS,
    String(await textRow("draft", "sacral.poolBody")),
  );
  ok(
    "and to nothing else — the live copy is untouched",
    (await textRow("live", "sacral.poolBody")) === null,
  );

  const stillOld = await publicHome();
  ok(
    "SO A VISITOR SEES THE OLD SENTENCE, which is the whole point of a draft",
    !stillOld.includes(NEW_WORDS) &&
      stillOld.includes("Some describe warmth, some a heaviness in the arms"),
  );

  ok(
    "the editor shows the new one, because the editor reads the draft",
    (
      await (
        await preview(page)
      )
        .locator('[data-slot="sacral.poolBody"]')
        .innerText()
    ).includes("warmth in the hands"),
  );

  const waiting = await page
    .locator('aside[aria-label="The toolbox"]')
    .innerText();
  ok(
    "and it is itemised before the button that sends it, in her words",
    /1 change not published/i.test(waiting) &&
      /the words in the box/.test(waiting) &&
      /The hour/.test(waiting),
    oneLine(waiting),
  );

  // ── typing back what was there is not a change ────────────────────────────
  await select(page, '[data-slot="sacral.poolBody"]', /The words in the box/);
  await press(page, /Put it back to how it was/);
  ok(
    "putting a sentence back DELETES the row rather than storing a copy of the original",
    (await textRow("draft", "sacral.poolBody")) === null,
  );
  ok(
    "so nothing is waiting, and the list does not cry wolf",
    /Nothing is waiting/i.test(
      await page.locator('aside[aria-label="The toolbox"]').innerText(),
    ),
    oneLine(await page.locator('aside[aria-label="The toolbox"]').innerText()),
  );

  // ── hiding one of the seven ───────────────────────────────────────────────
  await selectSection(page, "turn", /Before and after/);
  await press(page, /Take it off the site/);
  const hidden = await sectionRows("draft");
  ok(
    "hiding a beat writes the seven sections down for the first time, in order",
    hidden.length === 7 &&
      hidden.map((row) => row.beatKey).join(",") ===
        "root,sacral,method,throat,schedule,turn,crown",
    hidden.map((row) => row.beatKey).join(","),
  );
  ok(
    "and only the one she pressed is hidden",
    hidden
      .filter((row) => row.hidden)
      .map((row) => row.beatKey)
      .join(",") === "turn",
  );
  ok(
    "the editor still draws it, greyed, so it is not lost",
    (await (await preview(page)).locator("section.beat.is-hidden").count()) ===
      1,
  );

  // ── the seven cannot be deleted ───────────────────────────────────────────
  const beatPanel = await page
    .locator('aside[aria-label="The toolbox"]')
    .innerText();
  ok(
    "and there is no delete on one of the seven — it says why instead",
    !/Delete this section/.test(beatPanel) &&
      /composed as it is/.test(beatPanel),
    oneLine(beatPanel),
  );

  // ── a section of her own, between two of them ─────────────────────────────
  await selectSection(page, "method", /The four words/);
  await press(page, /Below this one/);

  const withNew = await sectionRows("draft");
  ok(
    "a section she adds lands exactly where she asked for it",
    withNew.length === 8 &&
      withNew[2].beatKey === "method" &&
      withNew[3].kind === "free" &&
      withNew[4].beatKey === "throat",
    withNew.map((row) => row.beatKey ?? "FREE").join(","),
  );

  const madeId = withNew[3].id;

  await selectMade(page, madeId, /A section you added/);
  const madePanel = await page
    .locator('aside[aria-label="The toolbox"]')
    .innerText();
  ok(
    "and the panel offers what goes in it — a box, words on the picture, a picture",
    ["A box of words", "Words on the picture", "A picture"].every((label) =>
      madePanel.includes(label),
    ) && (await page.locator("[data-add-kind]").count()) === 3,
    oneLine(madePanel),
  );

  // A box of words, on the right.
  const kindBlock = page.locator('[data-add-kind="pool"]');
  await kindBlock.getByRole("button", { name: "Right" }).click();
  await page.waitForTimeout(1800);

  const blocks = await rowsOf(
    `SELECT b.id, b.kind, b.placement FROM "PageBlock" b
     JOIN "PageSection" s ON s.id = b."sectionId"
     WHERE s.id = $1 ORDER BY b.position`,
    [madeId],
  );
  ok(
    "putting a box of words on the right makes one, on the right",
    blocks.length === 1 &&
      blocks[0].kind === "pool" &&
      blocks[0].placement === "right",
    JSON.stringify(blocks),
  );

  const items = await rowsOf(
    `SELECT id, kind, text FROM "PageItem" WHERE "blockId" = $1 ORDER BY position`,
    [blocks[0].id],
  );
  ok(
    "and it arrives with a line in it, because an empty box has nothing to click",
    items.length === 1 && items[0].kind === "paragraph",
    JSON.stringify(items),
  );

  // Type into that line.
  await select(page, `[data-item="${items[0].id}"]`, /Paragraph/);
  const HER_LINE =
    "The room is upstairs and the stairs are steep. If that is a problem, say so when you write and we will find another way.";
  await page
    .locator('aside[aria-label="The toolbox"] textarea')
    .first()
    .fill(HER_LINE);
  await press(page, /^Save$/);

  ok(
    "her words go into the line she selected",
    (
      await rowsOf(`SELECT text FROM "PageItem" WHERE id = $1`, [items[0].id])
    )[0].text === HER_LINE,
  );
  ok(
    "and they are on the page in the editor, in the right-hand column",
    (
      await (await preview(page)).locator(".free__cell--right").innerText()
    ).includes("the stairs are steep"),
  );

  const beforePublish = await publicHome();
  ok(
    "AND STILL NOWHERE NEAR A VISITOR",
    !beforePublish.includes("the stairs are steep") &&
      beforePublish.includes("The bracing for it stopped."),
  );

  // ── an empty line is refused rather than left as a gap ────────────────────
  await select(page, `[data-item="${items[0].id}"]`, /Paragraph/);
  await page
    .locator('aside[aria-label="The toolbox"] textarea')
    .first()
    .fill("   ");
  await page
    .getByRole("button", { name: /^Save$/ })
    .first()
    .click();
  await page
    .locator('aside[aria-label="The toolbox"] [role="alert"]')
    .waitFor({ timeout: 20_000 });
  ok(
    "saving an empty line is refused, and says what to do instead",
    /remove it rather than emptying it/.test(
      await page
        .locator('aside[aria-label="The toolbox"] [role="alert"]')
        .innerText(),
    ),
    oneLine(
      await page
        .locator('aside[aria-label="The toolbox"] [role="alert"]')
        .innerText(),
    ),
  );

  // ── typing ON THE PAGE, which is the whole point of editing in place ──────
  //
  // The first build put the words in a field beside the page and the operator
  // reported the page as broken: he clicked a paragraph, typed, and nothing
  // happened, because nothing was listening. These are the assertions that stop
  // that coming back.
  await page.goto(EDITOR);
  await preview(page);

  const spoken = await preview(page);
  const note = spoken.locator('[data-slot="turn.close"]');
  await note.scrollIntoViewIfNeeded();
  await note.click({ force: true });
  await page.waitForTimeout(700);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("The bracing for it stopped, and stayed stopped.");
  // Clicking away is what saves it — the same gesture as putting a pen down.
  await spoken.locator('[data-slot="turn.eyebrow"]').click({ force: true });
  await page.waitForTimeout(2200);
  await preview(page);

  ok(
    "a sentence typed ON THE PAGE is saved when she clicks away from it",
    (await textRow("draft", "turn.close")) ===
      "The bracing for it stopped, and stayed stopped.",
    String(await textRow("draft", "turn.close")),
  );

  // The line she added earlier, typed into on the page rather than in a field.
  const onPage = await preview(page);
  const line = onPage.locator(`[data-item="${items[0].id}"]`);
  await line.scrollIntoViewIfNeeded();
  await line.click({ force: true });
  await page.waitForTimeout(700);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Typed into the page, not into a box beside it.");
  await onPage
    .locator(`[data-section="${madeId}"] [data-handle="true"]`)
    .click({ force: true });
  await page.waitForTimeout(2200);
  await preview(page);
  ok(
    "and so is a line in a section she made",
    (
      await rowsOf(`SELECT text FROM "PageItem" WHERE id = $1`, [items[0].id])
    )[0].text === "Typed into the page, not into a box beside it.",
    JSON.stringify(
      await rowsOf(`SELECT text FROM "PageItem" WHERE id = $1`, [items[0].id]),
    ),
  );

  // ── a photograph is chosen by eye and described afterwards ────────────────
  //
  // Demanding the description AT THE MOMENT OF CHOOSING refused every picture
  // put on a section that had none — she picked one and nothing appeared, twice,
  // and the operator reported the page as broken. It was. Asking is not the
  // same as blocking, and this is the assertion that keeps them apart.
  await selectMade(page, madeId, /A section you added/);
  await page.getByRole("button", { name: /Choose a photograph/ }).click();
  await page.locator('[role="dialog"]').waitFor({ timeout: 30_000 });
  await page.locator('[role="dialog"] img').first().click({ force: true });
  await page.waitForTimeout(2400);
  await preview(page);

  const chosen = (
    await rowsOf(
      `SELECT "imageRef", "imageAlt" FROM "PageSection" WHERE id = $1`,
      [madeId],
    )
  )[0];
  ok(
    "a photograph is accepted with no description written yet",
    typeof chosen.imageRef === "string" && chosen.imageRef.length > 0,
    JSON.stringify(chosen),
  );
  await selectMade(page, madeId, /A section you added/);
  ok(
    "and the panel asks for one rather than having refused the picture",
    /no description yet/i.test(
      await page.locator('aside[aria-label="The toolbox"]').innerText(),
    ),
    oneLine(await page.locator('aside[aria-label="The toolbox"]').innerText()),
  );

  // ── a tab must never sit on top of what it labels ─────────────────────────
  //
  // Both of the editor's tabs are absolutely positioned INSIDE the thing they
  // select, and both have covered it: the block tab shrink-wrapped to a narrow
  // box, folded its label onto three lines, grew to 64px and swallowed the only
  // line in the box — so clicking those words selected the box instead, which
  // is what "words on a picture doesn't let me type" was. The geometry is the
  // assertion, because the symptom was invisible: everything looked right.
  await selectMade(page, madeId, /A section you added/);
  await page
    .locator('[data-add-kind="onplate"]')
    .getByRole("button", { name: "Centre" })
    .click();
  await page.waitForTimeout(2200);
  const framed = await preview(page);

  const clear = await framed
    .locator("[data-block]")
    .last()
    .evaluate((block) => {
      const tab = block.querySelector("[data-handle]");
      const line = block.querySelector("[data-item]");
      if (!tab || !line) return "missing";
      const t = tab.getBoundingClientRect();
      const l = line.getBoundingClientRect();
      const hit = document.elementFromPoint(
        l.x + l.width / 2,
        l.y + l.height / 2,
      );
      return JSON.stringify({
        overlaps: t.bottom > l.top,
        tabHeight: Math.round(t.height),
        hitIsTheTab: hit?.closest("[data-handle]") !== null,
      });
    });
  ok(
    "the tab on a box sits clear of the box, and the words in it take the click",
    clear ===
      JSON.stringify({
        overlaps: false,
        tabHeight: 28,
        hitIsTheTab: false,
      }),
    String(clear),
  );

  const onplateItem = (
    await rowsOf(
      `SELECT i.id FROM "PageItem" i JOIN "PageBlock" b ON b.id = i."blockId"
       WHERE b."sectionId" = $1 AND b.kind = 'onplate' ORDER BY i.id DESC LIMIT 1`,
      [madeId],
    )
  )[0];
  const words = framed.locator(`[data-item="${onplateItem.id}"]`);
  await words.scrollIntoViewIfNeeded();
  await words.click({ force: true });
  await page.waitForTimeout(700);
  await page.keyboard.type("Words set on the photograph itself.");
  await framed
    .locator(`[data-section="${madeId}"] [data-handle="true"]`)
    .click({ force: true });
  await page.waitForTimeout(2200);
  await preview(page);
  ok(
    "so words on the picture can be typed, which they could not be",
    (
      await rowsOf(`SELECT text FROM "PageItem" WHERE id = $1`, [
        onplateItem.id,
      ])
    )[0].text === "Words set on the photograph itself.",
    JSON.stringify(
      await rowsOf(`SELECT text FROM "PageItem" WHERE id = $1`, [
        onplateItem.id,
      ]),
    ),
  );

  // ── bigger and smaller, in bounded steps ──────────────────────────────────
  await select(page, '[data-slot="crown.ask"]', /The heading/);
  await press(page, /^Bigger$/);
  await press(page, /^Bigger$/);
  const bigger = await rowsOf(
    `SELECT size, value FROM "PageText" WHERE page='home' AND state='draft' AND key='crown.ask'`,
  );
  ok(
    "two steps bigger is stored as two steps, not as a number of pixels",
    bigger[0]?.size === 2,
    JSON.stringify(bigger),
  );
  ok(
    "and the page carries it, so what she sees is the size it will be",
    (await (
      await preview(page)
    )
      .locator('[data-slot="crown.ask"]')
      .getAttribute("data-size")) === "2",
  );
  await press(page, /Back to the designed size/);
  ok(
    "putting it back to the designed size clears the row entirely",
    (await textRow("draft", "crown.ask")) === null,
  );

  // ── a link keeps its target when only its label is retyped ────────────────
  const linkFrame = await preview(page);
  const linkEl = linkFrame.locator('[data-slot="sacral.link"]');
  await linkEl.scrollIntoViewIfNeeded();
  await linkEl.click({ force: true });
  await page.waitForTimeout(700);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("See the dates for this month");
  await linkFrame.locator('[data-slot="sacral.note"]').click({ force: true });
  await page.waitForTimeout(2200);
  await preview(page);
  ok(
    "retyping a link's label on the page keeps where it goes",
    (await textRow("draft", "sacral.link")) ===
      "See the dates for this month" + "\n" + "#dates",
    String(await textRow("draft", "sacral.link")),
  );

  // == SHE CAN SET AN EDGE, MAKE ROOM, AND CUT A PICTURE TO A SHAPE ==========
  //
  // Four controls the operator asked for on 2026-08-20, and one bug that came
  // with the first of them: a button she put in a box of words was MAGENTA ON
  // MAGENTA, because home.css's `.pool a` (0,1,1) outranks `.free__button`
  // (0,1,0) and painted the label in its own background colour. Invisible until
  // hover, when the ground turned plum and a label appeared out of nowhere.
  // home.css had already lost this exact collision once with `a.cta` and fixed
  // it the same way; the pages panel reintroduced it with a new class.
  //
  // EVERY ASSERTION HERE IS COMPUTED STYLE OR GEOMETRY, not a row in a table.
  // A row saying `shape: circle` is not a circle, and the whole class of bug
  // this section exists for is one where the data was right and the page was
  // not.
  console.log("\nAN EDGE, SOME ROOM, AND A SHAPE\n");

  await page.goto(EDITOR);
  await preview(page);

  const boxId = blocks[0].id;
  await selectMade(page, madeId, /A section you added/);

  {
    const frame = await preview(page);
    await frame
      .locator(`[data-block="${boxId}"] [data-handle="block"]`)
      .click({ force: true });
    await page.waitForTimeout(1200);
    await page
      .getByRole("button", { name: "Button", exact: true })
      .first()
      .click();
    await page.waitForTimeout(2200);
  }

  const btnItem = (
    await rowsOf(
      `SELECT id FROM "PageItem" WHERE "blockId"=$1 AND kind='button' ORDER BY id DESC`,
      [boxId],
    )
  )[0].id;

  {
    const frame = await preview(page);
    const btn = frame
      .locator(`[data-block="${boxId}"] [data-placeholder]`)
      .last();
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
    await page.waitForTimeout(700);
    await page.keyboard.type("Book a session");
    await frame
      .locator(`[data-block="${boxId}"]`)
      .click({ force: true, position: { x: 5, y: 5 } });
    await page.waitForTimeout(2400);
  }

  const label = await (
    await preview(page)
  )
    .locator(`[data-block="${boxId}"] .free__button`)
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return { colour: cs.color, ground: cs.backgroundColor };
    });
  ok(
    "a button's label is not painted in its own background colour",
    label.colour !== label.ground,
    JSON.stringify(label),
  );
  ok(
    "it is the blush the composition's own button uses",
    label.colour === "rgb(251, 243, 241)",
    JSON.stringify(label),
  );

  // A line can be set to its own edge, and a BUTTON has to move by
  // `align-self` -- it is inline-block in a flex column, so text-align on it
  // moves nothing at all.
  {
    const frame = await preview(page);
    await frame
      .locator(`[data-block="${boxId}"] .free__button`)
      .click({ force: true });
    await page.waitForTimeout(1200);
    await page
      .getByRole("button", { name: "Centre", exact: true })
      .last()
      .click();
    await page.waitForTimeout(2200);
  }
  ok(
    "a line can be set to an edge of its own",
    (await rowsOf(`SELECT align FROM "PageItem" WHERE id=$1`, [btnItem]))[0]
      .align === "centre",
  );
  ok(
    "and a button actually moves, which text-align alone would not do",
    (await (
      await preview(page)
    )
      .locator(`[data-block="${boxId}"] .free__button`)
      .evaluate((el) => getComputedStyle(el).alignSelf)) === "center",
  );

  // Room in the band, before a picture has anywhere to be.
  await selectMade(page, madeId, /A section you added/);
  const bandBefore = await (
    await preview(page)
  )
    .locator(`[data-section="${madeId}"]`)
    .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
  await press(page, "+ Taller");
  await press(page, "+ Taller");
  const bandAfter = await (
    await preview(page)
  )
    .locator(`[data-section="${madeId}"]`)
    .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
  ok(
    "two steps taller is recorded",
    (await rowsOf(`SELECT tall FROM "PageSection" WHERE id=$1`, [madeId]))[0]
      .tall === 2,
  );
  ok(
    "and the band really is deeper than it was",
    bandAfter > bandBefore,
    `${bandBefore} -> ${bandAfter}`,
  );

  // A band is a letterbox cut out of a tall photograph, so where it looks is
  // hers. (This section already has one, chosen by eye further up.)
  await selectMade(page, madeId, /A section you added/);
  await press(page, /Up$/);
  ok(
    "the band's photograph can be moved up",
    (
      await rowsOf(`SELECT "focusY" FROM "PageSection" WHERE id=$1`, [madeId])
    )[0].focusY === 40,
  );
  ok(
    "and the photograph is actually looking there",
    (
      await (
        await preview(page)
      )
        .locator(`[data-section="${madeId}"] img.plate`)
        .evaluate((el) => getComputedStyle(el).objectPosition)
    ).includes("40%"),
  );

  // A picture cut to a shape -- and NOTHING offered until there is a picture,
  // because three shapes for an empty box is a decision about nothing.
  await selectMade(page, madeId, /A section you added/);
  await page
    .locator('[data-add-kind="picture"]')
    .getByRole("button", { name: "Left" })
    .click();
  await page.waitForTimeout(2400);
  const picId = (
    await rowsOf(
      `SELECT b.id FROM "PageBlock" b JOIN "PageSection" s ON s.id=b."sectionId"
       WHERE s.id=$1 AND b.kind='picture' ORDER BY b.id DESC`,
      [madeId],
    )
  )[0].id;

  {
    const frame = await preview(page);
    await frame
      .locator(`[data-block="${picId}"] [data-handle="block"]`)
      .click({ force: true });
    await page.waitForTimeout(1200);
  }
  ok(
    "no shape is offered for a picture that has not been chosen yet",
    !(
      await page.locator('aside[aria-label="The toolbox"]').innerText()
    ).includes("Its shape"),
  );

  await page.getByRole("button", { name: /Choose a picture/ }).click();
  await page.locator('[role="dialog"]').waitFor({ timeout: 30_000 });
  await page.locator('[role="dialog"] img').first().click({ force: true });
  await page.waitForTimeout(2600);
  {
    const frame = await preview(page);
    await frame
      .locator(`[data-block="${picId}"] [data-handle="block"]`)
      .click({ force: true });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await page.waitForTimeout(2400);
  }
  const round = await (
    await preview(page)
  )
    .locator(`[data-block="${picId}"] img`)
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        radius: cs.borderRadius,
        fit: cs.objectFit,
        square: Math.abs(box.width - box.height) < 2,
      };
    });
  ok(
    "a picture cut to a circle is round, square-framed, and cropped rather than squashed",
    round.radius === "50%" && round.fit === "cover" && round.square,
    JSON.stringify(round),
  );

  {
    const frame = await preview(page);
    await frame
      .locator(`[data-block="${picId}"] [data-handle="block"]`)
      .click({ force: true });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /Down$/ }).first().click();
    await page.waitForTimeout(2200);
  }
  ok(
    "and what stays in frame once it crops is hers to choose",
    (await rowsOf(`SELECT "focusY" FROM "PageBlock" WHERE id=$1`, [picId]))[0]
      .focusY === 60,
  );

  // ── out it goes ───────────────────────────────────────────────────────────
  await page.goto(EDITOR);
  await preview(page);
  const pendingText = await page
    .locator('aside[aria-label="The toolbox"]')
    .innerText();
  ok(
    "the publish bar itemises everything waiting, not just a count",
    /changes? not published/i.test(pendingText) &&
      /taken off the page/i.test(pendingText) &&
      /a section you added/i.test(pendingText) &&
      /Before and after/i.test(pendingText),
    oneLine(pendingText),
  );

  await page.getByRole("button", { name: /^Publish$/ }).click();
  await page.getByRole("button", { name: /Yes, publish it/ }).click();
  await page.waitForTimeout(2500);

  // PUBLISH HAS TO COPY EVERY COLUMN, and it did not.
  //
  // `PageItem.size` was already being dropped before any of the 2026-08-20
  // controls existed: she made a line bigger, published, and the live page went
  // out at the size she had not chosen — draft right, site wrong, difference
  // one column, nothing anywhere saying so. Four more fields landed the same
  // day, which would have been four more of exactly that.
  //
  // So this reads the LIVE rows and compares them to the draft ones, field by
  // field, rather than looking at the page and being satisfied that the section
  // arrived. A section that arrives with its shape and its height left behind
  // has still arrived.
  const liveCarried = await rowsOf(
    `SELECT s.tall, s."focusY" AS section_focus,
            b.shape, b."focusX" AS block_x, b."focusY" AS block_y,
            i.size, i.align
       FROM "PageSection" s
       JOIN "PageBlock" b ON b."sectionId" = s.id
       LEFT JOIN "PageItem" i ON i."blockId" = b.id
      WHERE s.page = 'home' AND s.state = 'live' AND s.kind = 'free'`,
  );
  ok(
    "publishing carries the height and the focus she set on the band",
    liveCarried.some((row) => row.tall === 2 && row.section_focus === 40),
    JSON.stringify(liveCarried),
  );
  ok(
    "and the shape she cut the picture to, with what stays in frame",
    liveCarried.some(
      (row) =>
        row.shape === "circle" && row.block_y === 60 && row.block_x === 50,
    ),
    JSON.stringify(liveCarried),
  );
  ok(
    "and the edge she set one line to",
    liveCarried.some((row) => row.align === "centre"),
    JSON.stringify(liveCarried),
  );

  const after = await publicHome();
  ok(
    "publishing puts the section she made in front of a visitor",
    after.includes("Typed into the page, not into a box beside it."),
    oneLine(after.slice(0, 200)),
  );
  ok(
    "and takes the hidden beat off the public page",
    !after.includes("The bracing for it stopped."),
  );
  ok(
    "the hidden beat is still in the database, not destroyed",
    (await sectionRows("live")).some(
      (row) => row.beatKey === "turn" && row.hidden,
    ),
  );
  ok(
    "the six that were not hidden are all still there, plus the one she made",
    (after.match(/<section /g) ?? []).length === 7,
    String((after.match(/<section /g) ?? []).length),
  );
  ok(
    "and the public page still carries none of the editor's marks",
    !after.includes("data-section=") && !after.includes("data-block="),
  );

  await page.goto(EDITOR);
  await preview(page);
  ok(
    "nothing is left waiting once it has gone out",
    /Nothing is waiting/i.test(
      await page.locator('aside[aria-label="The toolbox"]').innerText(),
    ),
    oneLine(await page.locator('aside[aria-label="The toolbox"]').innerText()),
  );

  // ── pressing publish again does not rewrite every live row ────────────────
  const liveIdsBefore = (await sectionRows("live")).map((row) => row.id).join();
  await page.getByRole("button", { name: /^Publish$/ }).click({ force: true });
  await page.waitForTimeout(1200);
  ok(
    "and publishing with nothing pending is refused rather than done again",
    (await sectionRows("live")).map((row) => row.id).join() === liveIdsBefore,
  );

  // ── starting again from what is live ──────────────────────────────────────
  await select(page, '[data-slot="crown.ask"]', /The heading/);
  await page
    .locator("aside input")
    .first()
    .fill("Something she typed by mistake");
  await press(page, /^Save$/);
  ok(
    "a mistake is in the draft",
    (await textRow("draft", "crown.ask")) === "Something she typed by mistake",
  );

  await page
    .getByRole("button", { name: /Start again from what is live/ })
    .click();
  await page.getByRole("button", { name: /Throw it away/ }).click();
  await page.waitForTimeout(2500);
  ok(
    "and throwing the draft away puts back exactly what is on the site",
    (await textRow("draft", "crown.ask")) === null &&
      (await textRow("live", "crown.ask")) === null,
  );
  ok(
    "with the published section she made still in the draft, because it is live",
    (await sectionRows("draft")).filter((row) => row.kind === "free").length ===
      1,
  );

  // ── the operator's own data, again, at the end ────────────────────────────
  const b25After = await rowsOf(
    `SELECT id, status, "totalPence" FROM "Booking" WHERE id = 25`,
  );
  ok(
    "Booking 25 is exactly as it was when this started",
    JSON.stringify(b25After) === JSON.stringify(b25Before),
    JSON.stringify({ before: b25Before, after: b25After }),
  );

  ok(
    "and the browser complained about nothing, on either document, all run",
    complaints.length === 0,
    complaints.slice(0, 3).join(" · "),
  );

  // ── the one that matters most ─────────────────────────────────────────────
  ok(
    "NOT ONE MESSAGE IN THIS RUN WAS ADDRESSED TO HER",
    !server.out().includes(`To:       ${HERS}`),
  );
  ok(
    "and this screen sends nothing at all — a page has no recipients",
    !/──────────── EMAIL/.test(server.out()),
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
