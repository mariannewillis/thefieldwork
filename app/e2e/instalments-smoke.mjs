// =============================================================================
// Paying a course in parts — the plan, what is due, and chasing what is late
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. The plan is WRITTEN AT BOOKING and never recomputed. Changing the course
//      afterwards moves nobody who is already on one.
//   2. The parts SUM to exactly what was agreed, at every shape, with the
//      rounding on the last one.
//   3. The pay link charges WHAT IS DUE TODAY, never the whole outstanding
//      balance — the money bug this feature could most easily have shipped.
//      Pressed between payments it charges nothing and names the day.
//   4. What is late is DERIVED, and says how late in words she would use.
//   5. She is told on arrival, the rail counts it, and the notice takes her to
//      the list filtered to exactly those people.
//   6. A reminder issues a FRESH pay link, records itself against the one
//      instalment it was about, and is refused when nothing is due.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3109.
//   2. node e2e/instalments-smoke.mjs
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL, AND THIS SUITE EXISTS PARTLY BECAUSE OF THAT. A throwaway
// probe of this feature was driven against the operator's own dev server on
// 2026-08-21, which holds a live RESEND_API_KEY, and sent a reminder through
// Resend to `plan@example.invalid`. Nothing could reach a person — `.invalid`
// is reserved and undeliverable — but it was a real call on her account, and it
// was the second time. The server this starts is given RESEND_API_KEY="", which
// BEATS the one in .env.local, and the run asserts over the whole log that
// nothing was delivered by anything but the log adapter.
//
// IT WRITES NOTHING OF HERS. Its own course, its own booking, its own admin,
// all named `inst-smoke-*`, all deleted at both ends.
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

const PORT = 3109;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const USER = "inst-smoke@example.invalid";
const PASS = "inst-smoke-password-not-real";
const SLUG = "inst-smoke-a-course-on-a-plan";
const BUYER = "inst-smoke-buyer@example.invalid";
/** The address this run must never write to. Checked over the whole log. */
const HERS = "marianne@thefieldwork.co.uk";

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
  const root = resolve(".smoke-app-inst");
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
      /* already linked */
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
        AUTH_SECRET: "inst-smoke-secret-not-real-but-long-enough-32ch",
        NEXT_PUBLIC_SITE_URL: BASE,
        // The one that matters. Empty BEATS the real key in .env.local, because
        // @next/env only fills variables that are undefined.
        RESEND_API_KEY: "",
        EMAIL_TO_OWNER: "owner@example.invalid",
        STRIPE_SECRET_KEY: "sk_test_inst_smoke_not_a_real_key_00000",
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
  await db.query(`DELETE FROM "Booking" WHERE "buyerEmail" = $1`, [BUYER]);
  await db.query(`DELETE FROM "Course" WHERE slug = $1`, [SLUG]);
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
}

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

/** A course on a four-payment plan: £120, £30 down, one every 30 days. */
const courseId = (
  await db.query(
    `INSERT INTO "Course" (slug, name, summary, "bodyHtml", "venueName", "addressLines",
       postcode, "gettingThere", capacity, "priceGBP", "depositGBP", "balanceDueAt",
       "refundDays", instalments, "instalmentEveryDays", published, "createdAt", "updatedAt")
     VALUES ($1, 'A course on a plan', 'Four payments.', '<p>x</p>', 'The Garden Room',
       E'Fromefield\nFrome\nSomerset', 'BA11 2QN', 'Step-free.', 8, 12000, 3000,
       (now() + interval '90 days')::date, 14, 4, 30, true, now(), now())
     RETURNING id`,
    [SLUG],
  )
).rows[0].id;

/** Two paid, the third two weeks late, the fourth still ahead. */
const bookingId = (
  await db.query(
    `INSERT INTO "Booking" ("courseId", "buyerName", "buyerEmail", places, "totalPence",
       status, "cancellationTokenHash", "paidAt", "updatedAt")
     VALUES ($1, 'A Person', $2, 1, 12000, 'paid', $3,
       now() - interval '74 days', now())
     RETURNING id`,
    [courseId, BUYER, randomBytes(16).toString("hex")],
  )
).rows[0].id;

for (const [number, days, paid] of [
  [1, -74, true],
  [2, -44, true],
  [3, -14, false],
  [4, 16, false],
]) {
  await db.query(
    `INSERT INTO "Instalment" ("bookingId", number, "amountPence", "dueAt", "paidAt")
     VALUES ($1, $2, 3000, (now() + ($3 || ' days')::interval)::date, $4)`,
    [bookingId, number, String(days), paid ? new Date() : null],
  );
}

const server = await startServer();

