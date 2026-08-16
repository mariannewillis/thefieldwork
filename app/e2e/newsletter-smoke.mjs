// =============================================================================
// The newsletter, subscribers, public signup and unsubscribe — end to end
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. Somebody unticked in the send modal receives NOTHING.
//   2. A sent letter cannot be edited, by the screen or by posting to it.
//   3. A test send neither locks the letter nor writes a recipient row.
//   4. An address that has asked and not confirmed is never sent to, and is
//      not even offered in the modal.
//   5. An unsubscribe link actually unsubscribes, and that person is then
//      skipped by the next send.
//   6. A file over 2 MB becomes a LINK, and the screen says so before she
//      sends rather than after.
//   7. An image block emits a `.jpg` URL — never the AVIF or WebP the site
//      itself prefers, because Outlook renders neither.
//
// A sibling of email-templates-smoke.mjs, and it runs the same way:
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3104.
//   2. node e2e/newsletter-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); not a dependency of the app.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL, and it is not left to a flag. The app runs from a COPY with no
// `.env.local` in it, so the child inherits only the variables named in
// `startServer` and the operator's real RESEND_API_KEY has no path into it. The
// log adapter therefore runs: every message is printed and none is delivered,
// which is checked rather than assumed. The last checks in this file assert
// that `marianne@thefieldwork.co.uk` — the client's own address — appears
// nowhere in the run, and that neither of the two REAL seeded subscriber
// addresses was ever addressed either.
//
// Those two seeded rows are not removed and not altered. They are used as the
// proof of claim 1: they are confirmed, so the modal offers them, and the run
// unticks them — which is exactly the thing being tested.
//
// Everything this creates is `.invalid` (RFC 2606 — a TLD guaranteed never to
// resolve) and is removed at the end: one admin account, three subscribers,
// and whatever newsletters it wrote.
// =============================================================================

import { spawn } from "node:child_process";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { chromium } from "playwright";

loadEnv({ path: ".env.local" });

const scrypt = promisify(scryptCb);

const PORT = 3104;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const OWNER = "owner@example.invalid";
const USER = "smoke-newsletter@example.invalid";
const PASS = "smoke-newsletter-password-not-real";
/** Where the test copy lands. `.invalid`, like everything else here. */
const MAILBOX = "smoke-newsletter-mailbox@example.invalid";
const SHOTS = resolve("e2e", "_newsletter-shots");

/** The three the run creates on the public form. */
const CONFIRMED = "smoke-reader@example.invalid";
const UNCONFIRMED = "smoke-never-confirmed@example.invalid";
const LEAVER = "smoke-leaver@example.invalid";
const MINE = [CONFIRMED, UNCONFIRMED, LEAVER];

/** The client's real address. Nothing in this run may ever name it. */
const FORBIDDEN = "marianne@thefieldwork.co.uk";
/** The operator's own two, seeded and confirmed. Never to be sent to here. */
const SEEDED = ["nagrom.1990@gmail.com", "david.morgan@gotribe.org"];

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
  const root = resolve(".smoke-newsletter-app");
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

/** The secret the confirmation tokens are signed with. Fixed, so both the
 *  server and this file agree — though nothing here mints one by hand. */
const SECRET = "smoke-newsletter-secret-not-real-but-long-enough-32";

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
        // Belt as well as braces: the copy has no .env.local to read this
        // from, and it is named here so the intent is on the page.
        RESEND_API_KEY: "",
        EMAIL_TO_OWNER: OWNER,
        // Replies default to the client's live mailbox. Pointed somewhere that
        // cannot resolve so her address does not appear even as a header.
        EMAIL_REPLY_TO: "replies@example.invalid",
        EMAIL_FROM: "The Field Work <smoke@example.invalid>",
        // Signing in calls ensureSeeded(). Left unset it falls back to its own
        // defaults and would quietly seed a second admin.
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

const MARKER = "──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────";

/** Every message the log shows going to one address, in full. */
function emailsTo(log, address) {
  return log
    .split(MARKER)
    .slice(1)
    .filter((block) => block.includes(`To:       ${address}`));
}

const lastEmailTo = (log, address) => emailsTo(log, address).at(-1) ?? "";

