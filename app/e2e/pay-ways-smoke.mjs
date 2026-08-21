// =============================================================================
// Three ways to pay for a course — what she ticks, what a buyer is offered,
// and what the card is actually charged
// =============================================================================
//
// The claims, exercised rather than asserted:
//
//   1. THE TICK DECIDES. A deposit figure sitting in a field is not an offer;
//      the page shows exactly the ways she ticked and no others.
//   2. PAYING IN FULL CANNOT VANISH. Untick everything and the course is still
//      buyable at its price — a published page with no working button is worse
//      than one with a single way.
//   3. AN EXPIRED ARRANGEMENT FALLS BACK, NOT THROUGH. A deposit whose balance
//      day has been stops being offered and the price takes over.
//   4. THE FIGURE ON THE BUTTON IS THE FIGURE CHARGED, on all three ways. This
//      is the money bug the feature could most easily have shipped: one
//      function does the sums for the page, the checkout and the webhook.
//   5. INTEREST IS THE PLAN'S ALONE, is added once before dividing, and is said
//      on the page in words rather than left to be found on a statement.
//   6. A PLAN WRITES ITS ROWS AND ITS PAY LINK. (It did not, at first: the link
//      was issued on `balanceDueAt`, which a plan does not have, so everybody
//      paying in parts got a plan and no way to pay it.)
//   7. A DEPOSIT IS NOT A PLAN. It writes a balance day and no rows — the two
//      are alternatives, which is the whole point of the ticks.
//   8. A WAY THAT IS NOT OFFERED IS REFUSED, at the checkout and again at the
//      webhook. The choice arrives from a browser and is trusted accordingly.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3110.
//   2. node e2e/pay-ways-smoke.mjs
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL. The server it starts is given RESEND_API_KEY="", which beats
// the real key in .env.local, and the run asserts over the whole log that
// nothing was delivered by anything but the log adapter and that not one
// message was addressed to the operator's client.
//
// NO REAL STRIPE. The secret key is a fake, and no checkout is ever opened —
// the payment paths are driven by SIGNED SYNTHETIC webhook events, the same
// harness course-bookings-smoke uses.
//
// IT WRITES NOTHING OF HERS. Its own courses, its own bookings, its own admin,
// all named `ways-smoke-*`, all deleted at both ends.
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
import Stripe from "stripe";

const scrypt = promisify(scryptCb);
loadEnv({ path: ".env.local" });

const PORT = 3110;
const BASE = `http://localhost:${PORT}`;
const HOST = `localhost:${PORT}`;
const APP = resolve(".");
const WHSEC = "whsec_ways_smoke_only_not_a_real_secret";
const FAKE_KEY = "sk_test_ways_smoke_not_a_real_key_000000";
const USER = "ways-smoke@example.invalid";
const PASS = "ways-smoke-password-not-real";
const BUYER = "ways-smoke-buyer@example.invalid";
/** The address this run must never write to. Checked over the whole log. */
const HERS = "marianne@thefieldwork.co.uk";

const signer = new Stripe(FAKE_KEY, { apiVersion: "2025-02-24.acacia" });
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
  const root = resolve(".smoke-app-ways");
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
        AUTH_SECRET: "ways-smoke-secret-not-real-but-long-enough-32",
        NEXT_PUBLIC_SITE_URL: BASE,
        RESEND_API_KEY: "",
        EMAIL_TO_OWNER: "owner@example.invalid",
        STRIPE_SECRET_KEY: FAKE_KEY,
        STRIPE_WEBHOOK_SECRET: WHSEC,
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
      const response = await fetch(`${BASE}/courses`);
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
      await fetch(`${BASE}/courses`);
    } catch {
      return;
    }
    await sleep(500);
  }
}

// ── a signed event, the same harness course-bookings-smoke uses ──────────────

