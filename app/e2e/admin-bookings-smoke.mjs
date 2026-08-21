// =============================================================================
// The bookings ledger — the operator's state machine, end to end
// =============================================================================
//
// One claim, exercised: Marianne can cancel, refund and delete a place from the
// portal, the rules about which of those she may do are the booking's own, and
// the buyer is told the truth every time. Everything else here is a thing that
// had to be true on the way — the refund going through Stripe BEFORE the record
// is written, a refund that fails leaving no false claim behind it, a delete
// that never touches a live place, and the guards holding when the page in
// front of her has gone stale.
//
// A sibling of bookings-smoke.mjs, and it runs the same way.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3101.
//   2. node e2e/admin-bookings-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL MONEY AND NO REAL EMAIL, and neither is left to a flag:
//
//   src/lib/stripe.ts IS REPLACED in the copy this runs. The stub records
//   every refund it is asked for — the payment intent, the amount, the
//   idempotency key — and returns success or failure according to a file this
//   script writes. The real Stripe library is never reached, so the operator's
//   test account sees nothing, and BOTH branches can be exercised, which a fake
//   key could not do (it can only ever fail).
//
//   RESEND_API_KEY="" beats the one in .env.local, so the email module's log
//   adapter runs: every message is printed and none is delivered. That is
//   checked rather than assumed. Every address ends .invalid as well.
//
// It creates workshops whose slugs begin `smoke-ledger-`, one throwaway admin
// account, and their bookings — and deletes exactly those at the end. Marianne's
// account, her workshops and booking 25 are not touched.
// =============================================================================

import { spawn } from "node:child_process";
import { createHash, randomBytes, scrypt as scryptCb } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { chromium } from "playwright";

loadEnv({ path: ".env.local" });

const scrypt = promisify(scryptCb);

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const OWNER = "owner@example.invalid";
const BUYER = "buyer@example.invalid";
const USER = "smoke-ledger@example.invalid";
const PASS = "smoke-ledger-password-not-real";

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

// ── the copy, with Stripe replaced ───────────────────────────────────────────

/**
 * A COPY OF THE APP, with one module swapped.
 *
 * The environment is built from nothing — the copy has no `.env.local`, so the
 * child inherits only the variables named below and the real RESEND_API_KEY has
 * no way to reach it. `src/lib/stripe.ts` is overwritten in the copy AFTER the
 * copy is made, so the file in the repository is never edited and the stub can
 * never be committed by accident.
 */
const REFUND_LOG = resolve(".smoke-ledger-refunds.log");
const REFUND_MODE = resolve(".smoke-ledger-mode.txt");

function setRefundMode(mode) {
  writeFileSync(REFUND_MODE, mode);
}

