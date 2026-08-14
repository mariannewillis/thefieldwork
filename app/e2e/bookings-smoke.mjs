// =============================================================================
// Buying a place — the whole path, end to end
// =============================================================================
//
// One claim, exercised: a signature-verified webhook turns a payment into a
// place, and a link in an email gives it back. Everything else here is a thing
// that had to be true on the way — an unsigned payload refused, the same event
// delivered twice making one booking, two people paying for the last place at
// the same instant, the four states of the cancellation page, both emails
// saying what they should, and the panel refusing to offer a button when this
// server cannot take money.
//
// AND ONE MORE, ADDED AFTER IT WENT WRONG (D-20): an event is acted on exactly
// once WHATEVER it turned out to be. A withdrawn-workshop refund is not issued
// twice, its apology is not sent twice, and a replay arriving after the
// workshop has been created again does not turn a refunded payment into a
// booking.
//
// It is a sibling of auth-smoke.mjs and workshops-smoke.mjs, and it runs the
// same way — except that this one STARTS ITS OWN dev server, three times, with
// three different Stripe configurations, because half the claims are about what
// happens when a key is missing.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3100.
//   2. node e2e/bookings-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL MONEY AND NO REAL EMAIL. The servers it starts are given:
//
//   RESEND_API_KEY=""        — an empty value, which BEATS the one in
//                              .env.local (@next/env only fills variables that
//                              are undefined). The email module's log adapter
//                              runs, so every message is printed and none is
//                              delivered. This is checked, not assumed: the
//                              first thing the script asserts is that the
//                              server logged "not sent".
//   STRIPE_SECRET_KEY=sk_test_…  — a made-up key belonging to no account. Any
//                              call to Stripe gets a 401 and moves nothing.
//   every address ends .invalid — a reserved suffix that cannot be delivered to
//                              even if everything above failed at once.
//
// The Stripe events are synthetic and signed with a secret this script chose,
// using Stripe's own signing helper. Nothing here touches the operator's
// Stripe account.
//
// It creates workshops whose slugs begin `smoke-booking-` and deletes them,
// with their bookings, at the end. It touches nothing else.
// =============================================================================

import { spawn } from "node:child_process";
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
// What this server will call itself, and what it therefore stamps onto the
// checkouts it opens. The servers below are started with NEXT_PUBLIC_SITE_URL
// set to BASE, so this is the host the webhook will recognise as its own.
const HOST = `localhost:${PORT}`;
const OTHER_HOST = "smoke-preview.example.invalid";
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

/**
 * A COPY OF THE APP, somewhere else.
 *
 * Two reasons, and the second is the one that matters:
 *
 *  1. Next 16 refuses to start a second dev server for the same directory, and
 *     the operator's own is usually running on 3000. Nothing here may require
 *     stopping it.
 *  2. THE ENVIRONMENT IS BUILT FROM NOTHING. The copy has no `.env.local`, so
 *     the child inherits only the variables named below — which is why there is
 *     no way for the real RESEND_API_KEY to reach it, however this script is
 *     run. Blanking a variable would be a thing that could be got wrong; not
 *     copying the file cannot be.
 *
 * node_modules and public are junctions rather than copies: one is enormous and
 * the other is photographs, and neither is written to.
 */
