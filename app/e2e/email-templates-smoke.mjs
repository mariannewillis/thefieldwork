// =============================================================================
// Branded email + guarded templates — end to end
// =============================================================================
//
// One claim, exercised: Marianne can reword the subject, the opening and the
// sign-off of the nine messages that reach a visitor, and NOTHING she can type
// stops somebody paying. Everything else here is a thing that had to be true on
// the way — every send carrying both a text part and an HTML part, a template
// with no row and one with blank fields both sending the app's own wording, and
// the six notices to her own inbox staying plain text.
//
// A sibling of admin-bookings-smoke.mjs, and it runs the same way:
//
//   1. A database (the one .env.local points at). No dev server of your own —
//      this starts its own on port 3103.
//   2. node e2e/email-templates-smoke.mjs
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
//
// ── WHAT IT NEVER DOES ───────────────────────────────────────────────────────
//
// NO REAL EMAIL, and it is not left to a flag. The app runs from a COPY with no
// `.env.local` in it, so the child process inherits only the variables named in
// `startServer` and the operator's real RESEND_API_KEY has no path into it. The
// log adapter therefore runs: every message is printed and none is delivered,
// which is checked rather than assumed. EMAIL_TO_OWNER points at an `.invalid`
// address (RFC 2606 — a TLD guaranteed never to resolve), and the last check in
// this file asserts that `marianne@thefieldwork.co.uk` appears nowhere in the
// whole run's output.
//
// NO STRIPE AT ALL. Nothing here opens a checkout or asks for a refund; the
// messages are rendered from the admin preview, which composes in memory.
//
// It creates ONE throwaway admin account and edits the `bookingConfirmation`
// template row, and it puts both back at the end. Marianne's account, booking
// 25, the three ServiceRequests and every offering are not touched.
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

loadEnv({ path: ".env.local" });

const scrypt = promisify(scryptCb);

const PORT = 3103;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");
const OWNER = "owner@example.invalid";
const USER = "smoke-templates@example.invalid";
const PASS = "smoke-templates-password-not-real";
/** The address the throwaway account resets to. .invalid, like every other. */
const MAILBOX = "smoke-templates-mailbox@example.invalid";
const SHOTS = resolve("e2e", "_email-shots");

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

/**
 * A COPY OF THE APP, with no environment of its own.
 *
 * The copy has no `.env.local`, so the child inherits only what `startServer`
 * names. That is what makes "no real email" structural rather than a promise:
 * the key is not merely blanked, it is absent from the process.
 */
function makeCopy() {
  const root = resolve(".smoke-templates-app");
  // From scratch, so a file deleted since the last run does not survive in the
  // copy and quietly keep an old module alive.
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
        AUTH_SECRET:
          process.env.AUTH_SECRET ?? "smoke-templates-secret-not-real",
        NEXT_PUBLIC_SITE_URL: BASE,
        // Belt as well as braces: the copy has no .env.local to read this from,
        // and it is named here so the intent is on the page.
        RESEND_API_KEY: "",
        EMAIL_TO_OWNER: OWNER,
        // Replies default to marianne@thefieldwork.co.uk — a live mailbox the
        // client reads. Pointed somewhere that cannot resolve so her address
        // does not appear even as a header in a message nothing sends.
        EMAIL_REPLY_TO: "replies@example.invalid",
        // Signing in calls ensureSeeded(). Left unset it falls back to its own
        // defaults and would quietly seed a second admin into the operator's
        // database.
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
}

/** The most recent email the log shows going to one address, in full. */
function emailTo(log, address) {
  const blocks = log
    .split("──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────")
    .slice(1)
    .filter((block) => block.includes(`To:       ${address}`));
  return blocks.at(-1) ?? "";
}