function courseEvent({
  eventId,
  sessionId,
  courseId,
  places,
  amountPence,
  payment,
}) {
  return {
    id: eventId,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        amount_total: amountPence,
        currency: "gbp",
        payment_status: "paid",
        payment_intent: `pi_${sessionId}`,
        customer_details: { email: BUYER, name: "A Buyer" },
        metadata: {
          courseId: String(courseId),
          places: String(places),
          offeringName: "A course",
          ...(payment ? { payment } : {}),
          site: HOST,
        },
      },
    },
  };
}

async function postEvent(event) {
  const payload = JSON.stringify(event);
  return fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signer.webhooks.generateTestHeaderString({
        payload,
        secret: WHSEC,
      }),
    },
    body: payload,
  });
}

// ── fixtures ─────────────────────────────────────────────────────────────────

async function cleanUp() {
  const { rows } = await db.query(
    `SELECT id FROM "Course" WHERE slug LIKE 'ways-smoke-%'`,
  );
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.query(`DELETE FROM "Booking" WHERE "courseId" = ANY($1::int[])`, [
      ids,
    ]);
    await db.query(`DELETE FROM "Course" WHERE id = ANY($1::int[])`, [ids]);
  }
  await db.query(`DELETE FROM "Booking" WHERE "buyerEmail" = $1`, [BUYER]);
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
}

/**
 * A published course with a date well ahead, and whatever ways she has ticked.
 * `balanceDays` is relative to today, so a NEGATIVE one is the expired-deposit
 * case that has to fall back to the price.
 */
async function makeCourse({
  slug,
  pricePence,
  payInFull = true,
  depositOffered = false,
  depositPence = null,
  balanceDays = null,
  planOffered = false,
  parts = 1,
  everyDays = 30,
  interestBps = 0,
}) {
  const { rows } = await db.query(
    `INSERT INTO "Course" (slug, name, summary, "bodyHtml", "venueName", "addressLines",
       postcode, "gettingThere", capacity, "priceGBP", "depositGBP", "balanceDueAt",
       "refundDays", instalments, "instalmentEveryDays", "payInFull", "depositOffered",
       "planOffered", "planInterestBps", published, "heroImage", "heroAlt",
       "createdAt", "updatedAt")
     VALUES ($1, 'A course', 'What it is.', '<p>Something written.</p>', 'The Garden Room',
       E'Fromefield\nFrome\nSomerset', 'BA11 2QN', 'Step-free.', 8, $2, $3,
       CASE WHEN $4::int IS NULL THEN NULL ELSE (now() + ($4 || ' days')::interval)::date END,
       14, $5, $6, $7, $8, $9, $10, true, 'nothing-here', 'A picture',
       now(), now())
     RETURNING id`,
    [
      slug,
      pricePence,
      depositPence,
      balanceDays === null ? null : String(balanceDays),
      parts,
      everyDays,
      payInFull,
      depositOffered,
      planOffered,
      interestBps,
    ],
  );
  const id = rows[0].id;
  await db.query(
    `INSERT INTO "CourseSession" ("courseId", title, date, "startTime", "endTime", venue, description, "updatedAt")
     VALUES ($1, 'The first one', (now() + interval '90 days')::date, '19:00', '21:00', 'The Garden Room', 'What happens.', now())`,
    [id],
  );
  return id;
}

const planRows = async (bookingId) =>
  (
    await db.query(
      `SELECT number, "amountPence", "dueAt", "paidAt" IS NOT NULL AS paid
         FROM "Instalment" WHERE "bookingId" = $1 ORDER BY number`,
      [bookingId],
    )
  ).rows;

const bookingFor = async (courseId) =>
  (
    await db.query(
      `SELECT * FROM "Booking" WHERE "courseId" = $1 ORDER BY id DESC LIMIT 1`,
      [courseId],
    )
  ).rows[0];