try {
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1500, height: 1200 } })
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

  // ══ 1 · SHE IS TOLD ON ARRIVAL ═════════════════════════════════════════════
  console.log("\n— told at the door —\n");

  await page.goto(`${BASE}/admin/calendar`, { waitUntil: "networkidle" });
  const notice = page.locator("[role=status]").filter({ hasText: /payment/i });
  ok(
    "a notice is waiting on whatever screen she opens",
    (await notice.count()) > 0,
  );

  const said = await notice.first().innerText();
  ok(
    "it says HOW LATE in words rather than a date to subtract from",
    /two weeks late/.test(said),
    said.replace(/\s+/g, " ").slice(0, 120),
  );
  ok(
    "and does not claim anything was sent automatically",
    /Nothing has been sent to them automatically/.test(said),
  );

  const badge = await page
    .locator('a[href="/admin/workshop-bookings"] span')
    .first()
    .innerText();
  ok("and the rail carries the count", Number(badge) >= 1, badge);

  // ══ 2 · AND IT TAKES HER TO EXACTLY THOSE PEOPLE ═══════════════════════════
  console.log("\n— and it takes her to them —\n");

  await notice.first().getByRole("link").click();
  await page.waitForURL(/show=owing/);
  ok("pressing it lands on the list, filtered", /show=owing/.test(page.url()));

  const row = page.locator("tbody tr").filter({ hasText: "A Person" });
  // Waited FOR rather than counted immediately: this is a client navigation into
  // a server component, so counting the instant the URL changes counts a table
  // that has not arrived and reports zero on a run where nothing is wrong.
  // `waitFor` settles on the element itself, so the count below is of the
  // rendered table and a SECOND row would still fail it.
  await row.first().waitFor({ state: "visible" });
  ok(
    "with the person on it, once",
    (await row.count()) === 1,
    `${await row.count()} rows matched`,
  );

  const line = (await row.first().innerText()).replace(/\s+/g, " ");
  ok("which payment of how many", /3 of 4/.test(line), line);
  ok("how late it is", /two weeks late/.test(line), line);
  ok(
    "what is due TODAY, and what is left on the plan — two different numbers",
    /£30/.test(line) && /£60/.test(line),
    line,
  );

  // ══ 3 · A REMINDER, AND WHAT IT DOES ═══════════════════════════════════════
  console.log("\n— one press —\n");

  await row.getByRole("button", { name: /Send a reminder/i }).click();
  await page.waitForTimeout(4000);

  const marks = (
    await db.query(
      `SELECT number, "remindedAt" IS NOT NULL AS reminded
         FROM "Instalment" WHERE "bookingId" = $1 ORDER BY number`,
      [bookingId],
    )
  ).rows;
  ok(
    "it is recorded against the ONE instalment it was about, not the plan",
    marks.filter((one) => one.reminded).length === 1 &&
      marks.find((one) => one.reminded)?.number === 3,
    JSON.stringify(marks),
  );

  const token = (
    await db.query(
      `SELECT "balanceTokenHash" IS NOT NULL AS issued FROM "Booking" WHERE id = $1`,
      [bookingId],
    )
  ).rows[0];
  ok(
    "and a FRESH pay link is issued, retiring whatever was in their inbox",
    token.issued === true,
  );

  const sent = server.out();
  ok(
    "the message names the amount due and the day it was due",
    /£30/.test(sent) && /A payment on A course on a plan/.test(sent),
  );
  ok(
    "and says nothing about losing the place, which is not a rule she has set",
    !/place (is|will be) released/i.test(
      sent.slice(sent.indexOf("A payment on A course on a plan")),
    ),
  );

  // ══ 4 · AND IT REFUSES WHEN NOTHING IS DUE ═════════════════════════════════
  console.log("\n— and it refuses when there is nothing to ask for —\n");

  await db.query(
    `UPDATE "Instalment" SET "paidAt" = now() WHERE "bookingId" = $1 AND number = 3`,
    [bookingId],
  );
  await page.reload({ waitUntil: "networkidle" });

  const settledRow = page.locator("tbody tr").filter({ hasText: "A Person" });
  ok(
    "paying it takes them out of the late list",
    !/two weeks late/.test(
      (await settledRow
        .first()
        .innerText()
        .catch(() => "")) || "",
    ),
  );

  // ══ 5 · AND NOT ONE MESSAGE LEFT THE BUILDING ══════════════════════════════
  console.log("\n— and nothing was actually sent —\n");

  ok(
    "every message in this run went to the log, not to a provider",
    sent.includes("EMAIL (not sent — no RESEND_API_KEY)"),
  );
  ok(
    "NOT ONE MESSAGE IN THIS RUN WAS ADDRESSED TO HER",
    !sent.includes(`To:       ${HERS}`),
  );
  ok(
    "and every address it wrote to is .invalid",
    // `To:` and not `To:` — the log prints `Reply-To:` as well, and matching
    // inside it made this read her own address off every message and fail on a
    // run where nothing was wrong.
    [...sent.matchAll(/^To:\s+(\S+@\S+)/gm)]
      .map((match) => match[1])
      .every((address) => address.endsWith(".invalid")),
  );

  ok(
    "the browser complained about nothing, all run",
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