async function cleanUp() {
  await db.query(`DELETE FROM "AdminUser" WHERE username = $1`, [USER]);
  await db.query(
    `UPDATE "EmailTemplate" SET subject = NULL, opening = NULL, "signOff" = NULL
      WHERE key = 'bookingConfirmation'`,
  );
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

/** The nine keys, in the order the screen lists them. */
const KEYS = [
  "bookingConfirmation",
  "balancePaid",
  "cancellation",
  "refundIssued",
  "cannotHonour",
  "requestAcknowledgement",
  "sessionApproved",
  "sessionDeclined",
  "passwordReset",
];

try {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page
    .waitForURL((url) => new URL(url).pathname === "/admin", {
      timeout: 60_000,
    })
    .catch(() => {});
  ok(
    "the throwaway account signs in",
    new URL(page.url()).pathname === "/admin",
  );

  // ── 1 · the rail and the index ─────────────────────────────────────────────

  await page.goto(`${BASE}/admin/email-templates`);
  const index = await page.locator("main").innerText();
  ok(
    "the rail has an Email templates entry",
    (await page.locator('a[href="/admin/email-templates"]').count()) > 0,
  );
  ok(
    "the index lists all nine",
    KEYS.every((key) => index.length > 0),
  );
  for (const label of [
    "Booking confirmation",
    "Balance paid",
    "Cancellation",
    "Refund issued",
    "Could not be honoured",
    "Request acknowledgement",
    "Session approved",
    "Session declined",
    "Password reset",
  ]) {
    ok(`  …including ${label}`, index.includes(label));
  }
  ok(
    "and it says what is NOT hers to change",
    index.includes("booking reference") && index.includes("cancel a place"),
  );
  await page.setViewportSize({ width: 1680, height: 1200 });
  await page.screenshot({
    path: join(SHOTS, "index.png"),
    fullPage: true,
  });

  // ── 2 · every one of the nine renders ──────────────────────────────────────

  const rendered = {};
  for (const key of KEYS) {
    const response = await page.request.get(
      `${BASE}/admin/email-templates/${key}/preview`,
    );
    const html = await response.text();
    rendered[key] = html;
    ok(
      `${key} renders a whole HTML document`,
      response.ok() &&
        html.startsWith("<!doctype html>") &&
        html.includes("</html>"),
      `${response.status()} · ${html.length}b`,
    );
    ok(
      `  …with the masthead PNG, not the SVG`,
      html.includes("/brand/logo-horizontal@2x.png") &&
        !html.includes("logo-horizontal.svg"),
    );
    ok(
      `  …with a preheader and the compliance line`,
      html.includes("mso-hide:all") &&
        html.includes("Not a substitute for medical care"),
    );
    ok(
      `  …with no unsubscribe link (it is transactional)`,
      !html.includes(">Unsubscribe<"),
    );
  }

  // ── 3 · what the design record says has to be true ─────────────────────────

  const confirmation = rendered.bookingConfirmation;
  ok(
    "tables only — no flex, grid or position",
    !/display:\s*(flex|grid)/.test(confirmation) &&
      !/position:\s*(absolute|fixed|relative)/.test(confirmation),
  );
  ok(
    "no background images anywhere",
    !/background-image/.test(confirmation) && !/url\(/.test(confirmation),
  );
  ok(
    "no border-radius and no box-shadow",
    !/border-radius/.test(confirmation) && !/box-shadow/.test(confirmation),
  );
  ok("600px wide", confirmation.includes('width="600"'));
  ok(
    "no web fonts",
    !confirmation.includes("@font-face") &&
      !confirmation.includes("fonts.googleapis"),
  );
  ok(
    "the dark-mode opt-outs are all three there",
    confirmation.includes('name="color-scheme"') &&
      confirmation.includes("prefers-color-scheme: dark") &&
      confirmation.includes("[data-ogsc]"),
  );
  ok(
    "prefers-reduced-motion is honoured",
    confirmation.includes("prefers-reduced-motion"),
  );

  // NO FACT IS EVER SET IN GOLD. Gmail's Android app force-inverts and honours
  // no opt-out, so gold may only ever label something the line beneath repeats.
  const goldRuns = [
    ...confirmation.matchAll(/color:#E9C87E;[^>]*>([^<]*)</g),
  ].map((match) => match[1]);
  ok(
    "nothing in gold is a fact — no £, no date, no reference",
    goldRuns.every(
      (text) =>
        !/£|\d{4}|TFW-|January|February|March|April|May|June|July|August|September|October|November|December/.test(
          text,
        ),
    ),
    goldRuns.join(" | "),
  );

  ok(
    "the confirmation carries the amount, the reference and the cancel link",
    confirmation.includes("£190") &&
      confirmation.includes("TFW-4417") &&
      confirmation.includes("/cancel/9f4c2ab7d1sample"),
  );
  ok(
    "the approval carries the amount, the deadline and the pay link",
    rendered.sessionApproved.includes("£95") &&
      rendered.sessionApproved.includes("/pay/2f8ad1c6e0sample"),
  );

  // ── 4 · pictures of three of them ──────────────────────────────────────────

  // The signed-in state is carried over, not started fresh: the preview route
  // is behind the session, and a new context would photograph the sign-in page.
  const shot = await (
    await browser.newContext({
      deviceScaleFactor: 2,
      storageState: await page.context().storageState(),
    })
  ).newPage();
  for (const key of [
    "bookingConfirmation",
    "sessionApproved",
    "cancellation",
  ]) {
    await shot.setViewportSize({ width: 700, height: 1200 });
    await shot.goto(`${BASE}/admin/email-templates/${key}/preview`);
    await shot.waitForLoadState("networkidle");
    await shot.screenshot({
      path: join(SHOTS, `${key}-600.png`),
      fullPage: true,
    });
  }
  // And the phone, which is the same composition at a relaxed gutter.
  await shot.setViewportSize({ width: 375, height: 1200 });
  await shot.goto(`${BASE}/admin/email-templates/bookingConfirmation/preview`);
  await shot.waitForLoadState("networkidle");
  await shot.screenshot({
    path: join(SHOTS, "bookingConfirmation-375.png"),
    fullPage: true,
  });
  ok("three of the nine are rendered to PNG for a person to look at", true);

  // ── 5 · a template with NO ROW sends the app's own wording ─────────────────

  await db.query(
    `DELETE FROM "EmailTemplate" WHERE key = 'bookingConfirmation'`,
  );
  const noRow = await (
    await page.request.get(
      `${BASE}/admin/email-templates/bookingConfirmation/preview`,
    )
  ).text();
  ok(
    "with the row DELETED the message still renders",
    noRow.startsWith("<!doctype html>"),
  );
  ok(
    "  …in the app's own words",
    noRow.includes("Thank you. 2 places on Reading the Field are booked."),
  );
  ok(
    "  …with the amount, the reference and the cancel link untouched",
    noRow.includes("£190") &&
      noRow.includes("TFW-4417") &&
      noRow.includes("/cancel/9f4c2ab7d1sample"),
  );

  await db.query(
    `INSERT INTO "EmailTemplate" (key, "updatedAt") VALUES ('bookingConfirmation', now())`,
  );

  // ── 6 · a template with BLANK fields does the same ─────────────────────────

  await db.query(
    `UPDATE "EmailTemplate" SET subject = '   ', opening = '', "signOff" = '  '
      WHERE key = 'bookingConfirmation'`,
  );
  const blank = await (
    await page.request.get(
      `${BASE}/admin/email-templates/bookingConfirmation/preview`,
    )
  ).text();
  ok(
    "blank fields fall back to the app's own wording",
    blank.includes("Thank you. 2 places on Reading the Field are booked.") &&
      blank.includes(
        "Keep this email. That link is the only one, and you do not need to ask anyone to use it.",
      ),
  );
  ok(
    "  …and the letter is byte-identical to the one with no row at all",
    blank === noRow,
  );

  // ── 7 · THE GUARD — nothing she types can break a link or an amount ────────

  const HOSTILE_OPENING = [
    '</td></table><script>alert("pwned")</script>',
    "",
    '<a href="https://evil.invalid/steal">Pay here instead</a> and <img src=x onerror=alert(1)>',
    "",
    "Also: £0.00 is now due, and the deadline has passed. \"'&<>",
  ].join("\n");
  const HOSTILE_SUBJECT =
    "Cancelled\r\nBcc: someone-else@example.invalid\r\nSubject: <b>gotcha</b>";
  const HOSTILE_SIGNOFF =
    "</table></body></html><style>*{display:none}</style>{{cancelLink}} {{}} {{nonsense}}";

  await page.goto(`${BASE}/admin/email-templates/bookingConfirmation`);
  await page.fill('input[name="subject"]', HOSTILE_SUBJECT);
  await page.fill('textarea[name="opening"]', HOSTILE_OPENING);
  await page.fill('textarea[name="signOff"]', HOSTILE_SIGNOFF);
  // The admin header carries a Sign out button, which is also a type=submit and
  // comes first in the document. Named, not positional.
  await page.click('button:has-text("Save this wording")');
  await page.waitForTimeout(2500);

  const attacked = await (
    await page.request.get(
      `${BASE}/admin/email-templates/bookingConfirmation/preview`,
    )
  ).text();

  if (!attacked.includes("TFW-4417")) {
    console.log(`\n  --- attacked head ---\n${attacked.slice(0, 400)}`);
    console.log(`\n  --- server tail ---\n${server.out().slice(-3000)}`);
  }
  ok(
    "her script tag comes out inert, as characters",
    attacked.includes(
      "&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;",
    ) && !/<script/i.test(attacked),
  );
  ok(
    "her anchor is not an anchor",
    attacked.includes(
      "&lt;a href=&quot;https://evil.invalid/steal&quot;&gt;",
    ) && !attacked.includes('href="https://evil.invalid/steal"'),
  );
  ok(
    "her img/onerror is not an element",
    attacked.includes("&lt;img src=x onerror=alert(1)&gt;") &&
      !/<img[^>]*onerror/i.test(attacked),
  );
  ok(
    "her closing tags did not close the document early",
    attacked.trimEnd().endsWith("</html>") &&
      attacked.split("</html>").length === 2,
  );
  ok(
    "the cancellation link is still there and still points at us",
    attacked.includes(`href="${BASE}/cancel/9f4c2ab7d1sample"`),
  );
  ok(
    "the amount she 'changed' is still £190 on the plate",
    attacked.includes("£190") && !/>\s*£0\.00\s*</.test(attacked),
  );
  ok("the booking reference survived", attacked.includes("TFW-4417"));
  ok("the refund deadline survived", attacked.includes("Saturday 5 September"));
  ok(
    "an unknown placeholder is removed rather than printed",
    !attacked.includes("{{nonsense}}") && !attacked.includes("{{cancelLink}}"),
  );

  const subjectLine = /<title>([^<]*)<\/title>/.exec(attacked)?.[1] ?? "";
  ok(
    "the subject has no CR or LF in it — no header can be injected",
    !/[\r\n]/.test(subjectLine),
    JSON.stringify(subjectLine),
  );
  ok(
    "  …and its angle brackets are escaped in the document too",
    subjectLine.includes("&lt;b&gt;gotcha&lt;/b&gt;"),
    subjectLine,
  );

  // A real desktop: the form and the letter sit side by side from 1536 up.
  await page.setViewportSize({ width: 1680, height: 1200 });
  await page.screenshot({
    path: join(SHOTS, "guard.png"),
    fullPage: true,
  });

  // ── 8 · a benign edit does what she asked ─────────────────────────────────

  await page.goto(`${BASE}/admin/email-templates/bookingConfirmation`);
  await page.fill('input[name="subject"]', "You are booked — {{offering}}");
  await page.fill(
    'textarea[name="opening"]',
    "Lovely. {{places}} on {{offering}} on {{when}} — see you there.",
  );
  await page.fill('textarea[name="signOff"]', "Warmly, Marianne.");
  // The admin header carries a Sign out button, which is also a type=submit and
  // comes first in the document. Named, not positional.
  await page.click('button:has-text("Save this wording")');
  await page.waitForTimeout(2500);

  const hers = await (
    await page.request.get(
      `${BASE}/admin/email-templates/bookingConfirmation/preview`,
    )
  ).text();
  ok(
    "her wording is what the letter says",
    hers.includes(
      "Lovely. 2 places on Reading the Field on Saturday 19 September — see you there.",
    ) && hers.includes("Warmly, Marianne."),
  );
  ok(
    "  …and the facts are still the app's",
    hers.includes("£190") &&
      hers.includes("TFW-4417") &&
      hers.includes("/cancel/9f4c2ab7d1sample") &&
      hers.includes("Saturday 5 September"),
  );

  // ── 9 · reset puts it back ────────────────────────────────────────────────

  await page.goto(`${BASE}/admin/email-templates/bookingConfirmation`);
  await page.click('button:has-text("Reset Booking confirmation")');
  await page.waitForTimeout(2500);
  const back = await (
    await page.request.get(
      `${BASE}/admin/email-templates/bookingConfirmation/preview`,
    )
  ).text();
  ok("reset puts the original wording back", back === noRow);

  const { rows: cleared } = await db.query(
    `SELECT subject, opening, "signOff" FROM "EmailTemplate" WHERE key = 'bookingConfirmation'`,
  );
  ok(
    "  …by clearing the columns rather than writing the seed into them",
    cleared[0].subject === null &&
      cleared[0].opening === null &&
      cleared[0].signOff === null,
  );

  // ── 10 · a real send carries BOTH parts ───────────────────────────────────

  const anon = await (await browser.newContext()).newPage();
  await anon.goto(`${BASE}/admin/forgot-password`);
  await anon.fill('input[name="email"]', MAILBOX);
  await anon.click('button[type="submit"]');
  await anon.waitForTimeout(3000);

  const sent = emailTo(server.out(), MAILBOX);
  ok("a real send went through the adapter", sent.length > 0);
  ok(
    "  …and it is multipart: a text part AND an html part",
    /Parts:\s+text \+ html \(\d+(\.\d+)?kB\)/.test(sent),
    sent.split("\n").find((line) => line.startsWith("Parts:")) ?? "",
  );
  ok(
    "  …the text part still carries the link, unchanged",
    /\/admin\/reset-password\?token=/.test(sent) &&
      sent.includes("The link works once and expires in 60 minutes."),
  );
  ok(
    "  …and nothing was actually delivered",
    sent.includes("not sent — no RESEND_API_KEY") ||
      server.out().includes("EMAIL (not sent — no RESEND_API_KEY)"),
  );

  // ── 11 · the six notices to her own inbox stay plain text ─────────────────
  //
  // Sending one needs a booking or a request; what CAN be asserted cheaply is
  // that none of the six is on the screen, which is the operator's decision.
  await page.goto(`${BASE}/admin/email-templates`);
  const list = await page.locator("main").innerText();
  ok(
    "no notice-to-Marianne is offered for editing",
    !/booking notice|balance notice|refund by hand|request notice/i.test(list),
  );
  for (const missing of [
    "bookingNotice",
    "balanceNotice",
    "cancellationNotice",
    "refundFailedNotice",
    "cannotHonourNotice",
    "requestNotice",
  ]) {
    const response = await page.request.get(
      `${BASE}/admin/email-templates/${missing}/preview`,
    );
    ok(`  ${missing} has no editable template`, response.status() === 404);
  }

  // ── 12 · the client's address is nowhere in any of it ─────────────────────

  const everything = [
    server.out(),
    ...Object.values(rendered),
    noRow,
    blank,
    attacked,
    hers,
    back,
  ].join("\n");
  ok(
    `nothing in this run so much as names ${FORBIDDEN}`,
    !everything.includes(FORBIDDEN),
  );

  const addressed = [...server.out().matchAll(/^To:\s+(\S+)$/gm)].map(
    (match) => match[1],
  );
  ok("something was actually addressed", addressed.length > 0);
  ok(
    "every address any message went to is .invalid",
    addressed.every((address) => address.endsWith(".invalid")),
    addressed.join(", "),
  );
} finally {
  await browser.close();
  await stopServer(server);
}

await cleanUp();
await db.end();

// The copy goes with it. Windows holds the .next directory open for a moment
// after the dev server dies, so this waits rather than failing the run over a
// directory nobody is going to read.
for (let attempt = 0; attempt < 10; attempt++) {
  try {
    rmSync(COPY, { recursive: true, force: true });
    break;
  } catch {
    await sleep(1000);
  }
}

console.log(`\n  shots in ${SHOTS}`);
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
