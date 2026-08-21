// =============================================================================
// Buying a place on a course — the deposit, the balance, and the place that lapses
// =============================================================================
//
// One claim, exercised: a course place is committed by its DEPOSIT, settled by
// a balance paid through a link on our own site, and released — by arithmetic,
// with nothing running — when that balance never comes.
//
// Everything else here is a thing that had to be true on the way: one payment
// row per completed session, the same event delivered twice making one of
// everything, capacity counted off the deposit rather than the full price, a
// course with no deposit settled in one payment, the balance link saying "this
// was already paid" the second time it is pressed and "this place has been
// released" when the chair has gone, and Booking 25 — a real place, really paid
// for — coming out of the migration exactly as it went in.
//
// It is a sibling of bookings-smoke.mjs and runs the same way, on the same
// harness, with the same three guarantees below.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3100.
//   2. node e2e/course-bookings-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL MONEY AND NO REAL EMAIL. The server it starts is given:
//
//   RESEND_API_KEY=""        — an empty value, which BEATS the one in
//                              .env.local (@next/env only fills variables that
//                              are undefined). The email module's log adapter
//                              runs, so every message is printed and none is
//                              delivered. This is checked, not assumed.
//   STRIPE_SECRET_KEY=sk_test_…  — a made-up key belonging to no account. Any
//                              call to Stripe gets a 401 and moves nothing.
//   every address ends .invalid — a reserved suffix that cannot be delivered to
//                              even if everything above failed at once.
//
// The Stripe events are synthetic and signed with a secret this script chose,
// using Stripe's own signing helper. Nothing here touches the operator's
// Stripe account.
//
// It creates courses whose slugs begin `smoke-course-` and deletes them, with
// their bookings and payments, at the end. It touches nothing else — and it
// READS the operator's own Booking 25 without writing to it.
// =============================================================================

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { cpSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { chromium } from "playwright";
import Stripe from "stripe";

loadEnv({ path: ".env.local" });

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const HOST = `localhost:${PORT}`;
const WHSEC = "whsec_smoke_test_only_not_a_real_secret";
const FAKE_KEY = "sk_test_smoke_not_a_real_key_0000000000";
const OWNER = "owner@example.invalid";
const BUYER = "buyer@example.invalid";

const signer = new Stripe(FAKE_KEY);
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
//
// A COPY OF THE APP, somewhere else — the same arrangement bookings-smoke.mjs
// uses, and for the same two reasons: Next refuses a second dev server for one
// directory, and the copy has no .env.local, so the child inherits only the
// variables named below. There is no way for the real RESEND_API_KEY to reach
// it however this script is run.

async function makeCopy() {
  const root = resolve(".smoke-app");
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

async function startServer(env, label) {
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
        AUTH_SECRET: process.env.AUTH_SECRET ?? "smoke-test-secret-not-real",
        NEXT_PUBLIC_SITE_URL: BASE,
        EMAIL_TO_OWNER: OWNER,
        ...env,
      },
    },
  );
  const collect = (buffer) => log.push(buffer.toString());
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/courses`);
      if (response.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  if (Date.now() >= deadline) {
    throw new Error(`${label} never came up:\n${log.join("")}`);
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
      await fetch(`${BASE}/courses`);
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

/**
 * A course with a run of dates. `depositGBP` and `balanceDueAt` are the
 * arrangement under test: both set means a deposit is taken and the rest is
 * owed; both null means the whole price is taken at once, like a workshop.
 */
async function makeCourse({
  slug,
  name,
  capacity,
  pricePence,
  depositPence,
  balanceDueOffset,
  refundDays,
  dateOffsets,
}) {
  const { rows } = await db.query(
    `INSERT INTO "Course"
       (slug, name, summary, "bodyHtml", "venueName", "addressLines", postcode,
        "gettingThere", capacity, "priceGBP", "depositGBP", "balanceDueAt",
        "refundDays", "depositOffered", published, "heroImage", "heroAlt", "updatedAt")
     VALUES ($1,$2,$3,$4,'The Garden Room','Fromefield\nFrome','BA11 2QN',
             'Step-free from the pavement.',$5,$6,$7,$8,$9,
             -- SINCE 2026-08-21 A DEPOSIT IS AN OFFER SHE TICKS, not a figure
             -- sitting in a column: waysToPay reads the tick. This fixture
             -- predates the tick and wrote only the figure, so every deposit
             -- claim below began failing against a course that no longer
             -- offered one. The tick follows the figure here, which is exactly
             -- what the migration did to her real courses.
             $10, true,
             'work-wide-the-room','The room, empty.', now())
     RETURNING id`,
    [
      slug,
      name,
      "A run of evenings learning to notice what you already notice.",
      "<p>Written for the smoke test.</p>",
      capacity,
      pricePence,
      depositPence,
      balanceDueOffset === null ? null : day(balanceDueOffset),
      refundDays,
      depositPence !== null,
    ],
  );
  const id = rows[0].id;
  for (const [index, offset] of dateOffsets.entries()) {
    await db.query(
      `INSERT INTO "CourseSession"
         ("courseId", title, date, "startTime", "endTime", venue, description, "updatedAt")
       VALUES ($1,$2,$3,'19:00','21:00','The Garden Room',$4, now())`,
      [id, `Evening ${index + 1}`, day(offset), "What happens this time."],
    );
  }
  return id;
}

// ── synthetic, signature-verified events ─────────────────────────────────────

/** A first payment: a deposit when the course has one, otherwise the lot. */
function courseEvent({
  eventId,
  sessionId,
  courseId,
  places,
  name,
  amountPence,
  site = HOST,
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
        customer_details: { email: BUYER, name: "Sarah Hall" },
        metadata: {
          courseId: String(courseId),
          places: String(places),
          offeringName: name,
          ...(site === null ? {} : { site }),
        },
      },
    },
  };
}

/** The second payment. `balanceFor` is what the webhook branches on. */
function balanceEvent({ eventId, sessionId, bookingId, amountPence }) {
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
        customer_details: { email: BUYER, name: "Sarah Hall" },
        metadata: {
          balanceFor: String(bookingId),
          offeringName: "a course",
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

/** Bookings for one course, with their Payment rows folded in. */
const bookings = async (courseId) => {
  const { rows } = await db.query(
    `SELECT * FROM "Booking" WHERE "courseId" = $1 ORDER BY id`,
    [courseId],
  );
  const { rows: paid } = await db.query(
    `SELECT * FROM "Payment" WHERE "bookingId" = ANY($1::int[]) ORDER BY id`,
    [rows.map((row) => row.id)],
  );
  return rows.map((row) => {
    const payments = paid.filter((one) => one.bookingId === row.id);
    const total = payments.reduce((sum, one) => sum + one.amountPence, 0);
    return {
      ...row,
      payments,
      paid: total,
      outstanding: Math.max(0, row.totalPence - total),
    };
  });
};

const eventRow = (id) =>
  db
    .query(`SELECT * FROM "StripeEvent" WHERE id = $1`, [id])
    .then((r) => r.rows[0] ?? null);

// ── the run ──────────────────────────────────────────────────────────────────

const COPY = await makeCopy();
await db.connect();
await cleanUp();

const stamp = Date.now();
const ids = {};

// Three places, £240 the run, £80 down and the rest three weeks out.
ids.main = await makeCourse({
  slug: `smoke-course-main-${stamp}`,
  name: "The Long Attention",
  capacity: 3,
  pricePence: 24000,
  depositPence: 8000,
  balanceDueOffset: 20,
  refundDays: 14,
  dateOffsets: [40, 47, 54],
});
// One place, for the race and for the lapse.
ids.one = await makeCourse({
  slug: `smoke-course-one-${stamp}`,
  name: "The Last Place",
  capacity: 1,
  pricePence: 24000,
  depositPence: 8000,
  balanceDueOffset: 20,
  refundDays: 14,
  dateOffsets: [40, 47],
});
// A course with no deposit at all: one payment, settled, no balance link.
ids.whole = await makeCourse({
  slug: `smoke-course-whole-${stamp}`,
  name: "Paid At Once",
  capacity: 5,
  pricePence: 12000,
  depositPence: null,
  balanceDueOffset: null,
  refundDays: 14,
  dateOffsets: [40],
});
// One place, and a balance that was due two days ago.
ids.lapsed = await makeCourse({
  slug: `smoke-course-lapsed-${stamp}`,
  name: "The One That Lapsed",
  capacity: 1,
  pricePence: 24000,
  depositPence: 8000,
  balanceDueOffset: -2,
  refundDays: 14,
  dateOffsets: [40, 47],
});
const MISSING_COURSE = 2_000_000_000;

const server = await startServer(
  { STRIPE_SECRET_KEY: FAKE_KEY, STRIPE_WEBHOOK_SECRET: WHSEC },
  "configured server",
);

try {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  // ── the operator's own data, before anything else happens ─────────────────
  //
  // FIRST, and read-only. Booking 25 is a real place on a real workshop, and
  // the migration that made payments into rows had to leave it exactly as it
  // was: one booking, one payment of kind `full`, the same session and the same
  // amount it was taken with.
  const { rows: theirs } = await db.query(
    `SELECT b.id, b."totalPence", b.status, b."workshopId", b."courseId",
            b."balanceDueAt", b."balanceTokenHash",
            p.kind, p."amountPence", p."stripeSessionId", p."stripePaymentIntentId"
       FROM "Booking" b LEFT JOIN "Payment" p ON p."bookingId" = b.id
      WHERE b.id = 25`,
  );
  if (theirs.length > 0) {
    const [row] = theirs;
    ok(
      "the operator's own workshop booking survived the migration as one booking",
      theirs.length === 1 &&
        row.status === "paid" &&
        row.workshopId !== null &&
        row.courseId === null,
      `${theirs.length} rows, ${row?.status}`,
    );
    ok(
      "and as ONE payment of kind full, carrying the money it was taken with",
      row.kind === "full" &&
        row.amountPence === row.totalPence &&
        String(row.stripeSessionId).startsWith("cs_") &&
        String(row.stripePaymentIntentId).startsWith("pi_"),
      `${row.kind} / ${row.amountPence} of ${row.totalPence}`,
    );
    ok(
      "with no balance and no link to pay one, because a workshop never owes",
      row.balanceDueAt === null && row.balanceTokenHash === null,
    );
  } else {
    ok(
      "the operator's booking 25 is present to check",
      false,
      "it is not there",
    );
  }

  // ── the database refuses a booking for two things, or for none ────────────
  const bothAtOnce = await db
    .query(
      `INSERT INTO "Booking"
         ("workshopId","courseId","buyerName","buyerEmail",places,"totalPence",
          status,"cancellationTokenHash","paidAt","updatedAt")
       VALUES (NULL,NULL,'Nobody','x@example.invalid',1,100,'paid',$1,now(),now())`,
      [`hash_neither_${stamp}`],
    )
    .then(() => null)
    .catch((error) => error.message);
  ok(
    "a booking for NEITHER a workshop nor a course is refused by the database",
    bothAtOnce !== null && /Booking_one_offering/.test(bothAtOnce),
    String(bothAtOnce).slice(0, 120),
  );

  // ── a deposit buys the place ──────────────────────────────────────────────
  const first = courseEvent({
    eventId: `evt_smoke_c_first_${stamp}`,
    sessionId: `cs_smoke_c_first_${stamp}`,
    courseId: ids.main,
    places: 1,
    name: "The Long Attention",
    amountPence: 8000,
  });
  const made = await postEvent(first);
  ok("a verified course event is accepted", made.status === 200);

  let rows = await bookings(ids.main);
  ok(
    "one paid booking exists, owing the whole price",
    rows.length === 1 &&
      rows[0].status === "paid" &&
      rows[0].totalPence === 24000,
    `${rows.length} rows, ${rows[0]?.status}, owes ${rows[0]?.totalPence}`,
  );
  ok(
    "and ONE payment against it, of kind deposit, for what Stripe charged",
    rows[0].payments.length === 1 &&
      rows[0].payments[0].kind === "deposit" &&
      rows[0].payments[0].amountPence === 8000,
    rows[0].payments.map((one) => `${one.kind} ${one.amountPence}`).join(", "),
  );
  ok(
    "so £160 is outstanding — derived from the two, not stored on either",
    rows[0].outstanding === 16000,
    String(rows[0].outstanding),
  );
  ok(
    "the booking carries the course's balance date, copied rather than read through",
    rows[0].balanceDueAt !== null &&
      new Date(rows[0].balanceDueAt).toISOString().slice(0, 10) ===
        day(20).toISOString().slice(0, 10),
    String(rows[0].balanceDueAt),
  );
  ok(
    "and only the HASHES of the two links, never the tokens",
    /^[0-9a-f]{64}$/.test(rows[0].cancellationTokenHash) &&
      /^[0-9a-f]{64}$/.test(rows[0].balanceTokenHash),
  );

  // ── the same event again ──────────────────────────────────────────────────
  const again = await postEvent(first);
  ok("a redelivered event is accepted", again.status === 200);
  ok(
    "and is answered as the replay it is",
    (await again.json()).replay === true,
  );
  rows = await bookings(ids.main);
  ok(
    "one booking and one payment, although the event arrived twice",
    rows.length === 1 && rows[0].payments.length === 1,
    `${rows.length} bookings, ${rows[0]?.payments.length} payments`,
  );
  ok(
    "the event is on the record, saying it became a place",
    (await eventRow(first.id))?.outcome === "booked",
    String((await eventRow(first.id))?.outcome),
  );

  // ── the emails ────────────────────────────────────────────────────────────
  await sleep(500);
  const log = server.out();
  ok(
    "nothing was actually sent — the log adapter ran",
    log.includes("EMAIL (not sent — no RESEND_API_KEY)"),
  );
  ok(
    "the confirmation went to the buyer and the notice to Marianne",
    log.includes(`[bookings] confirmation → ${BUYER}`) &&
      log.includes(`[bookings] booking notice → ${OWNER}`),
  );
  ok(
    "exactly one of each, although the event arrived twice",
    countOf(log, "[bookings] confirmation →") === 1 &&
      countOf(log, "[bookings] booking notice →") === 1,
  );

  const confirmation = emailTo(log, BUYER);
  ok(
    "the confirmation names the run and every date in it",
    /Three \w+ evenings/.test(confirmation) &&
      countOf(confirmation, "19:00–21:00") === 3,
    confirmation.slice(0, 300),
  );
  ok(
    "the room and its address",
    confirmation.includes("The Garden Room") &&
      confirmation.includes("Fromefield") &&
      confirmation.includes("BA11 2QN"),
  );
  ok(
    "what they paid, what is still owed, and BY WHEN",
    confirmation.includes("£80 deposit paid") &&
      confirmation.includes("£160 still to pay") &&
      confirmation.includes(dayWords(20)),
    confirmation
      .split("\n")
      .filter((line) => line.includes("£"))
      .join(" | "),
  );
  ok(
    "and it says plainly what happens if the balance is not paid",
    confirmation.includes("the place is released"),
  );

  const payMatch = /http:\/\/localhost:3100\/pay\/([A-Za-z0-9_-]{20,})/.exec(
    confirmation,
  );
  const cancelMatch =
    /http:\/\/localhost:3100\/cancel\/([A-Za-z0-9_-]{20,})/.exec(confirmation);
  ok("it carries the link to pay the rest", Boolean(payMatch));
  ok("and the link to cancel, as a workshop's does", Boolean(cancelMatch));
  const payToken = payMatch?.[1];
  const cancelToken = cancelMatch?.[1];

  const notice = emailTo(log, OWNER);
  ok(
    "Marianne is told who booked, what is outstanding and when it is due",
    notice.includes("Sarah Hall") &&
      notice.includes("£80 deposit paid of £240") &&
      notice.includes("£160 OUTSTANDING") &&
      notice.includes(dayWords(20)),
    notice.slice(0, 320),
  );

  // ── the place is committed by the deposit ─────────────────────────────────
  await page.goto(`${BASE}/courses/smoke-course-main-${stamp}`);
  const mainPage = await page.locator("body").innerText();
  ok(
    "the course page counts the place off the room, on the deposit alone",
    mainPage.includes("2 places left of 3"),
    mainPage.split("\n").find((line) => line.includes("left of")) ?? "",
  );
  // SINCE 2026-08-21 THE DEPOSIT IS A CHOICE, NOT THE ONLY BUTTON. A course
  // that offers both shows the price first and the deposit beside it, which is
  // what the operator asked for ("pay in 1 enabled as default… if a client
  // selects deposit they pay the deposit at checkout"). The claim is unchanged
  // — the deposit is offered, with the rest and its date beside it — and it is
  // now checked by PICKING it, which is stronger than reading a button that had
  // no alternative to be.
  ok(
    "the panel offers the deposit, with the rest and its date beside it",
    mainPage.includes("\u00a380") &&
      mainPage.includes("\u00a3160") &&
      mainPage.includes(dayWords(20)),
    mainPage.split("\n").slice(-14).join(" | "),
  );
  await page.locator("#book").getByText("A deposit now").click();
  ok(
    "and choosing it puts the deposit on the button, not the price",
    (await page.getByRole("button", { name: /Pay the deposit/ }).count()) ===
      1 &&
      (await page.locator('#book button[type="submit"]').innerText()).includes(
        "\u00a380",
      ),
    await page.locator('#book button[type="submit"]').innerText(),
  );

  // ── the balance link ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/pay/${payToken}`);
  const payText = await page.locator("body").innerText();
  ok(
    "the balance page says what is owed and by when",
    payText.includes("£160 is still to pay") && payText.includes(dayWords(20)),
    payText.replace(/\n/g, " | ").slice(0, 300),
  );
  ok(
    "and restates what was bought, so nobody pays for the wrong thing",
    payText.includes("The Long Attention") &&
      payText.includes("£80 paid of £240"),
  );
  ok(
    "the button names the amount it will take",
    (await page
      .getByRole("button", { name: "Pay the remaining £160" })
      .count()) === 1,
  );

  const bookingId = rows[0].id;
  const balance = balanceEvent({
    eventId: `evt_smoke_c_bal_${stamp}`,
    sessionId: `cs_smoke_c_bal_${stamp}`,
    bookingId,
    amountPence: 16000,
  });
  const settled = await postEvent(balance);
  ok("a verified balance event is accepted", settled.status === 200);

  rows = await bookings(ids.main);
  ok(
    "it becomes a SECOND payment on the same booking, of kind balance",
    rows[0].payments.length === 2 &&
      rows[0].payments.some(
        (one) => one.kind === "balance" && one.amountPence === 16000,
      ),
    rows[0].payments.map((one) => `${one.kind} ${one.amountPence}`).join(", "),
  );
  ok(
    "and nothing is outstanding — arithmetic, with no flag to set",
    rows[0].outstanding === 0 && rows[0].paid === 24000,
    `${rows[0].paid} paid, ${rows[0].outstanding} owed`,
  );
  ok(
    "the place is unchanged: it was already held by the deposit",
    rows[0].status === "paid" && rows[0].places === 1,
  );
  ok(
    "the event is on the record, saying what it settled",
    (await eventRow(balance.id))?.outcome === "settled",
    String((await eventRow(balance.id))?.outcome),
  );

  await sleep(500);
  const afterBalance = server.out();
  ok(
    "both people are told the balance landed",
    afterBalance.includes(`[bookings] balance receipt → ${BUYER}`) &&
      afterBalance.includes(`[bookings] balance notice → ${OWNER}`),
  );
  ok(
    "the buyer's receipt says it is settled in full and nothing else is owed",
    emailTo(afterBalance, BUYER).includes("settled") &&
      emailTo(afterBalance, BUYER).includes("nothing else to pay"),
    emailTo(afterBalance, BUYER).slice(0, 240),
  );
  ok(
    "and Marianne's says nothing is outstanding",
    emailTo(afterBalance, OWNER).includes("Nothing is outstanding"),
    emailTo(afterBalance, OWNER).slice(0, 240),
  );

  // The same balance again. The event id, the session id and the one-balance-
  // per-booking rule are all unique; any of the three is enough on its own.
  const balanceAgain = await postEvent(balance);
  ok("a redelivered balance is accepted", balanceAgain.status === 200);
  ok(
    "and is answered as the replay it is",
    (await balanceAgain.json()).replay === true,
  );
  rows = await bookings(ids.main);
  ok(
    "no second balance payment is written",
    rows[0].payments.length === 2,
    String(rows[0].payments.length),
  );
  ok(
    "and nobody is thanked twice",
    countOf(server.out(), "[bookings] balance receipt →") === 1,
  );

  // ── pressing the link again ───────────────────────────────────────────────
  await page.goto(`${BASE}/pay/${payToken}`);
  const paidPage = await page.locator("body").innerText();
  ok(
    "the balance link now says it is already paid, as reassurance not an error",
    paidPage.includes("already paid in full") &&
      paidPage.includes("nothing left to pay"),
    paidPage.replace(/\n/g, " | ").slice(0, 240),
  );
  ok(
    "and offers no way to pay it a second time",
    (await page.getByRole("button", { name: /Pay the remaining/ }).count()) ===
      0,
  );

  // ── the cancellation link still works on a course ─────────────────────────
  await page.goto(`${BASE}/cancel/${cancelToken}`);
  const cancelText = await page.locator("body").innerText();
  ok(
    "the cancellation link opens on a course and shows the run, not one date",
    cancelText.includes("The Long Attention") &&
      /three \w+ evenings/.test(cancelText),
    cancelText.replace(/\n/g, " | ").slice(0, 240),
  );
  ok(
    "and offers to return everything that has actually been paid",
    cancelText.includes("£240 will go back to the card you paid with"),
    cancelText.replace(/\n/g, " | ").slice(0, 400),
  );

  // ── a course with no deposit is settled in one payment ────────────────────
  const whole = courseEvent({
    eventId: `evt_smoke_c_whole_${stamp}`,
    sessionId: `cs_smoke_c_whole_${stamp}`,
    courseId: ids.whole,
    places: 2,
    name: "Paid At Once",
    amountPence: 24000,
  });
  ok(
    "a course with no deposit is accepted",
    (await postEvent(whole)).status === 200,
  );
  const wholeRows = await bookings(ids.whole);
  ok(
    "it writes ONE payment of kind full, for the whole price of both places",
    wholeRows.length === 1 &&
      wholeRows[0].payments.length === 1 &&
      wholeRows[0].payments[0].kind === "full" &&
      wholeRows[0].payments[0].amountPence === 24000,
    wholeRows[0]?.payments.map((one) => one.kind).join(", "),
  );
  ok(
    "nothing is outstanding, and there is no balance date and no link to pay one",
    wholeRows[0].outstanding === 0 &&
      wholeRows[0].balanceDueAt === null &&
      wholeRows[0].balanceTokenHash === null,
  );
  await sleep(500);
  const wholeMail = emailTo(server.out(), BUYER);
  ok(
    "and its confirmation says what was paid without offering a link to pay more",
    wholeMail.includes("£240 paid") && !wholeMail.includes("/pay/"),
    wholeMail.slice(0, 240),
  );

  // ── a place whose balance never came ──────────────────────────────────────
  //
  // Seeded rather than aged, because the only difference between this and the
  // booking above is a date two days behind us — and nothing sweeps, so there
  // is nothing to trigger. The place is free because the arithmetic says so.
  const lapsedBooking = await seedDepositBooking(ids.lapsed, "lapsed", -2);

  await page.goto(`${BASE}/courses/smoke-course-lapsed-${stamp}`);
  const lapsedPage = await page.locator("body").innerText();
  ok(
    "a place whose balance is overdue stops counting toward the room",
    lapsedPage.includes("1 place") && !lapsedPage.includes("0 places left"),
    lapsedPage.split("\n").find((line) => line.includes("place")) ?? "",
  );
  // And on sale at the WHOLE price, not on a deposit: this course's own balance
  // day has been, so the two-payment arrangement has ended with it. Offering a
  // deposit here would write a booking that is overdue the instant it exists.
  ok(
    "so the course is on sale again, with nothing having had to run",
    (await page
      .getByRole("button", { name: /^Book 1 place · £240/ })
      .count()) === 1 &&
      (await page.getByRole("button", { name: /Pay the deposit/ }).count()) ===
        0,
    oneLine(lapsedPage),
  );

  await page.goto(`${BASE}/pay/${lapsedBooking.payToken}`);
  const overdue = await page.locator("body").innerText();
  ok(
    "the balance link says it was due, that the place went back, and that it can be taken again",
    overdue.includes("which has passed") &&
      overdue.includes("Nobody else has taken it"),
    overdue.replace(/\n/g, " | ").slice(0, 300),
  );

  // Somebody else takes the last place. It is available BECAUSE the lapsed one
  // stopped counting — which is the whole claim.
  const taken = courseEvent({
    eventId: `evt_smoke_c_taken_${stamp}`,
    sessionId: `cs_smoke_c_taken_${stamp}`,
    courseId: ids.lapsed,
    places: 1,
    name: "The One That Lapsed",
    // The WHOLE price: this course's balance day has been, so the deposit
    // arrangement has ended and the checkout takes the lot (depositStillOffered).
    amountPence: 24000,
  });
  ok(
    "somebody else can buy the released place, at the whole price",
    (await postEvent(taken)).status === 200,
  );
  const lapsedRows = await bookings(ids.lapsed);
  ok(
    "and gets it — two paid bookings on a course that holds one",
    lapsedRows.filter((row) => row.status === "paid").length === 2,
    lapsedRows.map((row) => row.status).join(", "),
  );
  // Two paid rows, one chair. The lapsed one stopped counting when its balance
  // day passed; the new one counts, and the room is full again — which is the
  // whole claim, checked where the public page states it.
  await page.goto(`${BASE}/courses/smoke-course-lapsed-${stamp}`);
  const refilled = await page.locator("body").innerText();
  ok(
    "which is not overselling — the room reads as full again",
    refilled.includes("0 places left of 1"),
    oneLine(refilled),
  );

  await page.goto(`${BASE}/pay/${lapsedBooking.payToken}`);
  const gone = await page.locator("body").innerText();
  ok(
    "the lapsed booking's link now says the place has been released",
    gone.includes("This place has been released") &&
      gone.includes("somebody else has taken it"),
    gone.replace(/\n/g, " | ").slice(0, 300),
  );

  // And a balance arriving anyway — they were mid-checkout when the chair went.
  const tooLate = balanceEvent({
    eventId: `evt_smoke_c_late_${stamp}`,
    sessionId: `cs_smoke_c_late_${stamp}`,
    bookingId: lapsedBooking.id,
    amountPence: 16000,
  });
  ok(
    "a balance for a released place is accepted",
    (await postEvent(tooLate)).status === 200,
  );
  await sleep(750);
  const lateLog = server.out();
  ok(
    "it is NOT recorded as a payment on that booking",
    (await bookings(ids.lapsed)).find((row) => row.id === lapsedBooking.id)
      .payments.length === 1,
  );
  ok(
    "the event says what was done with it",
    (await eventRow(tooLate.id))?.outcome === "balanceUnwanted",
    String((await eventRow(tooLate.id))?.outcome),
  );
  ok(
    "the money is chased and both people are told",
    lateLog.includes(`[bookings] unwanted-balance refund → ${BUYER}`) &&
      lateLog.includes(`[bookings] unwanted-balance notice → ${OWNER}`),
  );
  ok(
    "and because this refund could not go through, nothing claims it did",
    emailTo(lateLog, BUYER).includes("is owed back to you") &&
      emailTo(lateLog, OWNER).includes("REFUND DID NOT GO THROUGH"),
    emailTo(lateLog, BUYER).slice(0, 240),
  );
  ok(
    "her notice says the deposit is still hers to decide about",
    emailTo(lateLog, OWNER).includes("Their deposit is still with you"),
    emailTo(lateLog, OWNER).slice(0, 320),
  );

  // ── two people, one place, at the same instant ────────────────────────────
  const [raceA, raceB] = await Promise.all([
    postEvent(
      courseEvent({
        eventId: `evt_smoke_c_raceA_${stamp}`,
        sessionId: `cs_smoke_c_raceA_${stamp}`,
        courseId: ids.one,
        places: 1,
        name: "The Last Place",
        amountPence: 8000,
      }),
    ),
    postEvent(
      courseEvent({
        eventId: `evt_smoke_c_raceB_${stamp}`,
        sessionId: `cs_smoke_c_raceB_${stamp}`,
        courseId: ids.one,
        places: 1,
        name: "The Last Place",
        amountPence: 8000,
      }),
    ),
  ]);
  ok(
    "both simultaneous deposits are accepted",
    raceA.status === 200 && raceB.status === 200,
  );
  const raceRows = await bookings(ids.one);
  ok(
    "exactly one of them got the place",
    raceRows.filter((row) => row.status === "paid").length === 1,
    raceRows.map((row) => row.status).join(", "),
  );
  ok(
    "and the other is recorded as having lost the race, for refunding",
    raceRows.filter((row) => row.cancelledReason === "soldOut").length === 1,
  );
  ok(
    "the loser owes nothing further — no balance date, no link to pay one",
    raceRows
      .filter((row) => row.cancelledReason === "soldOut")
      .every(
        (row) => row.balanceDueAt === null && row.balanceTokenHash === null,
      ),
  );

  // ── a course taken off the site mid-checkout ──────────────────────────────
  const withdrawn = courseEvent({
    eventId: `evt_smoke_c_gone_${stamp}`,
    sessionId: `cs_smoke_c_gone_${stamp}`,
    courseId: MISSING_COURSE,
    places: 1,
    name: "The Run That Was Taken Down",
    amountPence: 8000,
  });
  ok(
    "a payment for a withdrawn course is accepted",
    (await postEvent(withdrawn)).status === 200,
  );
  await sleep(750);
  ok(
    "the row says the COURSE was gone, not the workshop",
    (await eventRow(withdrawn.id))?.outcome === "courseGone",
    String((await eventRow(withdrawn.id))?.outcome),
  );
  ok(
    "and the log reads as a course withdrawal",
    server.out().includes("COURSE WITHDRAWN"),
  );

  await browser.close();
} finally {
  await stopServer(server);
}