// ═════════════════════════════════════════════════════════════════════════════

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
  await db.query(
    `INSERT INTO "AdminUser" (username, email, "passwordHash", "mustChangePassword", "updatedAt")
     VALUES ($1, $2, $3, false, now())`,
    [
      USER,
      `${USER}.address`,
      [
        "scrypt",
        32768,
        8,
        1,
        salt.toString("base64"),
        hash.toString("base64"),
      ].join("$"),
    ],
  );
}

// £600 with all three ways: £150 deposit due in 40 days, or six payments at 5%.
const ALL = await makeCourse({
  slug: "ways-smoke-all-three",
  pricePence: 60000,
  depositOffered: true,
  depositPence: 15000,
  balanceDays: 40,
  planOffered: true,
  parts: 6,
  everyDays: 30,
  interestBps: 500,
});

// The same course with the deposit UNTICKED — the figures are still on the row.
const NO_TICK = await makeCourse({
  slug: "ways-smoke-untitcked-deposit",
  pricePence: 60000,
  depositOffered: false,
  depositPence: 15000,
  balanceDays: 40,
  planOffered: false,
  parts: 6,
});

// A deposit whose day has been. The operator's own ifr-course, in miniature.
const EXPIRED = await makeCourse({
  slug: "ways-smoke-expired-deposit",
  pricePence: 60000,
  payInFull: false,
  depositOffered: true,
  depositPence: 15000,
  balanceDays: -5,
});

// Nothing ticked at all.
const NOTHING = await makeCourse({
  slug: "ways-smoke-nothing-ticked",
  pricePence: 60000,
  payInFull: false,
});

// A plan with no interest, and a total that does not divide evenly: £100 in 3.
const ODD = await makeCourse({
  slug: "ways-smoke-odd-thirds",
  pricePence: 10000,
  payInFull: false,
  planOffered: true,
  parts: 3,
  everyDays: 30,
});

const server = await startServer();

