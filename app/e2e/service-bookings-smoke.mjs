// =============================================================================
// Approving a session — the link to pay, the payment, and the approval that runs out
// =============================================================================
//
// One claim, exercised: a session is ASKED FOR by a visitor, APPROVED by
// Marianne at a figure she chooses, PAID FOR through a link on our own site,
// and — when nobody pays — released by arithmetic, with nothing running.
//
// Everything else here is a thing that had to be true on the way: one Booking
// and one Payment per completed session, the same event delivered twice making
// one of each, a SECOND payment for the same session refunded rather than
// silently kept, a decline closing the request with her own words, a stale page
// failing to approve twice, and the operator's own data — Booking 25, requests
// 3 and 4, the workshops, the course — coming out exactly as it went in.
//
// It is a sibling of course-bookings-smoke.mjs and runs the same way, on the
// same harness, with the same three guarantees below.
//
// HOW TO RUN
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3102.
//   2. node e2e/service-bookings-smoke.mjs
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
//   EMAIL_TO_OWNER=owner@example.invalid — so not one message in this run is
//                              even ADDRESSED to marianne@thefieldwork.co.uk.
//                              Asserted below, over the whole server log.
//   every address ends .invalid — a reserved suffix that cannot be delivered to
//                              even if everything above failed at once.
//
// The Stripe events are synthetic and signed with a secret this script chose,
// using Stripe's own signing helper. Nothing here touches the operator's
// Stripe account.
//
// It creates services whose slugs begin `smoke-session-` and its own throwaway
// admin account, and deletes both — with their requests, bookings and payments
// — at the end. It touches nothing else, and it READS the operator's own data
// without writing to it.
// =============================================================================

import { spawn } from "node:child_process";
import { createHash, randomBytes, scrypt as scryptCb } from "node:crypto";
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

const PORT = 3102;
const BASE = `http://localhost:${PORT}`;
const HOST = `localhost:${PORT}`;
const WHSEC = "whsec_smoke_session_only_not_a_real_secret";
const FAKE_KEY = "sk_test_smoke_session_not_a_real_key_000";
const OWNER = "owner@example.invalid";
const CLIENT = "client@example.invalid";
const USER = "smoke-session@example.invalid";
const PASS = "smoke-session-password-not-real";
/** The address this run must never write to. Checked over the whole log. */
const HERS = "marianne@thefieldwork.co.uk";

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
// A COPY OF THE APP, somewhere else — the same arrangement the other smoke
// tests use, and for the same two reasons: Next refuses a second dev server for
// one directory, and the copy has no .env.local, so the child inherits only the
// variables named below. There is no way for the real RESEND_API_KEY to reach
// it however this script is run.