async function makeCopy() {
  // INSIDE the app, not in the system temp dir: Turbopack refuses a
  // node_modules symlink that points outside the project root it infers, and
  // from a temp directory that root is the home folder. `.smoke-app/` is
  // gitignored and deleted at the end of the run.
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

/**
 * Starts `next dev` in the copy with a chosen configuration — the Stripe keys,
 * and sometimes the site's own address, because which deployment a server
 * believes it is decides which webhooks it will act on (D-19). Captures its
 * output, which is where the emails land: with no RESEND_API_KEY the email
 * module prints them instead of sending them.
 */
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
        // Everything the app needs, named one at a time. Nothing else crosses.
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
      const response = await fetch(`${BASE}/workshops`);
      if (response.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  if (Date.now() >= deadline) {
    throw new Error(`${label} never came up:
${log.join("")}`);
  }
  return { child, out: () => log.join("") };
}

async function stopServer(server) {
  // `next dev` forks a worker of its own, so killing only the process we
  // started leaves the port held and the next boot silently talks to the old
  // server. The whole tree goes.
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
      await fetch(`${BASE}/workshops`);
    } catch {
      return; // nothing answering: the port is free
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
 * `id` is given only for the resurrection case at the end of the run, where a
 * workshop has to appear at the exact id an already-refunded event names. An
 * explicit id does not advance the sequence, and the one used is far above
 * anything autoincrement will reach.
 */
async function makeWorkshop({
  id,
  slug,
  name,
  dayOffset,
  capacity,
  refundDays,
}) {
  const { rows } = await db.query(
    `INSERT INTO "Workshop"
       (slug, name, summary, "bodyHtml", date, "startTime", "endTime",
        "venueName", "addressLines", postcode, "gettingThere",
        capacity, "priceGBP", "refundDays", published, "updatedAt"${id ? ", id" : ""})
     VALUES ($1,$2,$3,$4,$5,'10:00','16:30','The Garden Room',
             'Fromefield\nFrome', 'BA11 2QN', 'Step-free from the pavement.',
             $6, 9500, $7, true, now()${id ? ", $8" : ""})
     RETURNING id`,
    [
      slug,
      name,
      "A day of learning to notice what you already notice.",
      "<p>Written for the smoke test.</p>",
      day(dayOffset),
      capacity,
      refundDays,
      ...(id ? [id] : []),
    ],
  );
  return rows[0].id;
}

// ── synthetic, signature-verified events ─────────────────────────────────────

/**
 * `site` is the deployment stamp the real checkout writes (D-19). It defaults
 * to this server's own host, so every claim made before the guard existed goes
 * on being made against a session the webhook owns. Pass another host for an
 * event belonging to a different deployment, or `null` for a session opened
 * before the stamp existed at all.
 */
function checkoutEvent({
  eventId,
  sessionId,
  workshopId,
  places,
  name,
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
        amount_total: 9500 * places,
        currency: "gbp",
        payment_status: "paid",
        payment_intent: `pi_${sessionId}`,
        customer_details: { email: BUYER, name: "Sarah Hall" },
        metadata: {
          workshopId: String(workshopId),
          places: String(places),
          workshopName: name,
          ...(site === null ? {} : { site }),
        },
      },
    },
  };
}

async function postEvent(event, { secret = WHSEC, signed = true } = {}) {
  const payload = JSON.stringify(event);
  const headers = { "content-type": "application/json" };
  if (signed) {
    headers["stripe-signature"] = signer.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
  }
  return fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers,
    body: payload,
  });
}

const bookings = (workshopId) =>
  db
    .query(`SELECT * FROM "Booking" WHERE "workshopId" = $1 ORDER BY id`, [
      workshopId,
    ])
    .then((r) => r.rows);

/** What the app recorded about one event, or null if it recorded nothing. */
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
ids.main = await makeWorkshop({
  slug: `smoke-booking-main-${stamp}`,
  name: "Reading the Field",
  dayOffset: 30,
  capacity: 3,
  refundDays: 14,
});
ids.late = await makeWorkshop({
  slug: `smoke-booking-late-${stamp}`,
  name: "The Late One",
  dayOffset: 3,
  capacity: 5,
  refundDays: 14,
});
ids.gone = await makeWorkshop({
  slug: `smoke-booking-gone-${stamp}`,
  name: "The One That Happened",
  dayOffset: -3,
  capacity: 5,
  refundDays: 14,
});
ids.race = await makeWorkshop({
  slug: `smoke-booking-race-${stamp}`,
  name: "The Last Place",
  dayOffset: 40,
  capacity: 1,
  refundDays: 14,
});
// For the deployment-stamp claims, kept apart from the workshops above so the
// email counts asserted there cannot be disturbed by these.
ids.stamped = await makeWorkshop({
  slug: `smoke-booking-stamped-${stamp}`,
  name: "Whose Event Is This",
  dayOffset: 50,
  capacity: 2,
  refundDays: 14,
});
// A workshop id belonging to nothing, for the genuinely-withdrawn case. High
// enough that the sequence will not reach it, low enough to be a Postgres int.
const MISSING_WORKSHOP = 2_000_000_000;

let server = await startServer(
  { STRIPE_SECRET_KEY: FAKE_KEY, STRIPE_WEBHOOK_SECRET: WHSEC },
  "configured server",
);