try {
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1400, height: 1200 } })
  ).newPage();
  page.setDefaultTimeout(60_000);

  const complaints = [];
  page.on("pageerror", (error) => complaints.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/404/.test(message.text()))
      complaints.push(message.text());
  });

  const waysOn = async (slug) => {
    await page.goto(`${BASE}/courses/${slug}`, { waitUntil: "networkidle" });
    const radios = page.locator('#book input[type="radio"][name="way"]');
    const count = await radios.count();
    if (count === 0)
      return [await page.locator('#book input[name="payment"]').inputValue()];
    const out = [];
    for (let n = 0; n < count; n++)
      out.push(await radios.nth(n).getAttribute("value"));
    return out;
  };

  // ══ 1 · THE TICK DECIDES ═══════════════════════════════════════════════════
  console.log("\n— what she ticked is what is offered —\n");

  ok(
    "all three ticked, all three offered, full first",
    JSON.stringify(await waysOn("ways-smoke-all-three")) ===
      JSON.stringify(["full", "deposit", "plan"]),
  );

  ok(
    "a deposit FIGURE with the tick off is not an offer",
    JSON.stringify(await waysOn("ways-smoke-untitcked-deposit")) ===
      JSON.stringify(["full"]),
  );

  ok(
    "a deposit whose day has been falls BACK to the price, not through it",
    JSON.stringify(await waysOn("ways-smoke-expired-deposit")) ===
      JSON.stringify(["full"]),
  );

  ok(
    "nothing ticked still leaves a course somebody can buy",
    JSON.stringify(await waysOn("ways-smoke-nothing-ticked")) ===
      JSON.stringify(["full"]),
  );

  // ══ 2 · THE FIGURES ON THE PAGE ════════════════════════════════════════════
  console.log("\n— and the figures are the ones charged —\n");

  await page.goto(`${BASE}/courses/ways-smoke-all-three`, {
    waitUntil: "networkidle",
  });
  const panel = page.locator("#book");
  const said = (await panel.innerText()).replace(/\s+/g, " ");

  ok(
    "the price is the price",
    /£600 for the whole run/.test(said),
    said.slice(0, 120),
  );
  ok("all of it now is the price", /All of it now £600 now/.test(said), said);
  ok(
    "the deposit shows BOTH figures, never the small one alone",
    /A deposit now £150 now/.test(said) && /£450 by/.test(said),
    said,
  );
  ok(
    "the plan's first payment is the price PLUS interest, divided",
    // £600 at 5% is £630; a sixth is £105.
    /In parts £105 now/.test(said) && /5 more of £105/.test(said),
    said,
  );

  await panel.getByText("In parts", { exact: true }).click();
  await page.waitForTimeout(300);
  const withPlan = (await panel.innerText()).replace(/\s+/g, " ");
  ok(
    "and what the interest COSTS is said in words, not left to a statement",
    /£630 in all/.test(withPlan) &&
      /£30 more than paying at once/.test(withPlan),
    withPlan.slice(0, 300),
  );
  ok(
    "the button charges what was chosen",
    /Pay the first of 6 · £105/.test(
      await panel.locator('button[type="submit"]').innerText(),
    ),
    await panel.locator('button[type="submit"]').innerText(),
  );

  // The rounding, where it shows: £100 in three.
  await page.goto(`${BASE}/courses/ways-smoke-odd-thirds`, {
    waitUntil: "networkidle",
  });
  const odd = (await page.locator("#book").innerText()).replace(/\s+/g, " ");
  ok(
    "an uneven division names the odd last part rather than rounding out loud",
    /£33.33 now/.test(odd) && /£33.33 and a last of £33.34/.test(odd),
    odd.slice(0, 300),
  );

  // ══ 3 · A WAY THAT IS NOT OFFERED IS REFUSED ═══════════════════════════════
  console.log("\n— and a way that is not offered is refused —\n");

  await page.goto(`${BASE}/courses/ways-smoke-untitcked-deposit`, {
    waitUntil: "networkidle",
  });
  // The hidden field is what the server reads. Editing it is exactly what
  // somebody with the developer tools open would do.
  await page.evaluate(() => {
    const field = document.querySelector('#book input[name="payment"]');
    if (field) field.value = "deposit";
  });
  await page.locator('#book button[type="submit"]').click();
  await page.waitForTimeout(3000);
  const refused = (await page.locator("#book").innerText()).replace(
    /\s+/g,
    " ",
  );
  ok(
    "asking for a deposit the course does not offer is REFUSED, not downgraded",
    /no longer taking a deposit/.test(refused),
    refused.slice(0, 300),
  );
  ok(
    "and nothing was charged",
    (
      await db.query(`SELECT count(*) FROM "Booking" WHERE "courseId" = $1`, [
        NO_TICK,
      ])
    ).rows[0].count === "0",
  );

  // ══ 4 · WHAT A PLAN WRITES ═════════════════════════════════════════════════
  console.log("\n— what a plan writes down —\n");

  const planId = `evt_ways_plan_${Date.now()}`;
  const planRes = await postEvent(
    courseEvent({
      eventId: planId,
      sessionId: `cs_ways_plan_${Date.now()}`,
      courseId: ALL,
      places: 1,
      amountPence: 10500,
      payment: "plan",
    }),
  );
  ok("the webhook took the plan payment", planRes.ok, String(planRes.status));
  await page.waitForTimeout(1500);

  const planBooking = await bookingFor(ALL);
  const rows = await planRows(planBooking.id);

  ok(
    "the booking is for the plan TOTAL, interest included",
    planBooking.totalPence === 63000,
    String(planBooking.totalPence),
  );
  ok("six rows, one per payment", rows.length === 6, String(rows.length));
  ok(
    "they sum to exactly the total — nobody is asked for a stray penny",
    rows.reduce((sum, row) => sum + row.amountPence, 0) === 63000,
    JSON.stringify(rows.map((row) => row.amountPence)),
  );
  ok(
    "the first is paid, by the payment that has just landed",
    rows[0].paid === true && rows.slice(1).every((row) => row.paid === false),
    JSON.stringify(rows.map((row) => row.paid)),
  );
  ok(
    "no balance DAY — a plan has six of them, on the rows",
    planBooking.balanceDueAt === null,
    String(planBooking.balanceDueAt),
  );
  ok(
    "but a pay link IS issued — this is the bug the suite was written for",
    planBooking.balanceTokenHash !== null,
  );
  ok(
    "and the payment is recorded as an instalment, not as a deposit",
    (
      await db.query(`SELECT kind FROM "Payment" WHERE "bookingId" = $1`, [
        planBooking.id,
      ])
    ).rows[0].kind === "instalment",
  );

  // ══ 5 · A DEPOSIT IS NOT A PLAN ════════════════════════════════════════════
  console.log("\n— and a deposit is not a plan —\n");

  const depId = `evt_ways_dep_${Date.now()}`;
  await postEvent(
    courseEvent({
      eventId: depId,
      sessionId: `cs_ways_dep_${Date.now()}`,
      courseId: ALL,
      places: 1,
      amountPence: 15000,
      payment: "deposit",
    }),
  );
  await page.waitForTimeout(1500);

  const depBooking = await bookingFor(ALL);
  ok(
    "it is for the PRICE — a deposit does not attract the plan's interest",
    depBooking.totalPence === 60000,
    String(depBooking.totalPence),
  );
  ok(
    "it has a balance day",
    depBooking.balanceDueAt !== null,
    String(depBooking.balanceDueAt),
  );
  ok(
    "and NO plan rows — the two are alternatives",
    (await planRows(depBooking.id)).length === 0,
  );

  // ══ 6 · AND THE FAR END CHECKS TOO ═════════════════════════════════════════
  console.log("\n— and the far end checks the choice as well —\n");

  const sneakId = `evt_ways_sneak_${Date.now()}`;
  await postEvent(
    courseEvent({
      eventId: sneakId,
      sessionId: `cs_ways_sneak_${Date.now()}`,
      courseId: NO_TICK,
      places: 1,
      amountPence: 60000,
      payment: "plan",
    }),
  );
  await page.waitForTimeout(1500);

  const sneak = await bookingFor(NO_TICK);
  ok(
    "a payment stamped for a plan the course does not offer is written as paid in full",
    sneak && sneak.totalPence === 60000 && sneak.balanceDueAt === null,
    JSON.stringify(
      sneak && { total: sneak.totalPence, due: sneak.balanceDueAt },
    ),
  );
  ok(
    "with no plan rows behind it",
    sneak ? (await planRows(sneak.id)).length === 0 : false,
  );
  ok(
    "and it is said out loud in the log rather than passed over",
    /no longer offers it/.test(server.out()),
  );

  // ══ 7 · AND NOTHING WAS SENT ═══════════════════════════════════════════════
  console.log("\n— and nothing was actually sent —\n");

  const log = server.out();
  ok(
    "every message in this run went to the log, not to a provider",
    !/\[email\] sent via resend/i.test(log),
  );
  ok(
    "NOT ONE MESSAGE IN THIS RUN WAS ADDRESSED TO HER",
    // The RECIPIENT lines, and not the whole log. `Reply-To: marianne@…` is on
    // every message this site sends and is meant to be — a buyer who hits
    // reply should reach her. The claim here is that nothing was ADDRESSED to
    // her, which is a claim about `To:`, not about the whole page of text.
    ![...log.matchAll(/^(?:To|Cc|Bcc):\s+(.+)$/gm)].some((match) =>
      match[1].includes(HERS),
    ),
    [...log.matchAll(/^To:\s+(.+)$/gm)].map((m) => m[1]).join(" · "),
  );
  ok(
    "and every address it wrote to is .invalid",
    [...log.matchAll(/^To:\s+(\S+@\S+)/gm)].every((match) =>
      match[1].includes(".invalid"),
    ),
    [...log.matchAll(/^To:\s+(\S+@\S+)/gm)].map((m) => m[1]).join(", "),
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