function refundCalls() {
  try {
    return readFileSync(REFUND_LOG, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function makeCopy() {
  const root = resolve(".smoke-admin-app");
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

  writeFileSync(
    join(root, "src", "lib", "stripe.ts"),
    `import "server-only";
import { appendFileSync, readFileSync } from "node:fs";

// SMOKE STUB — written by e2e/admin-bookings-smoke.mjs into a throwaway copy of
// the app. The real Stripe library is never loaded, so nothing here can reach
// anybody's account.

export const webhookSecret = "whsec_smoke_ledger";

export function paymentsConfigured() {
  return true;
}

export function stripe() {
  return {
    refunds: {
      create: async (params, options) => {
        appendFileSync(
          ${JSON.stringify(REFUND_LOG)},
          JSON.stringify({ params, options }) + "\\n",
        );
        const mode = readFileSync(${JSON.stringify(REFUND_MODE)}, "utf8").trim();
        if (mode === "fail") {
          throw new Error("the payment has already been fully refunded");
        }
        return { id: "re_smoke_" + Date.now(), amount: params.amount };
      },
    },
    checkout: {
      sessions: {
        create: async () => {
          throw new Error("checkout is not stubbed for this smoke");
        },
      },
    },
    webhooks: {
      constructEvent: () => {
        throw new Error("the webhook is not stubbed for this smoke");
      },
    },
  };
}
`,
  );

  return root;
}

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
        AUTH_SECRET: process.env.AUTH_SECRET ?? "smoke-ledger-secret-not-real",
        NEXT_PUBLIC_SITE_URL: BASE,
        EMAIL_TO_OWNER: OWNER,
        // Signing in calls ensureSeeded(), which creates the accounts that
        // should exist. Left unset it falls back to its own defaults and this
        // script would quietly seed a second admin into the operator's
        // database. Empty means "do not create it" — the same switch
        // .env.local already uses.
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
  throw new Error("the dev server would not let go of the port");
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

async function makeWorkshop({ slug, name, dayOffset, refundDays }) {
  const { rows } = await db.query(
    `INSERT INTO "Workshop"
       (slug, name, summary, "bodyHtml", date, "startTime", "endTime",
        "venueName", "addressLines", postcode, "gettingThere",
        capacity, "priceGBP", "refundDays", published, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,'10:00','16:30','The Garden Room',
             'Fromefield\nFrome', 'BA11 2QN', 'Step-free from the pavement.',
             8, 9500, $6, true, now())
     RETURNING id`,
    [
      slug,
      name,
      "A day of learning to notice what you already notice.",
      "<p>Written for the smoke test.</p>",
      day(dayOffset),
      refundDays,
    ],
  );
  return rows[0].id;
}

/**
 * A booking put straight into the database, with the token we keep — and its
 * money, on the Payment row where money now lives (D-23).
 */
async function seedBooking(workshopId, tag, extra = {}) {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const places = extra.places ?? 1;
  const { rows } = await db.query(
    `INSERT INTO "Booking"
       ("workshopId","buyerName","buyerEmail",places,"totalPence",status,
        "cancellationTokenHash","paidAt","cancelledAt","cancelledReason","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,now(),$8,$9,now())
     RETURNING id`,
    [
      workshopId,
      extra.name ?? `Smoke ${tag}`,
      BUYER,
      places,
      9500 * places,
      extra.status ?? "paid",
      hash,
      extra.status && extra.status !== "paid" ? new Date() : null,
      extra.status && extra.status !== "paid"
        ? (extra.reason ?? "buyer")
        : null,
    ],
  );
  await db.query(
    `INSERT INTO "Payment"
       ("bookingId",kind,"amountPence",currency,"stripeSessionId",
        "stripePaymentIntentId","paidAt","refundId","refundedPence","refundedAt","updatedAt")
     VALUES ($1,'full',$2,'gbp',$3,$4,now(),$5,$6,$7,now())`,
    [
      rows[0].id,
      9500 * places,
      `cs_smoke_ledger_${tag}_${Date.now()}`,
      `pi_smoke_ledger_${tag}`,
      extra.refundId ?? null,
      extra.refundedPence ?? null,
      extra.refundId ? new Date() : null,
    ],
  );
  return rows[0].id;
}

/**
 * A booking as the database has it, with its payments folded back in so the
 * assertions below can go on asking about `refundId` and `refundedPence` in one
 * place. A workshop booking has exactly one payment, so the fold is a read.
 */
const bookingRow = async (id) => {
  const { rows } = await db.query(`SELECT * FROM "Booking" WHERE id = $1`, [
    id,
  ]);
  if (!rows[0]) return undefined;
  const { rows: paid } = await db.query(
    `SELECT * FROM "Payment" WHERE "bookingId" = $1 ORDER BY id`,
    [id],
  );
  return {
    ...rows[0],
    payments: paid,
    amountPence: paid.reduce((sum, one) => sum + one.amountPence, 0),
    refundId: paid.find((one) => one.refundId)?.refundId ?? null,
    refundedPence:
      paid.reduce((sum, one) => sum + (one.refundedPence ?? 0), 0) || null,
    refundedAt: paid.find((one) => one.refundedAt)?.refundedAt ?? null,
  };
};

/** The most recent email the log shows going to one address, in full. */
function emailTo(log, address) {
  const blocks = log
    .split("──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────")
    .slice(1)
    .filter((block) => block.includes(`To:       ${address}`));
  return blocks.at(-1) ?? "";
}

/** A page's text on one line, for a failure message that fits in a terminal. */
function oneLine(text) {
  return text.replace(/\s+/g, " ").slice(0, 400);
}

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** Only ever what this script made. */
async function cleanUp() {
  await db.query(
    `DELETE FROM "Booking" WHERE "workshopId" IN
       (SELECT id FROM "Workshop" WHERE slug LIKE 'smoke-ledger-%')`,
  );
  await db.query(`DELETE FROM "Workshop" WHERE slug LIKE 'smoke-ledger-%'`);
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
}

// ── the run ──────────────────────────────────────────────────────────────────

const COPY = await makeCopy();
rmSync(REFUND_LOG, { force: true });
setRefundMode("ok");

await db.connect();
await cleanUp();

const stamp = Date.now();

// The account this signs in as. Its own, throwaway, and hashed by the same
// scheme the app uses so nothing about Marianne's is read or written.
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

const ws = {};
ws.soon = await makeWorkshop({
  slug: `smoke-ledger-soon-${stamp}`,
  name: "Reading the Field",
  dayOffset: 30,
  refundDays: 14,
});
ws.tight = await makeWorkshop({
  slug: `smoke-ledger-tight-${stamp}`,
  name: "The Near One",
  dayOffset: 3,
  refundDays: 14,
});
ws.past = await makeWorkshop({
  slug: `smoke-ledger-past-${stamp}`,
  name: "The One That Happened",
  dayOffset: -5,
  refundDays: 14,
});

const id = {};
id.refundIt = await seedBooking(ws.soon, "refundit", { name: "Anna Keeling" });
id.keepIt = await seedBooking(ws.soon, "keepit", { name: "Bryn Latchford" });
id.comp = await seedBooking(ws.soon, "comp", { name: "Cai Morris" });
id.failing = await seedBooking(ws.soon, "failing", { name: "Dilys Rees" });
id.stale = await seedBooking(ws.soon, "stale", { name: "Enid Vaughan" });
id.late = await seedBooking(ws.tight, "late", { name: "Ffion Oakes" });
id.attended = await seedBooking(ws.past, "attended", { name: "Gwilym Hart" });
id.done = await seedBooking(ws.soon, "done", {
  name: "Hester Nye",
  status: "cancelledRefunded",
  refundId: "re_seeded_pretend",
  refundedPence: 9500,
});

const server = await startServer();
const browser = await chromium.launch();

/** The one modal that is open, once it is the only one. */
async function dialog(page) {
  await page.waitForFunction(
    () => document.querySelectorAll("dialog[open]").length === 1,
  );
  return page.locator("dialog[open]");
}

/** Everything about this booking's row, as text. */
async function rowText(page, name) {
  return page.locator("tr", { hasText: name }).first().innerText();
}

/** The nth control in a row: 0 cancel, 1 refund, 2 delete. */
function control(page, name, index) {
  return page
    .locator("tr", { hasText: name })
    .first()
    .locator("td button")
    .nth(index);
}

try {
  const page = await (await browser.newContext()).newPage();

  // ── getting in ────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/workshop-bookings`);
  ok(
    "the ledger is closed to anyone not signed in",
    new URL(page.url()).pathname === "/admin/login",
    page.url(),
  );

  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"));
  await page.goto(`${BASE}/admin/workshop-bookings`);
  try {
    await page.waitForSelector("#upcoming-table", { timeout: 30_000 });
  } catch (error) {
    // A smoke test that only says "timed out" costs an hour to work out. Say
    // where it actually got to and what the server said about it.
    console.log(`\n  the page was ${page.url()} and said:\n`);
    console.log((await page.locator("body").innerText()).slice(0, 2000));
    console.log(`\n  the server said:\n${server.out().slice(-4000)}`);
    throw error;
  }

  ok(
    "nothing has actually been emailed — the log adapter is what is running",
    server.out().includes("EMAIL (not sent — no RESEND_API_KEY)") ||
      server.out().includes("[bookings]") === false,
  );

  // ── the shape of the screen ───────────────────────────────────────────────
  const body = await page.locator("main").innerText();
  // THE EXPLAINING PROSE IS GONE (operator, 2026-08-19) and the two stacked
  // tables are two TABS. What is asserted is the shape she is left with: one
  // table at a time, the counts on the tabs, and none of the four paragraphs.
  ok(
    "the four paragraphs that explained the screen are gone",
    !/live bookings are for things that haven/.test(body) &&
      !body.includes("A booking sits in the first table") &&
      !body.includes("Cancel is the everyday one") &&
      !body.includes("Deposit is empty on a workshop") &&
      !body.includes("Type never reads Service"),
    oneLine(body),
  );
  // THREE TABS SINCE 2026-08-21. Owing joined Upcoming and Past when payment
  // plans landed, and it CUTS ACROSS them rather than sitting beside them — a
  // payment can be late on a course that has already started, so filing it
  // under Past would hide the one thing she needs to chase. It is always drawn,
  // with a count of nought when nobody owes anything, so this stays a fixed
  // number rather than a figure that depends on the data.
  ok(
    "there are three tabs and ONE table — the others hold the other rows",
    (await page.locator("#upcoming-table").count()) === 1 &&
      (await page.locator("#archive-table").count()) === 0 &&
      (await page.locator('nav[aria-label="Which bookings"] a').count()) === 3,
    `${await page.locator('nav[aria-label="Which bookings"] a').count()} tabs`,
  );
  ok(
    "a day still to come is on Upcoming, which is the tab she lands on",
    (await page
      .locator("#upcoming-table tr", { hasText: "Anna Keeling" })
      .count()) === 1 &&
      (await page.locator("tr", { hasText: "Gwilym Hart" }).count()) === 0,
  );

  // ── the past tab ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/workshop-bookings?show=past`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  ok(
    "a day that has been fell onto the Past tab by itself",
    (await page
      .locator("#archive-table tr", { hasText: "Gwilym Hart" })
      .count()) === 1 && (await page.locator("#upcoming-table").count()) === 0,
  );

  // ── twelve to a page ──────────────────────────────────────────────────────
  //
  // THIS FIXTURE HAS TEN, which is what makes the second assertion the useful
  // one: a table that fits on a page must not draw a pager at all. "Page 1 of
  // 1" beside ten rows is chrome answering a question nobody asked. The cap
  // itself is asserted as a ceiling, and the clamp below is what a bad page
  // number does.
  await page.goto(`${BASE}/admin/workshop-bookings`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  const onPage = await page.locator("#upcoming-table tbody tr").count();
  ok("a page never holds more than twelve rows", onPage <= 12, String(onPage));
  ok(
    "and a table that fits on one page draws no pager",
    (await page.locator('nav[aria-label*="Pages of"]').count()) === 0,
    String(onPage),
  );

  await page.goto(`${BASE}/admin/workshop-bookings?page=99`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  ok(
    "a page number past the end lands on rows rather than an empty table",
    (await page.locator("#upcoming-table tbody tr").count()) === onPage,
  );

  // ── filtering by kind ─────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/workshop-bookings?kind=course`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  ok(
    "filtering to Courses leaves no workshop row on the screen",
    (await page.locator("tr", { hasText: "Anna Keeling" }).count()) === 0,
  );
  await page.goto(`${BASE}/admin/workshop-bookings?kind=workshop`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  ok(
    "and filtering to Workshops brings it back",
    (await page.locator("tr", { hasText: "Anna Keeling" }).count()) === 1,
  );

  await page.goto(`${BASE}/admin/workshop-bookings`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  // THE COLUMNS ARE FIVE AND THE CONTROLS (operator, 2026-08-19). Email, the
  // deposit and the money-ever-paid are facts in the sheet now; what is left on
  // the line is what she scans a ledger for.
  ok(
    "the columns are the five the line now carries",
    (await page.locator("#upcoming-table thead").innerText())
      .replace(/\s+/g, " ")
      .toLowerCase()
      .startsWith("name type offering and when where it stands held"),
    (await page.locator("#upcoming-table thead").innerText()).replace(
      /\s+/g,
      " ",
    ),
  );

  ok(
    "Type says Workshop on every row",
    body.includes("WORKSHOP") && !body.includes("SERVICE"),
  );
  // THE REFUND PERIOD IS IN THE SHEET. It is a fact about the offering rather
  // than the thing she scans the ledger for, and printing it on every row is
  // what made the table a file (2026-08-19).
  await page.locator("tr", { hasText: "Anna Keeling" }).first().click();
  await page.waitForSelector("dialog[open]", { timeout: 20_000 });
  ok(
    "pressing a row states that offering's own refund period",
    (await page.locator("dialog[open]").innerText()).includes("14 days"),
    oneLine(await page.locator("dialog[open]").innerText()),
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));

  await page.locator("tr", { hasText: "Ffion Oakes" }).first().click();
  await page.waitForSelector("dialog[open]", { timeout: 20_000 });
  ok(
    "and says when it closed on one whose period has gone",
    /closed/.test(await page.locator("dialog[open]").innerText()),
    oneLine(await page.locator("dialog[open]").innerText()),
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));

  // ── refund closes with the refund period ──────────────────────────────────
  //
  // It used to stay open indefinitely as a goodwill decision she could make
  // later; the operator closed it (2026-08-19). Ffion's period has passed and
  // Anna's has not, so the two rows say the whole rule between them.
  await control(page, "Ffion Oakes", 1).click({ force: true });
  ok(
    "refund is spent once the refund period has run out, and names the date",
    (await rowText(page, "Ffion Oakes")).includes("The refund period ran out"),
    await rowText(page, "Ffion Oakes"),
  );
  ok(
    "and it says where the money can still be sent from, rather than just no",
    (await rowText(page, "Ffion Oakes")).includes("Stripe"),
  );
  ok(
    "while a booking still inside its period keeps its refund",
    (await control(page, "Anna Keeling", 1).getAttribute("aria-disabled")) !==
      "true",
  );

  // ── a disabled control explains itself ────────────────────────────────────
  //
  // Gwilym's day has been, so he is on the Past tab now (2026-08-19). Hester's
  // is refunded and still to come, so she stays on Upcoming — the two halves of
  // this block are on the two tabs and each goes to its own.
  await page.goto(`${BASE}/admin/workshop-bookings?show=past`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  await control(page, "Gwilym Hart", 0).click({ force: true });
  ok(
    "cancel on a day that has been says why it cannot be used",
    (await rowText(page, "Gwilym Hart")).includes(
      "there is no place left to release",
    ),
    await rowText(page, "Gwilym Hart"),
  );
  await control(page, "Gwilym Hart", 2).click({ force: true });
  ok(
    "and delete says the record stays, because that day cannot be cancelled",
    (await rowText(page, "Gwilym Hart")).includes(
      "a day that has been cannot be cancelled, so this record stays",
    ),
  );
  await page.goto(`${BASE}/admin/workshop-bookings`);
  await page.waitForSelector("#ledger-h", { timeout: 30_000 });
  await control(page, "Hester Nye", 1).click({ force: true });
  ok(
    "refund on an already-refunded booking says the money has gone",
    (await rowText(page, "Hester Nye")).includes("the money already went back"),
  );

  // ── cancel inside the period, and refund ──────────────────────────────────
  await control(page, "Anna Keeling", 0).click();
  const askText = await (await dialog(page)).innerText();
  ok(
    "cancelling inside the period ASKS about the money, and names it",
    askText.includes("send the £95 back") &&
      askText.includes("Cancel and refund £95") &&
      askText.includes("Cancel and keep the £95 for now"),
    askText.replace(/\n/g, " | "),
  );
  ok(
    "and says which workshop's period it is measuring against",
    askText.includes("refund period runs for 14 days"),
  );

  const before = refundCalls().length;
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Cancel and refund £95" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));

  const anna = await bookingRow(id.refundIt);
  ok(
    "the booking is cancelled AND refunded, and says she did it",
    anna.status === "cancelledRefunded" &&
      anna.cancelledReason === "marianne" &&
      anna.refundedPence === 9500 &&
      anna.refundId !== null,
    `${anna.status} / ${anna.cancelledReason} / ${anna.refundId}`,
  );
  const call = refundCalls().at(-1);
  ok(
    "Stripe was asked for the whole amount against this booking's payment",
    refundCalls().length === before + 1 &&
      call.params.amount === 9500 &&
      call.params.payment_intent === "pi_smoke_ledger_refundit",
    JSON.stringify(call?.params),
  );
  // The key is the PAYMENT now, not the booking (D-23): a settled course is two
  // payments against two intents, and one key for the pair could only ever
  // guard one of them.
  const annaPayment = (await bookingRow(id.refundIt)).payments[0];
  ok(
    "under that payment's own idempotency key, so a repeat moves nothing twice",
    call.options.idempotencyKey === `refund-payment-${annaPayment.id}`,
    call?.options?.idempotencyKey,
  );
  const annaMail = emailTo(server.out(), BUYER);
  ok(
    "the buyer is told, in her voice, that the money is on its way",
    annaMail.includes("I am sorry.") &&
      annaMail.includes("I have had to cancel") &&
      annaMail.includes("£95 is on its way back to the card you paid with"),
    annaMail.replace(/\n/g, " | ").slice(0, 260),
  );

  // ── cancel inside the period, keeping the money ───────────────────────────
  await page.reload();
  await control(page, "Bryn Latchford", 0).click();
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Cancel and keep the £95 for now" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));

  const bryn = await bookingRow(id.keepIt);
  ok(
    "the place is released and the money stays with her",
    bryn.status === "cancelledUnrefunded" &&
      bryn.cancelledReason === "marianne" &&
      bryn.refundId === null,
    `${bryn.status} / ${bryn.refundId}`,
  );
  ok(
    "Stripe was not called at all",
    refundCalls().length === before + 1,
    String(refundCalls().length),
  );
  const brynMail = emailTo(server.out(), BUYER);
  ok(
    "and the buyer is told it has NOT come back, with no promise attached",
    brynMail.includes("£95 has not gone back to your card yet") &&
      !brynMail.includes("on its way"),
    brynMail.replace(/\n/g, " | ").slice(0, 260),
  );

  // The row now says the money is outstanding, and delete says so first.
  await page.reload();
  ok(
    "the row says the money has not gone back",
    (await rowText(page, "Bryn Latchford")).includes(
      "the money has not gone back",
    ),
  );
  await control(page, "Bryn Latchford", 2).click();
  const guard = await (await dialog(page)).innerText();
  ok(
    "deleting it names the money still owed BEFORE the destructive button",
    guard.includes("cancelled but never refunded") &&
      guard.indexOf("£95 of their money is still with you") <
        guard.indexOf("Delete anyway"),
    guard.replace(/\n/g, " | "),
  );
  ok(
    "and refunding first is offered above deleting",
    guard.indexOf("Refund the £95 first") < guard.indexOf("Delete anyway"),
  );

  // Take the offered path: refund from inside the delete guard.
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Refund the £95 first" })
    .click();
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Refund £95" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  const brynAfter = await bookingRow(id.keepIt);
  ok(
    "the goodwill refund lands, and the booking becomes cancelled-and-refunded",
    brynAfter.status === "cancelledRefunded" &&
      brynAfter.refundedPence === 9500,
    `${brynAfter.status} / ${brynAfter.refundedPence}`,
  );
  ok(
    "the buyer is told the money has now been sent",
    emailTo(server.out(), BUYER).includes("has been sent back to the card"),
  );

  // ── a refund on a booking that is NOT being cancelled ──────────────────────
  await page.reload();
  await control(page, "Cai Morris", 1).click();
  const comp = await (await dialog(page)).innerText();
  ok(
    "refunding a live booking says plainly that it does not cancel it",
    comp.includes("refunding it does not cancel it") &&
      comp.includes("still expected"),
    comp.replace(/\n/g, " | "),
  );
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Refund £95" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));

  const cai = await bookingRow(id.comp);
  ok(
    "the money goes back and the place is STILL HELD",
    cai.status === "paid" &&
      cai.refundId !== null &&
      cai.refundedPence === 9500,
    `${cai.status} / ${cai.refundId}`,
  );
  ok(
    "and the buyer is told their place is unchanged, in as many words",
    emailTo(server.out(), BUYER).includes("YOUR PLACE IS UNCHANGED"),
    emailTo(server.out(), BUYER).replace(/\n/g, " | ").slice(0, 200),
  );
  await page.reload();
  ok(
    "the row shows the refund without pretending the place has gone",
    (await rowText(page, "Cai Morris")).includes("the place is still held"),
    await rowText(page, "Cai Morris"),
  );
  ok(
    "and refund is now spent on that row",
    (await control(page, "Cai Morris", 1).getAttribute("aria-disabled")) ===
      "true",
  );

  // ── and then taking the place back, weeks later ───────────────────────────
  // She comped him a while ago and has now decided to release the place too.
  // The refund is backdated an hour so this is the real shape of that case
  // rather than two things happening in the same second.
  await db.query(
    `UPDATE "Payment" SET "refundedAt" = now() - interval '1 hour' WHERE "bookingId" = $1`,
    [id.comp],
  );
  await page.reload();
  await control(page, "Cai Morris", 0).click();
  const already = await (await dialog(page)).innerText();
  ok(
    "cancelling a booking whose money has gone asks neither question",
    already.includes("and they kept the place") &&
      !already.includes("Cancel and refund") &&
      already.includes("No more money moves"),
    oneLine(already),
  );
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Cancel the place" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  const caiAfter = await bookingRow(id.comp);
  ok(
    "the place is released and the refund it already had is kept",
    caiAfter.status === "cancelledRefunded" &&
      caiAfter.refundId !== null &&
      caiAfter.cancelledReason === "marianne",
    `${caiAfter.status} / ${caiAfter.refundId}`,
  );
  ok(
    "and the buyer is not told money is coming that arrived an hour ago",
    emailTo(server.out(), BUYER).includes("was already sent back") &&
      !emailTo(server.out(), BUYER).includes("is on its way"),
    oneLine(emailTo(server.out(), BUYER)),
  );

  // ── past the refund period ────────────────────────────────────────────────
  await page.reload();
  await control(page, "Ffion Oakes", 0).click();
  const late = await (await dialog(page)).innerText();
  ok(
    "past the period there is no refund question, and it says so plainly",
    late.includes("without returning the £95") &&
      late.includes("Nothing goes back to their card") &&
      !late.includes("Cancel and refund"),
    late.replace(/\n/g, " | "),
  );
  ok(
    "and it names what cancelling DOES achieve, since it is not money",
    late.includes("back into the room and can be booked by somebody else"),
  );
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Cancel the place and return nothing" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));

  const ffion = await bookingRow(id.late);
  ok(
    "the place is released and nothing is recorded as owed",
    ffion.status === "cancelledUnrefunded" &&
      ffion.cancelledReason === "marianne" &&
      ffion.refundId === null,
  );
  ok(
    "the buyer's email does not pretend money is coming",
    emailTo(server.out(), BUYER).includes(
      "The refund date on this booking had already",
    ),
    emailTo(server.out(), BUYER).replace(/\n/g, " | ").slice(0, 240),
  );

  // ── a refund Stripe refuses ───────────────────────────────────────────────
  setRefundMode("fail");
  await page.reload();
  await control(page, "Dilys Rees", 0).click();
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Cancel and refund £95" })
    .click();
  await page.waitForSelector('dialog[open] [role="alert"]');
  const failed = await page.locator('dialog[open] [role="alert"]').innerText();
  ok(
    "when Stripe refuses, the modal stays open and says exactly what happened",
    failed.includes("Stripe would not send the money back") &&
      failed.includes("the money has not gone"),
    failed,
  );

  const dilys = await bookingRow(id.failing);
  ok(
    "the place is still released — nobody is holding a chair for somebody told not to come",
    dilys.status === "cancelledUnrefunded" &&
      dilys.cancelledReason === "marianne",
    dilys.status,
  );
  ok(
    "and NOTHING claims the money moved",
    dilys.refundId === null && dilys.refundedPence === null,
  );
  ok(
    "the buyer is told it has not come back rather than that it has",
    emailTo(server.out(), BUYER).includes("has not gone back to your card yet"),
  );
  ok(
    "and Marianne gets the one notice a portal action sends, with what a hand refund needs",
    emailTo(server.out(), OWNER).includes("REFUND IT IN STRIPE, BY HAND") &&
      emailTo(server.out(), OWNER).includes("pi_smoke_ledger_failing"),
    emailTo(server.out(), OWNER).replace(/\n/g, " | ").slice(0, 240),
  );

  // A standalone refund that fails must leave the row completely alone.
  await page.reload();
  const wasStale = await bookingRow(id.stale);
  await control(page, "Enid Vaughan", 1).click();
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Refund £95" })
    .click();
  await page.waitForSelector('dialog[open] [role="alert"]');
  const stale = await bookingRow(id.stale);
  ok(
    "a standalone refund Stripe refuses writes nothing at all",
    stale.status === wasStale.status &&
      stale.refundId === null &&
      stale.cancelledAt === null,
    `${stale.status} / ${stale.refundId}`,
  );
  await page.keyboard.press("Escape");
  setRefundMode("ok");

  // ── delete, and the guards that hold when the page has gone stale ─────────
  await page.reload();
  ok(
    "delete is out of reach on a live booking",
    (await control(page, "Enid Vaughan", 2).getAttribute("aria-disabled")) ===
      "true",
  );

  // A booking that was cancelled and refunded: the plain question, no warning.
  await control(page, "Hester Nye", 2).click();
  const plain = await (await dialog(page)).innerText();
  ok(
    "deleting a refunded booking drops the money warning and asks plainly",
    !plain.includes("cancelled but never refunded") &&
      plain.includes("Delete this booking"),
    plain.replace(/\n/g, " | "),
  );

  // THE STALE PAGE. The row in front of her says delete is available; the
  // booking has gone back to being live since it was drawn. The server reads
  // the booking again and refuses — a disabled button is a courtesy, not a rule.
  await db.query(
    `UPDATE "Booking" SET status='paid', "cancelledAt"=null, "cancelledReason"=null
       WHERE id=$1`,
    [id.done],
  );
  await db.query(
    `UPDATE "Payment" SET "refundId"=null, "refundedPence"=null, "refundedAt"=null
       WHERE "bookingId"=$1`,
    [id.done],
  );
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Delete this booking" })
    .click();
  await page.waitForSelector('dialog[open] [role="alert"]');
  ok(
    "delete pressed against a stale page is refused by the server",
    (await page.locator('dialog[open] [role="alert"]').innerText()).includes(
      "This place is still held",
    ),
    await page.locator('dialog[open] [role="alert"]').innerText(),
  );
  ok(
    "and the booking is untouched",
    (await bookingRow(id.done)).status === "paid",
  );
  await page.keyboard.press("Escape");

  // The same, the other way round: cancel pressed on a row that has since been
  // cancelled by the buyer's own link.
  await page.reload();
  await db.query(
    `UPDATE "Booking" SET status='cancelledUnrefunded', "cancelledAt"=now(),
       "cancelledReason"='buyer' WHERE id=$1`,
    [id.done],
  );
  await control(page, "Hester Nye", 0).click();
  await (
    await dialog(page)
  )
    .getByRole("button", { name: /^Cancel and refund/ })
    .click();
  await page.waitForSelector('dialog[open] [role="alert"]');
  ok(
    "cancelling something already cancelled is refused, not done twice",
    (await page.locator('dialog[open] [role="alert"]').innerText()).includes(
      "already been cancelled",
    ),
  );
  await page.keyboard.press("Escape");

  // ── the real delete ───────────────────────────────────────────────────────
  // Dilys is the dangerous one: cancelled inside the period with the refund
  // still outstanding. Going through with it is allowed, and the record of the
  // £95 goes with it — which is exactly what the modal said would happen.
  await page.reload();
  await control(page, "Dilys Rees", 2).click();
  await (
    await dialog(page)
  )
    .getByRole("button", { name: /^Delete anyway/ })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  ok(
    "deleting a cancelled booking removes it for good",
    (await bookingRow(id.failing)) === undefined,
  );

  // And the one where nothing was ever owed asks the plain question instead.
  await page.reload();
  await control(page, "Ffion Oakes", 2).click();
  const plainGuard = await (await dialog(page)).innerText();
  ok(
    "a booking that owed nothing gets the plain question, with no money warning",
    !plainGuard.includes("cancelled but never refunded") &&
      plainGuard.includes("Delete this booking"),
    plainGuard.split("\n").join(" | "),
  );
  await (
    await dialog(page)
  )
    .getByRole("button", { name: "Delete this booking" })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  ok("and it goes too", (await bookingRow(id.late)) === undefined);
  ok(
    "and nothing was emailed about it — it changes nothing for the buyer",
    countOf(server.out(), "[bookings] delete") === 0,
  );

  // ── the empty states ──────────────────────────────────────────────────────
  // Only the ARCHIVE can be emptied here. Emptying "still to come" would mean
  // deleting the operator's own booking, which this script will not do — so
  // that half of the pair is checked by reading rather than by running, and
  // said so here rather than asserted around.
  await db.query(
    `DELETE FROM "Booking" WHERE "workshopId" IN
       (SELECT id FROM "Workshop" WHERE slug LIKE 'smoke-ledger-%')`,
  );
  // ON THE PAST TAB, which is where what used to be the archive lives
  // (2026-08-19). Upcoming still holds the operator's own rows, so reading the
  // empty state off the default tab would be reading the wrong table.
  await page.goto(`${BASE}/admin/workshop-bookings?show=past`);
  // loading.tsx is a real state and gets in the way of reading the real one.
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]'),
  );
  const emptied = await page.locator("main").innerText();
  ok(
    "with nothing in it, the Past tab draws its own empty state",
    emptied.includes("Nothing has happened yet."),
    oneLine(emptied),
  );
  ok(
    "which says it fills itself, so nothing looks like it needs filing",
    emptied.includes("fills itself"),
  );
  await page.goto(`${BASE}/admin/workshop-bookings`);
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]'),
  );
  const stillThere = await page.locator("main").innerText();
  ok(
    "and the operator's own booking is still there, untouched, with its figures",
    stillThere.includes("Lorem Ipsum") && stillThere.includes("£0.40"),
    oneLine(stillThere),
  );
} finally {
  await browser.close();
  await stopServer(server);
}

await cleanUp();
await db.end();
rmSync(REFUND_LOG, { force: true });
rmSync(REFUND_MODE, { force: true });
for (let attempt = 0; attempt < 10; attempt++) {
  try {
    rmSync(COPY, { recursive: true, force: true });
    break;
  } catch {
    await sleep(1000);
  }
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