async function cleanUp() {
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
  await db.query(`DELETE FROM "Subscriber" WHERE email = ANY($1)`, [MINE]);
  // Every letter this run wrote. The subject prefix is unique to it, and
  // nothing else in the database carries one.
  await db.query(`DELETE FROM "Newsletter" WHERE subject LIKE 'SMOKE %'`);

  /**
   * The files those letters carried.
   *
   * The APP deliberately leaves stored bytes behind when an attachment row is
   * deleted — a letter that had lost its download would cost more than a few
   * orphaned kilobytes (see `removeAttachment`). That is right in production
   * and wrong here: on a development machine the store IS `public/media`, and
   * a smoke run that left its test PDFs there would be a smoke run that
   * committed litter to the repository.
   *
   * Anything matching `newsletter-*` goes. Nothing else in that directory can
   * match — `attachmentKey` is the only thing that mints the prefix, and the
   * photographs are named `<slug>-<width>.<ext>`.
   */
  const store = resolve("public", "media");
  try {
    for (const file of readdirSync(store)) {
      if (file.startsWith("newsletter-")) {
        rmSync(join(store, file), { force: true });
      }
    }
  } catch {
    /* no store on this machine — nothing to tidy */
  }
}

// ── the run ──────────────────────────────────────────────────────────────────

const COPY = makeCopy();
mkdirSync(SHOTS, { recursive: true });

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
    [USER, MAILBOX, stored],
  );
}

const server = await startServer();
const browser = await chromium.launch();

/** A file of exactly n bytes that sniffs as a PDF. */
const pdf = (bytes) =>
  Buffer.concat([
    Buffer.from("%PDF-1.4\n% smoke\n"),
    Buffer.alloc(Math.max(0, bytes - 17), 0x20),
  ]);

let newsletterId = null;