async function makeCopy() {
  const root = resolve(".smoke-app-session");
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
        AUTH_SECRET: process.env.AUTH_SECRET ?? "smoke-session-secret-not-real",
        NEXT_PUBLIC_SITE_URL: BASE,
        EMAIL_TO_OWNER: OWNER,
        RESEND_API_KEY: "",
        STRIPE_SECRET_KEY: FAKE_KEY,
        STRIPE_WEBHOOK_SECRET: WHSEC,
        // Signing in calls ensureSeeded(), which creates the accounts that
        // should exist. Left unset it falls back to its own defaults and this
        // script would quietly seed a second admin into the operator's
        // database. Empty means "do not create it".
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

// ── fixtures ─────────────────────────────────────────────────────────────────

async function makeService({ slug, name, pricePence, minutes }) {
  const { rows } = await db.query(
    `INSERT INTO "Service"
       (slug, name, summary, "bodyHtml", "durationMinutes", location,
        "venueName", "addressLines", postcode, "gettingThere",
        "priceGBP", published, "heroImage", "heroAlt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,'venue','The Garden Room','Fromefield\nFrome',
             'BA11 2QN','Step-free from the pavement.',$6,true,
             'work-wide-the-room','The room, empty.', now())
     RETURNING id`,
    [
      slug,
      name,
      "An hour, one to one, for the smoke test.",
      "<p>Written for the smoke test.</p>",
      minutes,
      pricePence,
    ],
  );
  return rows[0].id;
}

async function makeRequest({ serviceId, name, preferredTime, message }) {
  const { rows } = await db.query(
    `INSERT INTO "ServiceRequest"
       ("serviceId", name, email, phone, "preferredTime", message, status, "updatedAt")
     VALUES ($1,$2,$3,'07700 900000',$4,$5,'pending', now())
     RETURNING id`,
    [serviceId, name, CLIENT, preferredTime, message ?? null],
  );
  return rows[0].id;
}

// ── synthetic, signature-verified events ─────────────────────────────────────

function sessionEvent({
  eventId,
  sessionId,
  requestId,
  amountPence,
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
        amount_total: amountPence,
        currency: "gbp",
        payment_status: "paid",
        payment_intent: `pi_${sessionId}`,
        customer_details: { email: CLIENT, name: "Ruth Bailey" },
        metadata: {
          serviceRequestFor: String(requestId),
          offeringName: name,
          ...(site === null ? {} : { site }),
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

// ── reading back ─────────────────────────────────────────────────────────────

const requestRow = (id) =>
  db
    .query(`SELECT * FROM "ServiceRequest" WHERE id = $1`, [id])
    .then((r) => r.rows[0] ?? null);

const bookingsFor = async (requestId) => {
  const { rows } = await db.query(
    `SELECT * FROM "Booking" WHERE "serviceRequestId" = $1 ORDER BY id`,
    [requestId],
  );
  const { rows: paid } = await db.query(
    `SELECT * FROM "Payment" WHERE "bookingId" = ANY($1::int[]) ORDER BY id`,
    [rows.map((row) => row.id)],
  );
  return rows.map((row) => ({
    ...row,
    payments: paid.filter((one) => one.bookingId === row.id),
  }));
};

const serviceSlug = () =>
  db
    .query(`SELECT slug FROM "Service" WHERE id = $1`, [serviceId])
    .then((r) => r.rows[0].slug);

const eventRow = (id) =>
  db
    .query(`SELECT * FROM "StripeEvent" WHERE id = $1`, [id])
    .then((r) => r.rows[0] ?? null);

/** The last email in the log addressed to somebody. */
function emailTo(log, address, which = -1) {
  const blocks = log
    .split("──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────")
    .slice(1)
    .filter((block) => block.includes(`To:       ${address}`));
  const block = which < 0 ? blocks.at(which) : blocks[which];
  return block ?? "";
}

/** The /pay link out of an email block. */
function payLinkIn(block) {
  const found = block.match(new RegExp(`${BASE}/pay/[A-Za-z0-9_-]+`));
  return found ? found[0] : null;
}

function oneLine(text) {
  return text.replace(/\s+/g, " ").slice(0, 300);
}

// ── driving the queue ────────────────────────────────────────────────────────

async function signIn(page) {
  await page.goto(`${BASE}/admin/bookings`);
  const gate = new URL(page.url()).pathname === "/admin/login";
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"));
  return gate;
}

// ── the run ──────────────────────────────────────────────────────────────────

/** Only ever what this script made. The operator's own data is not touched. */
async function cleanUp() {
  await db.query(
    `DELETE FROM "Booking" WHERE "serviceId" IN
       (SELECT id FROM "Service" WHERE slug LIKE 'smoke-session-%')`,
  );
  await db.query(
    `DELETE FROM "ServiceRequest" WHERE "serviceId" IN
       (SELECT id FROM "Service" WHERE slug LIKE 'smoke-session-%')`,
  );
  await db.query(`DELETE FROM "Service" WHERE slug LIKE 'smoke-session-%'`);
  await db.query(`DELETE FROM "StripeEvent" WHERE id LIKE 'evt_smoke_s_%'`);
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
}

COPY = await makeCopy();
await db.connect();
await cleanUp();

const stamp = Date.now();

// The account this signs in as. Its own, throwaway, and hashed by the same
// scheme the app uses, so nothing about Marianne's is read or written.
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

const serviceId = await makeService({
  slug: `smoke-session-hour-${stamp}`,
  name: "An Hour Of Attention",
  pricePence: 7000,
  minutes: 60,
});

const asked = {
  paid: await makeRequest({
    serviceId,
    name: "Ruth Bailey",
    preferredTime: "Weekday mornings, ideally not Tuesdays",
    message: "I would rather come to you if that is possible.",
  }),
  declined: await makeRequest({
    serviceId,
    name: "Peter Nash",
    preferredTime: "Any Saturday",
  }),
  lapsing: await makeRequest({
    serviceId,
    name: "Anna Frost",
    preferredTime: "Thursday evenings",
  }),
  stale: await makeRequest({
    serviceId,
    name: "Colin Webb",
    preferredTime: "Monday or Tuesday, early",
  }),
};

const server = await startServer();

try {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  // A dev server compiles each route the first time it is asked for, and some
  // of these are asked for exactly once. Thirty seconds is a compile, not a
  // hang; three minutes is a hang.
  page.setDefaultNavigationTimeout(180_000);
  page.setDefaultTimeout(60_000);

  // ── the operator's own data, before anything else happens ─────────────────
  //
  // FIRST, and read-only. Booking 25 is a real place on a real workshop; the
  // two pending requests are his, and he is using them.
  const { rows: b25 } = await db.query(
    `SELECT b.id, b."totalPence", b.status, b."workshopId", b."courseId",
            b."serviceId", b."serviceRequestId", p.kind, p."amountPence"
     FROM "Booking" b LEFT JOIN "Payment" p ON p."bookingId" = b.id
     WHERE b.id = 25`,
  );
  ok(
    "Booking 25 is still one booking and one `full` payment on its workshop",
    b25.length === 1 &&
      b25[0].workshopId === 16 &&
      b25[0].courseId === null &&
      b25[0].serviceId === null &&
      b25[0].serviceRequestId === null &&
      b25[0].status === "paid" &&
      b25[0].kind === "full" &&
      b25[0].amountPence === b25[0].totalPence,
    JSON.stringify(b25),
  );

  const { rows: his } = await db.query(
    `SELECT id, status, "approvedAt", "approvedPence", "payTokenHash", "payBy",
            "agreedTime", "declinedAt"
     FROM "ServiceRequest" WHERE id IN (3,4) ORDER BY id`,
  );
  ok(
    "the operator's two pending requests are untouched and unanswered",
    his.length === 2 &&
      his.every(
        (r) =>
          r.status === "pending" &&
          r.approvedAt === null &&
          r.approvedPence === null &&
          r.payTokenHash === null &&
          r.payBy === null &&
          r.agreedTime === null &&
          r.declinedAt === null,
      ),
    JSON.stringify(his),
  );

  const { rows: credential } = await db.query(
    `SELECT "credentialVersion" FROM "AdminUser" WHERE username = $1`,
    [HERS],
  );
  ok(
    "her credential has not been touched",
    credential.length === 1 && credential[0].credentialVersion === 3,
    JSON.stringify(credential),
  );

  const { rows: course } = await db.query(
    `SELECT slug, "depositGBP", "balanceDueAt" FROM "Course" WHERE slug = 'ifr-course'`,
  );
  ok(
    "ifr-course still carries its deposit and its balance date",
    course.length === 1 && course[0].depositGBP !== null,
    JSON.stringify(course),
  );

  // ── the database refuses what the constraints exist to refuse ─────────────
  let refusedBoth = false;
  try {
    await db.query(
      `INSERT INTO "Booking"
         ("workshopId","serviceId","serviceRequestId","buyerName","buyerEmail",
          places,"totalPence",status,"cancellationTokenHash","paidAt","updatedAt")
       VALUES (16,$1,$2,'Nobody',$3,1,100,'paid','hash_both_smoke',now(),now())`,
      [serviceId, asked.paid, CLIENT],
    );
  } catch {
    refusedBoth = true;
  }
  ok(
    "the database refuses a booking that names a workshop AND a service",
    refusedBoth,
  );

  let refusedOrphan = false;
  try {
    await db.query(
      `INSERT INTO "Booking"
         ("serviceId","buyerName","buyerEmail",places,"totalPence",status,
          "cancellationTokenHash","paidAt","updatedAt")
       VALUES ($1,'Nobody',$2,1,100,'paid','hash_orphan_smoke',now(),now())`,
      [serviceId, CLIENT],
    );
  } catch {
    refusedOrphan = true;
  }
  ok(
    "the database refuses a session booking with no approval behind it",
    refusedOrphan,
  );

  // ── getting in ────────────────────────────────────────────────────────────
  const wasClosed = await signIn(page);
  ok("the requests queue is closed to anyone not signed in", wasClosed);

  await page.goto(`${BASE}/admin/bookings`);
  await page.waitForSelector("#requests-h", { timeout: 30_000 });

  ok(
    "nothing is actually being emailed — the log adapter is what is running",
    server.out().includes("EMAIL (not sent — no RESEND_API_KEY)") ||
      server.out().includes("[service-requests]") === false,
  );

  const queue = await page.locator("main").innerText();
  ok(
    "the queue counts who is waiting and says what approving does",
    /waiting to hear back/.test(queue) &&
      queue.includes("Approving sends them a link to pay"),
    oneLine(queue),
  );

  // ── approve, at a figure she chooses ──────────────────────────────────────
  //
  // The service says £70 on its page. She is driving to them, so she approves
  // £95 — and £95 is what the client must be asked for, everywhere.
  const ruth = page.locator("tr", { hasText: "Ruth Bailey" });
  await ruth.getByRole("button", { name: /^Approve/ }).click();

  const approveModal = page.locator("dialog[open]");
  await approveModal.waitFor({ timeout: 10_000 });
  const modalText = await approveModal.innerText();
  ok(
    "the approve panel offers the service's own price as the default",
    (await approveModal.locator('input[name="amount"]').inputValue()) === "70",
    modalText.slice(0, 200),
  );
  ok(
    "and offers their own words as the starting point for the time",
    (await approveModal.locator('textarea[name="agreedTime"]').inputValue()) ===
      "Weekday mornings, ideally not Tuesdays",
  );
  ok(
    "the panel says how long the link lasts before she presses anything",
    /48 hours/.test(modalText),
    oneLine(modalText),
  );

  await approveModal.locator('input[name="amount"]').fill("95");
  await approveModal
    .locator('textarea[name="agreedTime"]')
    .fill("Thursday the 3rd at 10, at yours");
  await approveModal
    .getByRole("button", { name: /Approve and send the link/ })
    .click();
  await page.waitForFunction(
    () => !document.querySelector("dialog[open]"),
    undefined,
    { timeout: 20_000 },
  );

  const approved = await requestRow(asked.paid);
  ok(
    "approving records what SHE approved — not the service's list price",
    approved.status === "confirmed" &&
      approved.approvedPence === 9500 &&
      approved.agreedTime === "Thursday the 3rd at 10, at yours",
    JSON.stringify({
      status: approved.status,
      approvedPence: approved.approvedPence,
      agreedTime: approved.agreedTime,
    }),
  );
  ok(
    "only the HASH of the pay token is stored, and a deadline with it",
    typeof approved.payTokenHash === "string" &&
      approved.payTokenHash.length === 64 &&
      approved.payBy !== null,
  );
  {
    const hours = (approved.payBy - approved.approvedAt) / 3_600_000;
    ok(
      "the window is 48 hours from the moment she approved",
      Math.abs(hours - 48) < 0.05,
      `${hours} hours`,
    );
  }

  const approvalMail = emailTo(server.out(), CLIENT);
  const payLink = payLinkIn(approvalMail);
  ok(
    "the client is emailed the link, the figure she approved, and the deadline",
    payLink !== null &&
      approvalMail.includes("£95") &&
      !approvalMail.includes("£70") &&
      approvalMail.includes("Thursday the 3rd at 10, at yours") &&
      /Subject:  Yes —/.test(approvalMail),
    oneLine(approvalMail),
  );
  ok(
    "and told what happens if it is not paid, before they have to ask",
    /IF IT IS NOT PAID BY THEN/.test(approvalMail),
    oneLine(approvalMail),
  );
  ok(
    "the stored hash is the SHA-256 of the token in that email",
    createHash("sha256").update(payLink.split("/pay/")[1]).digest("hex") ===
      approved.payTokenHash,
  );

  // ── the page the link opens ───────────────────────────────────────────────
  await page.goto(payLink);
  const payText = await page.locator("main").innerText();
  ok(
    "the pay page states the figure, the agreed time and the deadline",
    payText.includes("£95") &&
      payText.includes("Thursday the 3rd at 10, at yours") &&
      /Marianne has said yes/.test(payText),
    oneLine(payText),
  );
  ok(
    "and offers the button that mints a checkout on the press",
    (await page.locator('button:has-text("Pay £95")').count()) === 1,
  );

  // ── paying ────────────────────────────────────────────────────────────────
  const paidEvent = `evt_smoke_s_paid_${stamp}`;
  const paidSession = `cs_smoke_s_paid_${stamp}`;
  const first = await postEvent(
    sessionEvent({
      eventId: paidEvent,
      sessionId: paidSession,
      requestId: asked.paid,
      amountPence: 9500,
      name: "An Hour Of Attention",
    }),
  );
  ok("the webhook acts on a signature-verified session payment", first.ok);

  let made = await bookingsFor(asked.paid);
  ok(
    "paying creates ONE booking and ONE payment of kind `full`",
    made.length === 1 &&
      made[0].payments.length === 1 &&
      made[0].payments[0].kind === "full" &&
      made[0].payments[0].amountPence === 9500,
    JSON.stringify(made.map((b) => ({ id: b.id, p: b.payments.length }))),
  );
  ok(
    "the booking is for the service, against the approval, at HER figure",
    made[0].serviceId === serviceId &&
      made[0].serviceRequestId === asked.paid &&
      made[0].totalPence === 9500 &&
      made[0].places === 1 &&
      made[0].status === "paid" &&
      made[0].workshopId === null &&
      made[0].courseId === null,
    JSON.stringify(made[0]),
  );
  ok(
    "nothing is ever outstanding on a session — no balance, no second link",
    made[0].balanceDueAt === null && made[0].balanceTokenHash === null,
  );
  ok(
    "the event is recorded as having booked something",
    (await eventRow(paidEvent))?.outcome === "booked",
  );

  const confirmation = emailTo(server.out(), CLIENT);
  ok(
    "the confirmation names the session, the time, the figure and the reference",
    confirmation.includes("An Hour Of Attention") &&
      confirmation.includes("Thursday the 3rd at 10, at yours") &&
      confirmation.includes("£95") &&
      /Reference TFW-\d{4}/.test(confirmation),
    oneLine(confirmation),
  );
  ok(
    "it carries the cancellation link and says there is no refund period",
    /\/cancel\//.test(confirmation) &&
      /refund period on a session/.test(confirmation),
    oneLine(confirmation),
  );
  const notice = emailTo(server.out(), OWNER);
  ok(
    "and she is told, without a places-left line that would say 0 of 1",
    notice.includes("has paid for An Hour Of Attention") &&
      !/places left/.test(notice),
    oneLine(notice),
  );

  // ── where paying lands ────────────────────────────────────────────────────
  //
  // The page Stripe's success_url points at. It confirms nothing — it looks the
  // payment up by session id and draws what the WEBHOOK wrote.
  await page.goto(
    `${BASE}/services/${await serviceSlug()}/booked?session=${paidSession}`,
  );
  const receipt = await page.locator("main").innerText();
  ok(
    "the page they land on draws the receipt the webhook wrote",
    receipt.includes("An Hour Of Attention") &&
      receipt.includes("Thursday the 3rd at 10, at yours") &&
      receipt.includes("£95") &&
      /TFW-\d{4}/.test(receipt),
    oneLine(receipt),
  );
  ok(
    "and points at the email for the link it cannot rebuild",
    /the link to say so is in that email/.test(receipt),
    oneLine(receipt),
  );

  // ── the same event again ──────────────────────────────────────────────────
  const replay = await postEvent(
    sessionEvent({
      eventId: paidEvent,
      sessionId: paidSession,
      requestId: asked.paid,
      amountPence: 9500,
      name: "An Hour Of Attention",
    }),
  );
  const replayBody = await replay.json();
  made = await bookingsFor(asked.paid);
  ok(
    "the same event delivered twice makes one booking and one payment",
    made.length === 1 && made[0].payments.length === 1 && replayBody.replay,
    JSON.stringify(replayBody),
  );

  // ── a SECOND, different payment for the same session ──────────────────────
  const dupEvent = `evt_smoke_s_dup_${stamp}`;
  await postEvent(
    sessionEvent({
      eventId: dupEvent,
      sessionId: `cs_smoke_s_dup_${stamp}`,
      requestId: asked.paid,
      amountPence: 9500,
      name: "An Hour Of Attention",
    }),
  );
  made = await bookingsFor(asked.paid);
  ok(
    "a second checkout for one session writes nothing and is recorded as such",
    made.length === 1 &&
      made[0].payments.length === 1 &&
      (await eventRow(dupEvent))?.outcome === "duplicatePayment",
  );
  ok(
    "and the client is told they were charged twice, not left to notice",
    /charged twice/.test(emailTo(server.out(), CLIENT)),
    oneLine(emailTo(server.out(), CLIENT)),
  );

  // ── the link, pressed again ───────────────────────────────────────────────
  await page.goto(payLink);
  ok(
    "the link then says it is already paid for rather than charging again",
    /already paid for/.test(await page.locator("main").innerText()),
    oneLine(await page.locator("main").innerText()),
  );

  // ── declining ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/bookings`);
  const peter = page.locator("tr", { hasText: "Peter Nash" });
  await peter.getByRole("button", { name: /^Decline/ }).click();
  const declineModal = page.locator("dialog[open]");
  await declineModal.waitFor({ timeout: 10_000 });
  await declineModal
    .locator('textarea[name="note"]')
    .fill("I am not taking anyone new until the autumn, I am afraid.");
  await declineModal
    .getByRole("button", { name: /Send this and close the request/ })
    .click();
  await page.waitForFunction(
    () => !document.querySelector("dialog[open]"),
    undefined,
    { timeout: 20_000 },
  );

  const declined = await requestRow(asked.declined);
  ok(
    "declining closes the request and keeps what she said",
    declined.status === "declined" &&
      declined.declinedAt !== null &&
      declined.declineNote.startsWith("I am not taking anyone new"),
    JSON.stringify({
      status: declined.status,
      note: declined.declineNote,
    }),
  );
  ok(
    "and nothing about it is payable — no token, no deadline",
    declined.payTokenHash === null && declined.payBy === null,
  );
  ok(
    "they are sent her words, not a template about them",
    emailTo(server.out(), CLIENT).includes(
      "I am not taking anyone new until the autumn",
    ),
    oneLine(emailTo(server.out(), CLIENT)),
  );

  // ── an approval that runs out ─────────────────────────────────────────────
  await page.goto(`${BASE}/admin/bookings`);
  const anna = page.locator("tr", { hasText: "Anna Frost" });
  await anna.getByRole("button", { name: /^Approve/ }).click();
  const annaModal = page.locator("dialog[open]");
  await annaModal.waitFor({ timeout: 10_000 });
  await annaModal
    .locator('textarea[name="agreedTime"]')
    .fill("Thursday the 10th at 7");
  await annaModal
    .getByRole("button", { name: /Approve and send the link/ })
    .click();
  await page.waitForFunction(
    () => !document.querySelector("dialog[open]"),
    undefined,
    { timeout: 20_000 },
  );
  const lapsingLink = payLinkIn(emailTo(server.out(), CLIENT));

  // TIME PASSING, and nothing else. The deadline is a real stored instant, so
  // moving it back is the honest way to be two days later — no state is faked,
  // and every conclusion below is drawn by the same arithmetic that would draw
  // it on Thursday morning.
  await db.query(
    `UPDATE "ServiceRequest" SET "payBy" = now() - interval '1 hour' WHERE id = $1`,
    [asked.lapsing],
  );

  await page.goto(`${BASE}/admin/bookings`);
  const lapsedQueue = await page.locator("main").innerText();
  ok(
    "the queue says an approval ran out — nothing had to fire for it to be true",
    /ran out unpaid and (is|are) back with you/.test(lapsedQueue),
    oneLine(lapsedQueue),
  );
  ok(
    "and the row says it, with the moment it ran out and that nothing was charged",
    /this has run out and the time is yours again/.test(lapsedQueue) &&
      /Nothing was charged/.test(lapsedQueue),
    oneLine(lapsedQueue),
  );

  await page.goto(lapsingLink);
  ok(
    "the link then says so too, rather than taking a payment",
    /ran out before it was paid/.test(await page.locator("main").innerText()) &&
      (await page.locator('button:has-text("Pay ")').count()) === 0,
    oneLine(await page.locator("main").innerText()),
  );

  const lateEvent = `evt_smoke_s_late_${stamp}`;
  await postEvent(
    sessionEvent({
      eventId: lateEvent,
      sessionId: `cs_smoke_s_late_${stamp}`,
      requestId: asked.lapsing,
      amountPence: 7000,
      name: "An Hour Of Attention",
    }),
  );
  ok(
    "a payment that lands anyway writes no booking and is recorded as lapsed",
    (await bookingsFor(asked.lapsing)).length === 0 &&
      (await eventRow(lateEvent))?.outcome === "approvalGone",
  );
  ok(
    "with the money refunded and both people told",
    /ran out before this was paid/.test(emailTo(server.out(), CLIENT)) &&
      /after the approval had run out/.test(emailTo(server.out(), OWNER)),
    oneLine(emailTo(server.out(), OWNER)),
  );

  // ── approving again, which retires the dead link ──────────────────────────
  await page.goto(`${BASE}/admin/bookings`);
  const annaAgain = page.locator("tr", { hasText: "Anna Frost" });
  // Located by what it SAYS rather than by its accessible name: the label
  // spells out whose request and why, which is right for a screen reader and
  // longer than the two words on the face of it.
  await annaAgain.locator('button:has-text("Approve again")').click();
  const againModal = page.locator("dialog[open]");
  await againModal.waitFor({ timeout: 10_000 });
  await againModal
    .getByRole("button", { name: /Approve and send the link/ })
    .click();
  await page.waitForFunction(
    () => !document.querySelector("dialog[open]"),
    undefined,
    { timeout: 20_000 },
  );

  const reapproved = await requestRow(asked.lapsing);
  const newLink = payLinkIn(emailTo(server.out(), CLIENT));
  ok(
    "approving again issues a NEW link and a new window",
    newLink !== null &&
      newLink !== lapsingLink &&
      reapproved.payBy.getTime() > Date.now(),
  );
  await page.goto(lapsingLink);
  ok(
    "and the link in the old email stops working, because the token is gone",
    /no longer works/.test(await page.locator("main").innerText()),
    oneLine(await page.locator("main").innerText()),
  );

  // ── a stale page cannot approve twice ─────────────────────────────────────
  //
  // Two tabs on the queue is an ordinary thing. The second one was drawn before
  // the first approved, so its buttons are a picture of a row that has changed.
  const stale = await (await browser.newContext()).newPage();
  stale.setDefaultNavigationTimeout(180_000);
  stale.setDefaultTimeout(60_000);
  await signIn(stale);
  await stale.goto(`${BASE}/admin/bookings`);
  await stale.waitForSelector("#requests-h", { timeout: 30_000 });

  await page.goto(`${BASE}/admin/bookings`);
  const colin = page.locator("tr", { hasText: "Colin Webb" });
  await colin.getByRole("button", { name: /^Approve/ }).click();
  const colinModal = page.locator("dialog[open]");
  await colinModal.waitFor({ timeout: 10_000 });
  await colinModal.locator('input[name="amount"]').fill("70");
  await colinModal
    .locator('textarea[name="agreedTime"]')
    .fill("Monday the 7th at 9");
  await colinModal
    .getByRole("button", { name: /Approve and send the link/ })
    .click();
  await page.waitForFunction(
    () => !document.querySelector("dialog[open]"),
    undefined,
    { timeout: 20_000 },
  );
  const once = await requestRow(asked.stale);

  // The stale tab now presses approve on a row that has already been answered.
  const staleColin = stale.locator("tr", { hasText: "Colin Webb" });
  await staleColin.getByRole("button", { name: /^Approve/ }).click();
  const staleModal = stale.locator("dialog[open]");
  await staleModal.waitFor({ timeout: 10_000 });
  await staleModal.locator('input[name="amount"]').fill("200");
  await staleModal
    .locator('textarea[name="agreedTime"]')
    .fill("Some other time entirely");
  await staleModal
    .getByRole("button", { name: /Approve and send the link/ })
    .click();
  await stale.waitForSelector('dialog[open] [role="alert"]', {
    timeout: 20_000,
  });
  const refusal = await staleModal.locator('[role="alert"]').innerText();

  ok(
    "a stale page is refused, and told why",
    /already approved/.test(refusal),
    oneLine(refusal),
  );
  const twice = await requestRow(asked.stale);
  ok(
    "the second approval changed nothing — one figure, one link, one deadline",
    twice.approvedPence === once.approvedPence &&
      twice.approvedPence === 7000 &&
      twice.payTokenHash === once.payTokenHash &&
      twice.agreedTime === once.agreedTime,
    JSON.stringify({ once, twice }),
  );

  // ── the ledger, with all three kinds in it ────────────────────────────────
  await page.goto(`${BASE}/admin/workshop-bookings`);
  await page.waitForSelector("#upcoming-table", { timeout: 30_000 });
  const ledger = await page.locator("main").innerText();
  ok(
    "the paid session appears in the ledger, named",
    ledger.includes("An Hour Of Attention"),
    oneLine(ledger),
  );
  ok(
    "typed as a Session — the column the approved screen drew empty",
    // Case-insensitive: the Type column is uppercased in CSS, and innerText
    // gives back what is on the screen rather than what is in the source.
    /\bsession\b/i.test(ledger),
    oneLine(ledger),
  );
  ok(
    "and placed by her sentence, because it has no date to be placed by",
    ledger.includes("Thursday the 3rd at 10, at yours"),
    oneLine(ledger),
  );
  ok(
    "and says plainly that refunding one is her decision, not a period's",
    /No refund period on a session/.test(ledger),
    oneLine(ledger),
  );

  // ── the operator's own data, again, at the end ────────────────────────────
  const { rows: after } = await db.query(
    `SELECT b.id, b."totalPence", b.status, b."workshopId", p.kind, p."amountPence"
     FROM "Booking" b LEFT JOIN "Payment" p ON p."bookingId" = b.id
     WHERE b.id = 25`,
  );
  ok(
    "Booking 25 is exactly as it was when this started",
    after.length === 1 &&
      after[0].workshopId === 16 &&
      after[0].status === "paid" &&
      after[0].kind === "full" &&
      after[0].totalPence === b25[0].totalPence,
    JSON.stringify(after),
  );
  const { rows: hisAfter } = await db.query(
    `SELECT id, status, "approvedAt", "payTokenHash" FROM "ServiceRequest"
     WHERE id IN (3,4) ORDER BY id`,
  );
  ok(
    "and his two requests are still pending and unanswered",
    hisAfter.length === 2 &&
      hisAfter.every(
        (r) =>
          r.status === "pending" &&
          r.approvedAt === null &&
          r.payTokenHash === null,
      ),
    JSON.stringify(hisAfter),
  );

  // ── the one that matters most ─────────────────────────────────────────────
  ok(
    "NOT ONE MESSAGE IN THIS RUN WAS ADDRESSED TO HER",
    !server.out().includes(`To:       ${HERS}`),
  );
  ok(
    "and nothing was delivered at all — every message went to the log",
    !/sent via resend/.test(server.out()),
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