await cleanUp();
await db.end();
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

// ── helpers ──────────────────────────────────────────────────────────────────

/** "Saturday 6 September", as the app writes it, for the day N days out. */
function dayWords(offset) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(day(offset));
}

/** The most recent email the log shows going to one address, in full. */
function emailTo(log, address, which = -1) {
  const blocks = log
    .split("──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────")
    .slice(1)
    .filter((block) => block.includes(`To:       ${address}`));
  const block = which < 0 ? blocks.at(which) : blocks[which];
  return block ?? "";
}

/** A page's text on one line, for a failure message that fits in a terminal. */
function oneLine(text) {
  return text.replace(/\s+/g, " ").slice(0, 300);
}

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/**
 * A part-paid course booking put straight into the database, with the token we
 * keep. Used for the lapsed case, which the webhook cannot reach on a machine
 * with no real Stripe account — a balance due in the past cannot be created by
 * paying a deposit today.
 */
async function seedDepositBooking(courseId, tag, balanceDueOffset) {
  const payToken = randomBytes(32).toString("base64url");
  const cancelToken = randomBytes(32).toString("base64url");
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  const { rows } = await db.query(
    `INSERT INTO "Booking"
       ("courseId","buyerName","buyerEmail",places,"totalPence","balanceDueAt",
        status,"cancellationTokenHash","balanceTokenHash","paidAt","updatedAt")
     VALUES ($1,'Sarah Hall',$2,1,24000,$3,'paid',$4,$5,now(),now())
     RETURNING id`,
    [courseId, BUYER, day(balanceDueOffset), sha(cancelToken), sha(payToken)],
  );
  await db.query(
    `INSERT INTO "Payment"
       ("bookingId",kind,"amountPence",currency,"stripeSessionId",
        "stripePaymentIntentId","paidAt","updatedAt")
     VALUES ($1,'deposit',8000,'gbp',$2,$3,now(),now())`,
    [rows[0].id, `cs_smoke_seed_${tag}_${Date.now()}`, `pi_smoke_seed_${tag}`],
  );
  return { id: rows[0].id, payToken, cancelToken };
}

/** Only ever what this script made. The operator's own data is not touched. */
async function cleanUp() {
  // Payments cascade with their booking; bookings must go before the courses
  // they point at, because that relation is Restrict on purpose.
  await db.query(
    `DELETE FROM "Booking" WHERE "courseId" IN
       (SELECT id FROM "Course" WHERE slug LIKE 'smoke-course-%')`,
  );
  await db.query(`DELETE FROM "Course" WHERE slug LIKE 'smoke-course-%'`);
  await db.query(`DELETE FROM "StripeEvent" WHERE id LIKE 'evt_smoke_c_%'`);
  await db.query(
    `DELETE FROM "Booking" WHERE "cancellationTokenHash" LIKE 'hash_neither_%'`,
  );
}