try {
  // ── the webhook refuses what it cannot verify ──────────────────────────────
  const unsigned = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_unsigned_${stamp}`,
      sessionId: `cs_smoke_unsigned_${stamp}`,
      workshopId: ids.main,
      places: 1,
      name: "Reading the Field",
    }),
    { signed: false },
  );
  ok(
    "an unsigned payload is refused",
    unsigned.status === 400,
    String(unsigned.status),
  );

  const wrongSecret = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_wrong_${stamp}`,
      sessionId: `cs_smoke_wrong_${stamp}`,
      workshopId: ids.main,
      places: 1,
      name: "Reading the Field",
    }),
    { secret: "whsec_a_different_secret_entirely" },
  );
  ok(
    "a payload signed with the wrong secret is refused",
    wrongSecret.status === 400,
    String(wrongSecret.status),
  );
  ok("and neither wrote anything", (await bookings(ids.main)).length === 0);

  // ── a verified event makes the booking ─────────────────────────────────────
  const first = checkoutEvent({
    eventId: `evt_smoke_first_${stamp}`,
    sessionId: `cs_smoke_first_${stamp}`,
    workshopId: ids.main,
    places: 2,
    name: "Reading the Field",
  });
  const made = await postEvent(first);
  ok("a verified event is accepted", made.status === 200, String(made.status));

  let rows = await bookings(ids.main);
  ok("one paid booking exists", rows.length === 1 && rows[0].status === "paid");
  ok(
    "for the places and the amount Stripe reported",
    rows[0].places === 2 && rows[0].amountPence === 19000,
    `${rows[0]?.places} places, ${rows[0]?.amountPence}p`,
  );
  ok(
    "with the buyer Stripe collected, and a payment intent to refund against",
    rows[0].buyerEmail === BUYER &&
      rows[0].buyerName === "Sarah Hall" &&
      rows[0].stripePaymentIntentId === `pi_${first.data.object.id}`,
  );
  ok(
    "and only the HASH of the cancellation token",
    /^[0-9a-f]{64}$/.test(rows[0].cancellationTokenHash),
  );

  // ── the same event again ───────────────────────────────────────────────────
  const again = await postEvent(first);
  ok("a redelivered event is accepted", again.status === 200);
  ok(
    "and does not make a second booking",
    (await bookings(ids.main)).length === 1,
  );
  ok(
    "and is answered as the replay it is",
    (await again.json()).replay === true,
  );
  ok(
    "the event is on the record, saying it became a place",
    (await eventRow(first.id))?.outcome === "booked",
    String((await eventRow(first.id))?.outcome),
  );

  // ── the emails ─────────────────────────────────────────────────────────────
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
    log.split("[bookings] confirmation →").length - 1 === 1 &&
      log.split("[bookings] booking notice →").length - 1 === 1,
  );

  const confirmation = emailTo(log, BUYER);
  ok(
    "the confirmation names the day, the time, the venue and the address",
    confirmation.includes("10:00–16:30") &&
      confirmation.includes("The Garden Room") &&
      confirmation.includes("Fromefield") &&
      confirmation.includes("BA11 2QN"),
    confirmation.slice(0, 200),
  );
  ok(
    "and what was bought and paid",
    confirmation.includes("2 places") && confirmation.includes("£190"),
  );

  // The link, and the token in it. This is also how the rest of the script
  // gets the token — it never comes out of the database, because the database
  // does not have it.
  const link = /http:\/\/localhost:3100\/cancel\/([A-Za-z0-9_-]{20,})/.exec(
    confirmation,
  );
  ok("and carries the cancellation link with its token", Boolean(link));
  const token = link?.[1];

  const deadline = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(day(30 - 14));
  ok(
    `and the refund deadline as a real date, from this workshop's own refundDays (${deadline})`,
    confirmation.includes(`Cancel by ${deadline}`),
  );

  const notice = emailTo(log, OWNER);
  ok(
    "Marianne is told who, how many, which day and what is left",
    notice.includes("Sarah Hall") &&
      notice.includes("2 places") &&
      notice.includes("Reading the Field") &&
      notice.includes("1 of 3 places left"),
    notice.slice(0, 240),
  );

  // ── capacity is enforced ───────────────────────────────────────────────────
  const overshoot = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_over_${stamp}`,
      sessionId: `cs_smoke_over_${stamp}`,
      workshopId: ids.main,
      places: 2,
      name: "Reading the Field",
    }),
  );
  ok(
    "a payment for more places than are left is accepted",
    overshoot.status === 200,
  );
  rows = await bookings(ids.main);
  const oversold = rows.find((r) => r.stripeSessionId.includes("over"));
  ok(
    "but the booking is written cancelled, not paid",
    oversold?.status === "cancelledUnrefunded" &&
      oversold?.cancelledReason === "soldOut",
    `${oversold?.status} / ${oversold?.cancelledReason}`,
  );
  ok(
    "so the places sold never exceed the capacity",
    rows.filter((r) => r.status === "paid").reduce((n, r) => n + r.places, 0) <=
      3,
  );
  const soldOutLog = server.out();
  ok(
    "the buyer is told and the money is chased",
    soldOutLog.includes(`[bookings] sold-out refund → ${BUYER}`) &&
      soldOutLog.includes(`[bookings] sold-out notice → ${OWNER}`),
  );
  ok(
    "and because this refund could not go through, nothing claims it did",
    emailTo(soldOutLog, BUYER, -1).includes("is owed back to you") &&
      emailTo(soldOutLog, OWNER, -1).includes("REFUND DID NOT GO THROUGH"),
  );

  // ── two people, one place, at the same instant ─────────────────────────────
  const [raceA, raceB] = await Promise.all([
    postEvent(
      checkoutEvent({
        eventId: `evt_smoke_raceA_${stamp}`,
        sessionId: `cs_smoke_raceA_${stamp}`,
        workshopId: ids.race,
        places: 1,
        name: "The Last Place",
      }),
    ),
    postEvent(
      checkoutEvent({
        eventId: `evt_smoke_raceB_${stamp}`,
        sessionId: `cs_smoke_raceB_${stamp}`,
        workshopId: ids.race,
        places: 1,
        name: "The Last Place",
      }),
    ),
  ]);
  ok(
    "both simultaneous payments are accepted",
    raceA.status === 200 && raceB.status === 200,
  );
  const raceRows = await bookings(ids.race);
  ok(
    "exactly one of them got the place",
    raceRows.filter((r) => r.status === "paid").length === 1,
    raceRows.map((r) => r.status).join(", "),
  );
  ok(
    "and the other is recorded as having lost the race, for refunding",
    raceRows.filter((r) => r.cancelledReason === "soldOut").length === 1,
  );

  // ── the cancellation page ──────────────────────────────────────────────────
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  // STATE 4 · a token that means nothing
  await page.goto(`${BASE}/cancel/${"x".repeat(43)}`);
  ok(
    "an unknown token gets the dead-link page",
    (await page.getByText("This link has expired").count()) === 1,
  );
  ok(
    "which reveals nothing about whether a booking exists",
    (await page.getByText("Reading the Field").count()) === 0,
  );

  // STATE 4 · a real token for a day that has been and gone
  const goneBooking = await seedBooking(ids.gone, "gone");
  await page.goto(`${BASE}/cancel/${goneBooking.token}`);
  ok(
    "a link for a workshop that has already happened says the same thing",
    (await page.getByText("This link has expired").count()) === 1,
  );

  // STATE 3 · already cancelled, and refunded
  const refundedBooking = await seedBooking(ids.main, "refunded", {
    status: "cancelledRefunded",
    refundId: "re_smoke_pretend",
    refundedPence: 9500,
  });
  await page.goto(`${BASE}/cancel/${refundedBooking.token}`);
  ok(
    "a cancelled-and-refunded booking reads as reassurance, not an error",
    (await page.getByText("This one is already cancelled").count()) === 1 &&
      (await page.getByText("was refunded on").count()) === 1,
  );
  ok(
    "and says how much went back",
    (await page.locator("body").innerText()).includes("£95"),
  );

  // STATE 2 · past the refund date
  const latePaid = await seedBooking(ids.late, "late");
  await page.goto(`${BASE}/cancel/${latePaid.token}`);
  const lateText = await page.locator("body").innerText();
  ok(
    "past the refund date, the page says so before it offers the button",
    lateText.includes("which has passed") &&
      lateText.includes("not return your"),
  );
  ok(
    "and the button is there, subordinate rather than hidden",
    (await page
      .getByRole("button", { name: "Cancel anyway, without a refund" })
      .count()) === 1,
  );
  await page
    .getByRole("button", { name: "Cancel anyway, without a refund" })
    .click();
  await page.waitForTimeout(2500);
  const lateRow = (await bookings(ids.late)).find((r) => r.id === latePaid.id);
  ok(
    "cancelling past the date releases the place and refunds nothing",
    lateRow.status === "cancelledUnrefunded" &&
      lateRow.cancelledReason === "buyer" &&
      lateRow.refundId === null,
    `${lateRow?.status} / ${lateRow?.refundId}`,
  );
  const lateLog = server.out();
  ok(
    "and both people are told",
    lateLog.includes(`[bookings] cancellation → ${BUYER}`) &&
      lateLog.includes(`[bookings] cancellation notice → ${OWNER}`),
  );
  ok(
    "the buyer's email does not pretend money is coming back",
    emailTo(lateLog, BUYER, -1).includes("which has passed, so nothing has"),
  );

  // STATE 1 · inside the window, and pressing it twice
  const inWindow = await seedBooking(ids.main, "inwindow");
  const pageA = await (await browser.newContext()).newPage();
  const pageB = await (await browser.newContext()).newPage();
  await pageA.goto(`${BASE}/cancel/${inWindow.token}`);
  await pageB.goto(`${BASE}/cancel/${inWindow.token}`);
  const state1 = await pageA.locator("body").innerText();
  ok(
    "inside the window, the money is stated in full before the button",
    state1.includes("will go back to the card you paid with") &&
      state1.includes("£95"),
  );
  ok(
    "and the button says what it will do",
    (await pageA.getByRole("button", { name: /refund £95/ }).count()) === 1,
  );

  const before = countOf(server.out(), "[bookings] cancellation →");
  await pageA.getByRole("button", { name: /refund £95/ }).click();
  await pageA.waitForTimeout(2500);
  // The second browser is still showing state 1 and knows nothing about the
  // first. This is the double-click, from two devices, by somebody upset.
  await pageB.getByRole("button", { name: /refund £95/ }).click();
  await pageB.waitForTimeout(2500);

  const twice = (await bookings(ids.main)).find((r) => r.id === inWindow.id);
  ok(
    "cancelling twice leaves one cancellation",
    twice.status !== "paid" && twice.cancelledAt !== null,
    twice?.status,
  );
  ok(
    "and sends one pair of emails, not two",
    countOf(server.out(), "[bookings] cancellation →") === before + 1,
    `${countOf(server.out(), "[bookings] cancellation →")} vs ${before + 1}`,
  );
  await pageB.reload();
  ok(
    "and the second person sees the already-cancelled page, not an error",
    (await pageB.getByText("This one is already cancelled").count()) === 1,
  );

  // ── places left, on the public pages ───────────────────────────────────────
  await page.goto(`${BASE}/workshops/smoke-booking-race-${stamp}`);
  const fullPage = await page.locator("body").innerText();
  ok(
    "a workshop with no places left says it is full",
    fullPage.includes("This one is full") &&
      fullPage.includes("0 places left of 1"),
  );
  ok(
    "and offers no way to buy one",
    (await page.getByRole("button", { name: /^Book / }).count()) === 0,
  );

  await page.goto(`${BASE}/workshops/smoke-booking-main-${stamp}`);
  const mainPage = await page.locator("body").innerText();
  ok(
    "a workshop with places left counts them from the bookings",
    mainPage.includes("left of 3"),
    mainPage.split("\n").find((l) => l.includes("left of")) ?? "",
  );
  ok(
    "and offers the button, because this server can take money",
    (await page.getByRole("button", { name: /^Book / }).count()) === 1,
  );

  await browser.close();

  // ── whose event is this (D-19) ─────────────────────────────────────────────
  //
  // The failure being guarded against: a place bought on the Replit preview,
  // whose completed session Stripe delivers to the LIVE endpoint too. The live
  // database has never held that workshop, so the webhook read it as a workshop
  // withdrawn mid-checkout and did what that path is for — refunded the payment
  // and emailed the buyer to say the day was no longer running. Twice, to a
  // real buyer, on 2026-08-14.
  //
  // Last in the run on purpose: everything above counts emails, and these send
  // some of their own.

  const stamped = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_mine_${stamp}`,
      sessionId: `cs_smoke_mine_${stamp}`,
      workshopId: ids.stamped,
      places: 1,
      name: "Whose Event Is This",
    }),
  );
  ok(
    "a session stamped with this site's own host books as it always did",
    stamped.status === 200 &&
      (await bookings(ids.stamped)).filter((r) => r.status === "paid")
        .length === 1,
    String(stamped.status),
  );

  await sleep(750);
  const beforeForeign = server.out();
  const emailsBefore = countOf(beforeForeign, "EMAIL (not sent");

  const foreign = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_foreign_${stamp}`,
      sessionId: `cs_smoke_foreign_${stamp}`,
      workshopId: ids.stamped,
      places: 1,
      name: "Whose Event Is This",
      site: OTHER_HOST,
    }),
  );
  ok(
    "an event from another deployment is answered 200, not retried forever",
    foreign.status === 200,
    String(foreign.status),
  );
  ok(
    "and Stripe is told plainly that nothing was done with it",
    (await foreign.json()).acted === false,
  );

  // The same event again. Nothing was written for the first one, so its id
  // never reached StripeEvent and this really is a second pass through the
  // guard rather than the idempotency check answering.
  const foreignAgain = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_foreign_${stamp}`,
      sessionId: `cs_smoke_foreign_${stamp}`,
      workshopId: ids.stamped,
      places: 1,
      name: "Whose Event Is This",
      site: OTHER_HOST,
    }),
  );
  ok("delivered twice, it is still accepted", foreignAgain.status === 200);

  await sleep(750);
  const afterForeign = server.out();
  ok(
    "no booking was written for either delivery",
    (await bookings(ids.stamped)).length === 1,
    String((await bookings(ids.stamped)).length),
  );
  ok(
    "nobody was emailed — not the buyer, not Marianne",
    countOf(afterForeign, "EMAIL (not sent") === emailsBefore,
    `${countOf(afterForeign, "EMAIL (not sent")} vs ${emailsBefore}`,
  );
  ok(
    "and no refund was attempted, because that path was never reached",
    countOf(afterForeign, "[bookings] withdrawn-workshop refund") === 0,
  );
  ok(
    "nothing at all was recorded — not even that the event arrived",
    (await eventRow(`evt_smoke_foreign_${stamp}`)) === null,
  );
  ok(
    "the log says whose event it was and that it was left alone",
    afterForeign.includes("NOT THIS SITE'S EVENT") &&
      afterForeign.includes(OTHER_HOST) &&
      afterForeign.includes("no booking, no refund, no email"),
  );

  // ── a session from before the stamp existed ────────────────────────────────
  //
  // Treated as this site's. Calling it foreign would take a real buyer's money
  // and write nothing at all, which is worse than the bug being fixed.
  const unstamped = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_unstamped_${stamp}`,
      sessionId: `cs_smoke_unstamped_${stamp}`,
      workshopId: ids.stamped,
      places: 1,
      name: "Whose Event Is This",
      site: null,
    }),
  );
  ok("a session carrying no stamp is accepted", unstamped.status === 200);
  ok(
    "and books normally, rather than being swallowed",
    (await bookings(ids.stamped)).filter((r) => r.status === "paid").length ===
      2,
  );
  await sleep(750);
  ok(
    "the log notes that it predates the guard",
    server.out().includes("predates the guard"),
  );

  // ── a workshop that has genuinely been withdrawn ───────────────────────────
  //
  // This site's own session, for a workshop this site no longer has. The path
  // the outage abused is still exactly here, and still refunds and apologises.
  // The event is kept, because everything after this asks what happens when it
  // arrives a second and a third time.
  const withdrawnEvent = checkoutEvent({
    eventId: `evt_smoke_gonewk_${stamp}`,
    sessionId: `cs_smoke_gonewk_${stamp}`,
    workshopId: MISSING_WORKSHOP,
    places: 1,
    name: "The Day That Was Taken Down",
  });
  const withdrawn = await postEvent(withdrawnEvent);
  ok(
    "a payment for a withdrawn workshop is accepted",
    withdrawn.status === 200,
  );
  await sleep(750);
  const withdrawnLog = server.out();
  ok(
    "the refund is chased and the buyer is written to",
    countOf(withdrawnLog, "[bookings] withdrawn-workshop refund") === 1 &&
      withdrawnLog.includes(
        `[bookings] withdrawn-workshop refund → ${BUYER}`,
      ) &&
      withdrawnLog.includes(`[bookings] withdrawn-workshop notice → ${OWNER}`),
  );
  ok(
    "the email says the day is no longer running",
    emailTo(withdrawnLog, BUYER, -1).includes("no longer running"),
    emailTo(withdrawnLog, BUYER, -1).slice(0, 200),
  );
  ok(
    "and the log reads as a withdrawal, not as somebody else's event",
    withdrawnLog.includes("WORKSHOP WITHDRAWN") &&
      withdrawnLog.includes(`opened by this site (${HOST})`),
  );
  ok(
    "the boot log names the stamp this server writes onto its checkouts",
    withdrawnLog.includes(`stamped site=${HOST}`),
  );
  ok(
    "and says nothing about crossed keys, because test keys off the live domain are right",
    !withdrawnLog.includes("LIVE KEYS ON") &&
      !withdrawnLog.includes("TEST KEYS ON THE LIVE SITE"),
  );
  // No Booking was written on this path, so the event row is the only record
  // there is of a payment having been taken and sent back.
  ok(
    "the withdrawal is on the record, and the row says what was done",
    (await eventRow(withdrawnEvent.id))?.outcome === "workshopGone",
    String((await eventRow(withdrawnEvent.id))?.outcome),
  );

  // ── the same withdrawal, delivered again (D-20) ────────────────────────────
  //
  // What actually happened: deliveries had been 404ing for days on a routing
  // fault, and when it was fixed the whole backlog arrived at once. The refund
  // survives being repeated — its idempotency key is the session — but an
  // apology does not, and a real buyer was told twice that her day was off.
  const replayed = await postEvent(withdrawnEvent);
  ok("a redelivered withdrawal is accepted", replayed.status === 200);
  ok(
    "and is answered as the replay it is",
    (await replayed.json()).replay === true,
  );
  await sleep(750);
  const replayLog = server.out();
  ok(
    "no second refund is attempted",
    countOf(replayLog, "WORKSHOP WITHDRAWN") === 1,
    String(countOf(replayLog, "WORKSHOP WITHDRAWN")),
  );
  ok(
    "and nobody is apologised to twice",
    countOf(replayLog, "[bookings] withdrawn-workshop refund") === 1 &&
      countOf(replayLog, "[bookings] withdrawn-workshop notice") === 1,
    `${countOf(replayLog, "[bookings] withdrawn-workshop refund")} refund, ${countOf(replayLog, "[bookings] withdrawn-workshop notice")} notice`,
  );
  ok(
    "the log says it has seen this event before, in words of its own",
    countOf(replayLog, `ALREADY SEEN — event ${withdrawnEvent.id}`) === 1,
  );

  // ── and again, once a workshop exists at that id once more (D-20) ──────────
  //
  // THE ONE THAT WOULD HAVE BITTEN. After the refunds went out, a workshop of
  // the same name was created again. A replay of one of those events now finds
  // a workshop where there was none, and without the event id on the record
  // nothing would stop it booking a place and confirming a payment that was
  // sent back days earlier.
  await makeWorkshop({
    id: MISSING_WORKSHOP,
    slug: `smoke-booking-again-${stamp}`,
    name: "The Day That Was Taken Down",
    dayOffset: 60,
    capacity: 5,
    refundDays: 14,
  });
  const confirmationsBefore = countOf(
    server.out(),
    "[bookings] confirmation →",
  );
  const resurrected = await postEvent(withdrawnEvent);
  ok(
    "the replay is still accepted, and still does nothing",
    resurrected.status === 200 && (await resurrected.json()).acted === false,
    String(resurrected.status),
  );
  await sleep(750);
  ok(
    "no booking is made against the workshop that came back",
    (await bookings(MISSING_WORKSHOP)).length === 0,
    String((await bookings(MISSING_WORKSHOP)).length),
  );
  ok(
    "and no confirmation is sent for a payment that was refunded",
    countOf(server.out(), "[bookings] confirmation →") === confirmationsBefore,
  );
  ok(
    "the row still reads as the refund it was, not as a booking",
    (await eventRow(withdrawnEvent.id))?.outcome === "workshopGone",
    String((await eventRow(withdrawnEvent.id))?.outcome),
  );
} finally {
  await stopServer(server);
}

// ── the half-configured server: a key that can charge, and nothing to confirm ─
server = await startServer(
  { STRIPE_SECRET_KEY: FAKE_KEY },
  "half-configured server",
);
try {
  const response = await fetch(`${BASE}/workshops/smoke-booking-main-${stamp}`);
  const html = await response.text();
  ok("with no webhook secret the page still renders", response.status === 200);
  ok(
    "and buying is NOT offered, because a payment could not be confirmed",
    html.includes("You cannot book this online yet.") &&
      !html.includes(">Book "),
  );
  ok(
    "and the log says which half is missing",
    server
      .out()
      .includes("STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not"),
  );
  const hook = await postEvent(
    checkoutEvent({
      eventId: `evt_smoke_half_${stamp}`,
      sessionId: `cs_smoke_half_${stamp}`,
      workshopId: ids.main,
      places: 1,
      name: "Reading the Field",
    }),
  );
  ok(
    "a webhook arriving at a half-configured server is refused, not swallowed",
    hook.status === 503,
    String(hook.status),
  );
} finally {
  await stopServer(server);
}

// ── no keys at all: the operator's own machine ───────────────────────────────
server = await startServer({}, "unconfigured server");
try {
  const response = await fetch(`${BASE}/workshops/smoke-booking-main-${stamp}`);
  const html = await response.text();
  ok(
    "with no Stripe keys at all the page still renders",
    response.status === 200,
  );
  ok(
    "nothing throws, and the panel keeps its honest words",
    html.includes("You cannot book this online yet."),
  );
  ok(
    "the index renders too, with real counts",
    (await (await fetch(`${BASE}/workshops`)).text()).includes("places left"),
  );
  ok(
    "and the log says so plainly rather than blaming the integration",
    server.out().includes("no keys set — buying is not offered"),
  );
} finally {
  await stopServer(server);
}

// ── keys that do not belong to the site they are on ──────────────────────────
//
// The real fix for D-19 is configuration — test keys on every preview, live
// keys only on the live domain — and nothing in the app can arrange that. So it
// notices instead. Here that is a server calling itself the live site while
// holding test keys, which is the harmless half of the pair; the dangerous half
// is the same comparison with the other answer, and testing it would mean
// writing an sk_live_ string into this file.
server = await startServer(
  {
    STRIPE_SECRET_KEY: FAKE_KEY,
    STRIPE_WEBHOOK_SECRET: WHSEC,
    NEXT_PUBLIC_SITE_URL: "https://thefieldwork.co.uk",
  },
  "live-domain server with test keys",
);
try {
  await fetch(`${BASE}/workshops/smoke-booking-main-${stamp}`);
  await sleep(750);
  ok(
    "a server calling itself the live site with test keys says so, once",
    countOf(server.out(), "TEST KEYS ON THE LIVE SITE") === 1,
    String(countOf(server.out(), "TEST KEYS ON THE LIVE SITE")),
  );
  ok(
    "and it is a warning, not a refusal — the page still serves",
    (await fetch(`${BASE}/workshops`)).status === 200,
  );
} finally {
  await stopServer(server);
}

await cleanUp();
await db.end();
// Windows holds the directory open for a moment after the server dies, and a
// first attempt reliably fails with EBUSY. Try for a few seconds, then leave it
// — it is gitignored, and the next run deletes it before copying.
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

/** The most recent email the log shows going to one address, in full. */
function emailTo(log, address, which = -1) {
  const blocks = log
    .split("──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────")
    .slice(1)
    .filter((block) => block.includes(`To:       ${address}`));
  const block = which < 0 ? blocks.at(which) : blocks[which];
  return block ?? "";
}

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/**
 * A booking put straight into the database, with a token we keep.
 *
 * Used for the states the webhook cannot reach on a machine with no real
 * Stripe account — a booking that was successfully refunded, and one for a day
 * that has already happened.
 */
async function seedBooking(workshopId, tag, extra = {}) {
  const { randomBytes, createHash } = await import("node:crypto");
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const { rows } = await db.query(
    `INSERT INTO "Booking"
       ("workshopId","buyerName","buyerEmail",places,"amountPence",currency,
        "stripeSessionId","stripePaymentIntentId",status,"cancellationTokenHash",
        "paidAt","cancelledAt","cancelledReason","refundId","refundedPence",
        "refundedAt","updatedAt")
     VALUES ($1,'Sarah Hall',$2,1,9500,'gbp',$3,$4,$5,$6,now(),$7,$8,$9,$10,$11,now())
     RETURNING id`,
    [
      workshopId,
      BUYER,
      `cs_smoke_seed_${tag}_${Date.now()}`,
      `pi_smoke_seed_${tag}`,
      extra.status ?? "paid",
      hash,
      extra.status && extra.status !== "paid" ? new Date() : null,
      extra.status && extra.status !== "paid" ? "buyer" : null,
      extra.refundId ?? null,
      extra.refundedPence ?? null,
      extra.refundId ? new Date() : null,
    ],
  );
  return { id: rows[0].id, token };
}

/** Only ever what this script made. The operator's own data is not touched. */
async function cleanUp() {
  await db.query(
    `DELETE FROM "Booking" WHERE "workshopId" IN
       (SELECT id FROM "Workshop" WHERE slug LIKE 'smoke-booking-%')`,
  );
  await db.query(`DELETE FROM "Workshop" WHERE slug LIKE 'smoke-booking-%'`);
  await db.query(`DELETE FROM "StripeEvent" WHERE id LIKE 'evt_smoke_%'`);
}