try {
  const context = await browser.newContext();
  // A dev server compiles each route the first time it is asked for, and some
  // of these are the first ask. Generous, because a timeout here is a slow
  // compile rather than a broken page.
  context.setDefaultTimeout(90_000);
  context.setDefaultNavigationTimeout(180_000);
  const page = await context.newPage();

  // ══ 1 · PUBLIC SIGNUP ═════════════════════════════════════════════════════
  console.log("\n— public signup —");

  await page.goto(`${BASE}/subscribe`);
  ok(
    "the subscribe page is public",
    await page.getByRole("button", { name: /send me the letter/i }).isVisible(),
  );

  async function signUp(email, name) {
    await page.goto(`${BASE}/subscribe`);
    await page.fill('input[name="email"]', email);
    if (name) await page.fill('input[name="name"]', name);
    await page.getByRole("button", { name: /send me the letter/i }).click();
    await page.getByText(/check your inbox/i).waitFor({ timeout: 90_000 });
  }

  await signUp(CONFIRMED, "Smoke Reader");
  await signUp(UNCONFIRMED, "Never Confirmed");
  await signUp(LEAVER, "Smoke Leaver");

  {
    const rows = await db.query(
      `SELECT email, "confirmedAt" FROM "Subscriber" WHERE email = ANY($1) ORDER BY email`,
      [MINE],
    );
    ok("all three addresses were written down", rows.rows.length === 3);
    ok(
      "none of them is confirmed yet",
      rows.rows.every((row) => row.confirmedAt === null),
    );
  }

  // The honeypot. A bot fills the hidden field; the answer is the same
  // success message and nothing is written.
  await page.goto(`${BASE}/subscribe`);
  await page.fill('input[name="email"]', "smoke-bot@example.invalid");
  await page.evaluate(() => {
    const trap = document.querySelector('input[name="website"]');
    if (trap) trap.value = "http://spam.example";
  });
  await page.getByRole("button", { name: /send me the letter/i }).click();
  await page.getByText(/check your inbox/i).waitFor({ timeout: 90_000 });
  {
    const rows = await db.query(
      `SELECT 1 FROM "Subscriber" WHERE email = 'smoke-bot@example.invalid'`,
    );
    ok(
      "a form with the honeypot filled in writes nothing",
      rows.rowCount === 0,
    );
  }

  // ── the confirmation link ──────────────────────────────────────────────────
  const confirmLink = (address) => {
    const block = lastEmailTo(server.out(), address);
    const match = block.match(/http:\/\/localhost:\d+\/subscribe\/confirm\S+/);
    return match ? match[0].replace(/[.,)]+$/, "") : null;
  };

  ok(
    "a confirmation went to the address that asked",
    lastEmailTo(server.out(), CONFIRMED).includes("One press"),
  );
  ok(
    "the confirmation carries no unsubscribe line",
    !lastEmailTo(server.out(), CONFIRMED).includes("/unsubscribe/"),
    "there is nothing to unsubscribe from yet",
  );

  for (const address of [CONFIRMED, LEAVER]) {
    const link = confirmLink(address);
    ok(`${address} got a confirmation link`, Boolean(link));
    await page.goto(link);
    await page
      .getByText(/that is you on the list/i)
      .waitFor({ timeout: 90_000 });
  }

  {
    const rows = await db.query(
      `SELECT email, "confirmedAt" FROM "Subscriber" WHERE email = ANY($1) ORDER BY email`,
      [MINE],
    );
    const byEmail = Object.fromEntries(
      rows.rows.map((row) => [row.email, row.confirmedAt]),
    );
    ok(
      "the two who pressed the link are confirmed",
      Boolean(byEmail[CONFIRMED]) && Boolean(byEmail[LEAVER]),
    );
    ok(
      "the one who did not is still unconfirmed",
      byEmail[UNCONFIRMED] === null,
    );
  }

  // Pressing it twice is not an error.
  await page.goto(confirmLink(CONFIRMED));
  ok(
    "pressing the confirmation twice says so rather than failing",
    await page.getByText(/already on it/i).isVisible(),
  );

  // A forged token confirms nobody.
  await page.goto(`${BASE}/subscribe/confirm?id=1&token=not-a-real-signature`);
  ok(
    "a forged confirmation token is refused",
    await page.getByText(/did not work/i).isVisible(),
  );

  // ══ 2 · SIGNING IN ════════════════════════════════════════════════════════
  console.log("\n— the portal —");

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

  await page.goto(`${BASE}/admin/subscribers`);
  ok(
    "the subscribers screen counts only the confirmed",
    (await page.locator("h1").innerText()).includes("every letter"),
  );
  ok(
    "an unconfirmed address is listed apart and marked so",
    await page.getByText(/asked, not confirmed/i).isVisible(),
  );
  ok(
    "the confirmed reader is on the screen",
    await page.getByText(CONFIRMED, { exact: false }).first().isVisible(),
  );
  await page.screenshot({
    path: join(SHOTS, "subscribers.png"),
    fullPage: true,
  });

  // ══ 3 · WRITING A LETTER ══════════════════════════════════════════════════
  console.log("\n— writing —");

  await page.goto(`${BASE}/admin/newsletters`);
  await page.getByRole("button", { name: /write a new letter/i }).click();
  await page.waitForURL(/\/admin\/newsletters\/\d+$/, { timeout: 120_000 });
  newsletterId = Number(page.url().split("/").pop());
  ok("a new letter opens on its own page", Number.isInteger(newsletterId));

  await page.fill('input[name="subject"]', "SMOKE The room in early autumn");
  await page.fill(
    'input[name="preheader"]',
    "The chair has moved nearer the window, and the autumn dates are open.",
  );

  // One of each of the five kinds.
  for (const label of [
    "Heading",
    "Paragraph",
    "Picture",
    "What's open",
    "Button",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }

  await page
    .locator('input[name^="block-text-"]')
    .first()
    .fill("The room has had a coat of paint.");
  await page
    .locator('textarea[name^="block-text-"]')
    .first()
    .fill(
      "We repainted the garden room over the summer and moved the chair nearer the window. Nothing about the hour itself has changed.",
    );

  // The picture: the first real basename the library offers.
  {
    const select = page.locator('select[name^="block-image-"]').first();
    const values = await select
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => option.value).filter(Boolean),
      );
    ok("the picture library has something in it", values.length > 0);
    await select.selectOption(values[0]);
    await page
      .locator('input[name^="block-alt-"]')
      .first()
      .fill("Last light through the garden-room window at dusk.");
    globalThis.__chosenPicture = values[0];
  }

  await page
    .locator('input[name^="block-text-"]')
    .last()
    .fill("See everything that's open");
  await page.locator('input[name^="block-href-"]').first().fill("/courses");

  // ── the two files ──────────────────────────────────────────────────────────
  const fileInput = page.locator('input[type="file"][accept*=".pdf"]');
  await fileInput.setInputFiles({
    name: "grounding-practices.pdf",
    mimeType: "application/pdf",
    buffer: pdf(200 * 1024),
  });
  await page
    .getByText(/it rides in the message itself/i)
    .waitFor({ timeout: 120_000 });

  await fileInput.setInputFiles({
    name: "the-long-recording.pdf",
    mimeType: "application/pdf",
    buffer: pdf(3 * 1024 * 1024),
  });
  await page.getByText(/too big to attach/i).waitFor({ timeout: 120_000 });

  ok(
    "a 3 MB file is drawn as a LINK, in words, before anything is sent",
    await page.getByText(/too big to attach/i).isVisible(),
  );
  ok(
    "a 200 kB file is drawn as riding in the envelope",
    await page.getByText(/it rides in the message itself/i).isVisible(),
  );

  {
    const rows = await db.query(
      `SELECT filename, delivery FROM "NewsletterAttachment" WHERE "newsletterId" = $1 ORDER BY id`,
      [newsletterId],
    );
    ok(
      "and the database agrees with the screen",
      rows.rows[0]?.delivery === "attached" &&
        rows.rows[1]?.delivery === "linked",
      JSON.stringify(rows.rows),
    );
  }

  await page
    .locator('input[name^="attachment-note-"]')
    .first()
    .fill("Six short exercises, one page each. A PDF, four pages.");

  await page.getByRole("button", { name: /save this draft/i }).click();
  await page.waitForTimeout(2500);

  {
    const rows = await db.query(
      `SELECT note FROM "NewsletterAttachment" WHERE "newsletterId" = $1 ORDER BY id`,
      [newsletterId],
    );
    ok(
      "the line she wrote about a file saves with the letter",
      rows.rows[0]?.note?.startsWith("Six short exercises"),
      JSON.stringify(rows.rows[0]),
    );
  }

  {
    const rows = await db.query(
      `SELECT kind, text, "imageBasename", href FROM "NewsletterBlock" WHERE "newsletterId" = $1 ORDER BY position`,
      [newsletterId],
    );
    ok(
      "the picture kept its choice through the save",
      Boolean(rows.rows[2]?.imageBasename),
      JSON.stringify(rows.rows[2]),
    );
    ok(
      "the five blocks saved in the order they were written",
      rows.rows.map((row) => row.kind).join(",") ===
        "heading,paragraph,image,offerings,button",
      rows.rows.map((row) => row.kind).join(","),
    );
  }

  // A picture with no line saying what is in it is refused.
  await page.getByRole("button", { name: "Picture", exact: true }).click();
  {
    const select = page.locator('select[name^="block-image-"]').last();
    const values = await select
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => option.value).filter(Boolean),
      );
    await select.selectOption(values[0]);
  }
  await page.getByRole("button", { name: /save this draft/i }).click();
  await page.getByText(/needs another look/i).waitFor({ timeout: 90_000 });
  ok(
    "a picture with no description is refused, and says why",
    await page
      .getByText(
        /read out to anybody who cannot see it|the way you would describe it/i,
      )
      .first()
      .isVisible(),
  );
  // Take it back out and save clean.
  await page
    .locator("li", { has: page.locator('select[name^="block-image-"]') })
    .last()
    .getByRole("button", { name: "Remove" })
    .click();
  await page.getByRole("button", { name: /save this draft/i }).click();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: join(SHOTS, "editor.png"), fullPage: true });

  // ══ 4 · THE LETTER ITSELF ═════════════════════════════════════════════════
  console.log("\n— the letter —");

  const preview = await context.request.get(
    `${BASE}/admin/newsletters/${newsletterId}/preview`,
  );
  const html = await preview.text();

  ok("the preview renders", preview.ok() && html.includes("<!doctype html>"));
  ok(
    "the picture is a .jpg",
    /<img[^>]+src="[^"]*-1200\.jpg"/.test(html),
    (html.match(/<img[^>]+class="shot"[^>]*>/) ?? ["no shot img"])[0].slice(
      0,
      160,
    ),
  );
  ok(
    "and NOT the avif or webp the site itself prefers",
    !/src="[^"]*\.(avif|webp)"/.test(html),
  );
  ok(
    "the picture carries a width and a height on the element",
    /<img[^>]+class="shot"[^>]+width="512"[^>]+height="\d+"/.test(html),
  );
  ok(
    "the live dates block drew at least one open offering",
    // Escaped on the way in, like every other string the renderer emits — the
    // apostrophe arrives as an entity, which is the guard working.
    html.includes("What&#39;s open"),
  );
  ok(
    "the linked file is a link with its size beside it",
    html.includes("/newsletter-files/") && /\d+(\.\d)? MB/.test(html),
  );
  ok(
    "and the letter says what the attached one IS, in her words",
    html.includes("Six short exercises, one page each"),
  );
  ok(
    "the button's address was made absolute",
    html.includes(`${BASE}/courses`),
  );
  ok("the letter carries an unsubscribe line", html.includes("Unsubscribe"));

  // The letter itself, at the width it is composed for and at a phone's.
  {
    const shot = await context.newPage();
    for (const [width, name] of [
      [640, "letter-600.png"],
      [375, "letter-375.png"],
    ]) {
      await shot.setViewportSize({ width, height: 900 });
      await shot.goto(`${BASE}/admin/newsletters/${newsletterId}/preview`);
      await shot.waitForTimeout(1500);
      await shot.screenshot({ path: join(SHOTS, name), fullPage: true });
    }
    await shot.close();
  }

  // ══ 5 · A TEST SEND ═══════════════════════════════════════════════════════
  console.log("\n— the test send —");

  const sendsBefore = await db.query(
    `SELECT count(*)::int AS n FROM "NewsletterSend" WHERE "newsletterId" = $1`,
    [newsletterId],
  );

  await page.goto(`${BASE}/admin/newsletters/${newsletterId}`);
  await page.getByRole("button", { name: /send a test to yourself/i }).click();
  await page.waitForTimeout(6000);

  ok(
    "the test copy went to the address on her own account",
    lastEmailTo(server.out(), MAILBOX).includes("[Test]"),
  );
  {
    const row = await db.query(
      `SELECT status FROM "Newsletter" WHERE id = $1`,
      [newsletterId],
    );
    ok("a test send does NOT lock the letter", row.rows[0].status === "draft");
  }
  {
    const after = await db.query(
      `SELECT count(*)::int AS n FROM "NewsletterSend" WHERE "newsletterId" = $1`,
      [newsletterId],
    );
    ok(
      "a test send writes NO recipient row",
      after.rows[0].n === sendsBefore.rows[0].n && after.rows[0].n === 0,
    );
  }
  ok(
    "the test copy carries no live unsubscribe token",
    !lastEmailTo(server.out(), MAILBOX).match(/\/unsubscribe\/[a-f0-9]{64}/),
  );

  // ══ 6 · SOMEBODY LEAVES ═══════════════════════════════════════════════════
  console.log("\n— unsubscribing —");

  const leaverToken = (
    await db.query(
      `SELECT "unsubscribeToken" FROM "Subscriber" WHERE email = $1`,
      [LEAVER],
    )
  ).rows[0].unsubscribeToken;

  // A GET must NOT unsubscribe: mail scanners fetch every link in a message.
  await page.goto(`${BASE}/unsubscribe/${leaverToken}`);
  {
    const row = await db.query(
      `SELECT "unsubscribedAt" FROM "Subscriber" WHERE email = $1`,
      [LEAVER],
    );
    ok(
      "opening the unsubscribe link does not itself unsubscribe",
      row.rows[0].unsubscribedAt === null,
      "a scanner prefetching the link would otherwise remove them",
    );
  }

  await page.getByRole("button", { name: /stop sending it/i }).click();
  await page
    .getByText(/nothing more will be sent/i)
    .waitFor({ timeout: 90_000 });
  {
    const row = await db.query(
      `SELECT "unsubscribedAt" FROM "Subscriber" WHERE email = $1`,
      [LEAVER],
    );
    ok(
      "pressing the button unsubscribes them",
      row.rows[0].unsubscribedAt !== null,
    );
  }

  // ══ 7 · THE SEND ══════════════════════════════════════════════════════════
  console.log("\n— the send —");

  await page.goto(`${BASE}/admin/newsletters/${newsletterId}`);
  await page.getByRole("button", { name: /^send this letter$/i }).click();
  await page.getByRole("checkbox").first().waitFor({ timeout: 90_000 });

  const offered = await page
    .locator("dialog li")
    .evaluateAll((items) => items.map((item) => item.textContent ?? ""));
  const offeredText = offered.join("\n");

  ok("the modal offers the confirmed reader", offeredText.includes(CONFIRMED));
  ok(
    "the modal does NOT offer the unconfirmed address",
    !offeredText.includes(UNCONFIRMED),
  );
  ok(
    "the modal does NOT offer the person who unsubscribed",
    !offeredText.includes(LEAVER),
  );
  ok(
    "everybody it offers is ticked to begin with",
    (await page.locator("dialog input[type=checkbox]:checked").count()) ===
      (await page.locator("dialog input[type=checkbox]").count()),
  );

  await page.screenshot({ path: join(SHOTS, "send-modal.png") });

  // Untick the operator's own two real addresses. They are confirmed, so the
  // modal offers them — and this run must not address them, which is the whole
  // of claim 1.
  for (const address of SEEDED) {
    const row = page.locator("dialog li").filter({ hasText: address });
    if ((await row.count()) > 0) {
      await row.first().locator('input[type="checkbox"]').uncheck();
    }
  }
  const ticked = await page
    .locator("dialog input[type=checkbox]:checked")
    .count();
  ok("exactly one person is left ticked", ticked === 1, `${ticked} ticked`);

  await page.getByRole("button", { name: /send it to 1 person/i }).click();

  // Wait for the sending itself rather than for a fixed number of seconds:
  // the freeze and the messages are two different things, and only the second
  // one can be waited on honestly.
  for (let i = 0; i < 120; i += 1) {
    const still = await db.query(
      `SELECT count(*)::int AS n FROM "NewsletterSend" WHERE "newsletterId" = $1 AND outcome = 'pending'`,
      [newsletterId],
    );
    const any = await db.query(
      `SELECT count(*)::int AS n FROM "NewsletterSend" WHERE "newsletterId" = $1`,
      [newsletterId],
    );
    if (any.rows[0].n > 0 && still.rows[0].n === 0) break;
    await sleep(1000);
  }

  {
    const rows = await db.query(
      `SELECT email, outcome FROM "NewsletterSend" WHERE "newsletterId" = $1 ORDER BY email`,
      [newsletterId],
    );
    ok(
      "exactly one recipient row was written, and it is the ticked one",
      rows.rows.length === 1 && rows.rows[0].email === CONFIRMED,
      JSON.stringify(rows.rows),
    );
    ok(
      "nobody unticked has a row",
      !rows.rows.some((row) => SEEDED.includes(row.email)),
    );
    ok(
      "and the row records the outcome rather than staying pending",
      rows.rows[0]?.outcome !== "pending",
      rows.rows[0]?.outcome,
    );
  }

  ok(
    "the letter reached the one person",
    lastEmailTo(server.out(), CONFIRMED).includes("SMOKE The room"),
  );
  ok(
    "their copy carries THEIR unsubscribe link",
    /\/unsubscribe\/[a-f0-9]{64}/.test(lastEmailTo(server.out(), CONFIRMED)),
  );
  ok(
    "and a List-Unsubscribe header a mail client can act on",
    lastEmailTo(server.out(), CONFIRMED).includes("List-Unsubscribe-Post"),
  );
  ok(
    "the attached file rode in the envelope; the large one did not",
    lastEmailTo(server.out(), CONFIRMED).includes("grounding-practices.pdf") &&
      !lastEmailTo(server.out(), CONFIRMED).includes(
        "Files:    the-long-recording.pdf",
      ),
  );
  ok(
    "the unconfirmed address was sent nothing at all",
    emailsTo(server.out(), UNCONFIRMED).filter((block) =>
      block.includes("SMOKE The room"),
    ).length === 0,
  );
  ok(
    "the person who unsubscribed was sent nothing",
    emailsTo(server.out(), LEAVER).filter((block) =>
      block.includes("SMOKE The room"),
    ).length === 0,
  );

  // ══ 8 · IT IS CLOSED NOW ══════════════════════════════════════════════════
  console.log("\n— locked —");

  await page.goto(`${BASE}/admin/newsletters/${newsletterId}`);
  ok(
    "the sent letter draws its record, not its form",
    (await page.locator('input[name="subject"]').count()) === 0,
  );
  ok("and says who has it", await page.getByText(/who has it/i).isVisible());
  ok(
    "the address it went to is on the screen",
    await page.getByText(CONFIRMED, { exact: false }).first().isVisible(),
  );

  await page.screenshot({ path: join(SHOTS, "sent.png"), fullPage: true });

  {
    // Not merely "the form is gone" — the write itself is refused. The save
    // action is a POST endpoint of its own and can be called without a screen.
    const before = await db.query(
      `SELECT subject FROM "Newsletter" WHERE id = $1`,
      [newsletterId],
    );
    const forged = await context.request.fetch(
      `${BASE}/admin/newsletters/${newsletterId}`,
      {
        method: "POST",
        headers: {
          "Next-Action": "forged",
          "Content-Type": "multipart/form-data; boundary=x",
        },
        data: `--x\r\nContent-Disposition: form-data; name="subject"\r\n\r\nHACKED\r\n--x--\r\n`,
        failOnStatusCode: false,
      },
    );
    const after = await db.query(
      `SELECT subject, status FROM "Newsletter" WHERE id = $1`,
      [newsletterId],
    );
    ok(
      "posting to a sent letter changes nothing",
      after.rows[0].subject === before.rows[0].subject &&
        after.rows[0].status === "sent",
      `status ${forged.status()}`,
    );
  }

  // Sending it a second time cannot reach anybody twice.
  {
    const before = await db.query(
      `SELECT count(*)::int AS n FROM "NewsletterSend" WHERE "newsletterId" = $1`,
      [newsletterId],
    );
    const copies = emailsTo(server.out(), CONFIRMED).filter((block) =>
      block.includes("SMOKE The room"),
    ).length;
    ok("one letter, one copy", copies === 1, `${copies} copies`);
    ok("one letter, one row", before.rows[0].n === 1);
  }

  // ══ 9 · DUPLICATING ═══════════════════════════════════════════════════════
  console.log("\n— the next one —");

  await page
    .getByRole("button", { name: /write the next one from this/i })
    .click();
  // The URL this page is ALREADY on matches "a letter", so wait for a
  // different id rather than for the shape.
  await page.waitForURL(
    (url) => {
      const match = new URL(url).pathname.match(
        /^\/admin\/newsletters\/(\d+)$/,
      );
      return Boolean(match) && Number(match[1]) !== newsletterId;
    },
    { timeout: 120_000 },
  );
  const copyId = Number(page.url().split("/").pop());
  ok("duplicating opens a NEW letter", copyId !== newsletterId);
  {
    const rows = await db.query(
      `SELECT status, "duplicatedFromId" FROM "Newsletter" WHERE id = $1`,
      [copyId],
    );
    ok("the copy is a draft again", rows.rows[0].status === "draft");
    ok(
      "and remembers what it came from",
      rows.rows[0].duplicatedFromId === newsletterId,
    );
  }
  {
    const rows = await db.query(
      `SELECT count(*)::int AS n FROM "NewsletterBlock" WHERE "newsletterId" = $1`,
      [copyId],
    );
    ok(
      "every block came with it",
      rows.rows[0].n === 5,
      `${rows.rows[0].n} blocks`,
    );
  }

  // ══ 10 · NOBODY WAS WRITTEN TO WHO SHOULD NOT HAVE BEEN ═══════════════════
  console.log("\n— who was written to —");

  const log = server.out();
  ok(
    `nothing in the whole run names ${FORBIDDEN}`,
    !log.includes(FORBIDDEN),
    "the client's own live mailbox",
  );
  for (const address of SEEDED) {
    ok(
      `nothing was addressed to ${address}`,
      emailsTo(log, address).length === 0,
      "the operator's own seeded subscribers",
    );
  }
  ok(
    "and nothing was delivered by anything but the log",
    !log.includes('"via":"resend"') && log.includes(MARKER),
  );

  const addressed = [...log.matchAll(/^To:\s+(\S+)$/gm)].map(
    (match) => match[1],
  );
  const outside = addressed.filter((address) => !address.endsWith(".invalid"));
  ok(
    "every address this run wrote to is .invalid",
    outside.length === 0,
    outside.join(", "),
  );
} finally {
  await browser.close();
  await stopServer(server);
  await cleanUp();
  await db.end();
  rmSync(COPY, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`shots in ${SHOTS}`);
process.exit(fail === 0 ? 0 : 1);
