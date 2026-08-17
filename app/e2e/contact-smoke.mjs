// =============================================================================
// About and Contact — the two public pages, end to end
// =============================================================================
//
// One claim, exercised: a stranger can read who she is, write to her, and every
// word of chrome on either page goes somewhere that exists. Everything else here
// is something that had to be true on the way — the server refusing a bad
// address and an empty message with a sentence beside the field, the message
// reaching HER address with a working reply-to and both parts in the envelope,
// the honeypot swallowing a robot without telling it, the hourly counter
// closing the form, and every nav and footer link on both pages answering 200.
//
// The sibling of bookings-smoke.mjs and it runs the same way:
//
//   node e2e/contact-smoke.mjs
//
// It writes NOTHING to the database — the contact form has no table, which is
// the point of it — so unlike the offerings suites it leaves nothing behind and
// can be run twice in a row.
//
// ── WHY THIS SCRIPT CANNOT MAIL A REAL PERSON ────────────────────────────────
//
// Three layers, none of which depends on getting a variable right:
//
//  1. THE COPY HAS NO .env.local. The child inherits only the variables named
//     in `startServer`, so the operator's real RESEND_API_KEY has no path in
//     however this script is run. `makeCopy` is bookings-smoke.mjs's, verbatim.
//  2. EMAIL_TO_OWNER is a `.invalid` sink. `.invalid` is reserved by RFC 2606
//     and resolves nowhere, so even a mailer would have nothing to deliver to.
//  3. THE WHOLE SERVER LOG IS SEARCHED at the end for the three addresses that
//     must never appear in a test run — her mailbox and the operator's two.
//     That check is a test, and it fails the suite.
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
// =============================================================================

import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { chromium } from "playwright";

/**
 * THIS PROCESS reads .env.local, for DATABASE_URL — the crawl walks pages that
 * query it. The CHILD does not: `startServer` builds its environment from
 * nothing and the copy it runs from has no .env.local in it, which is what
 * keeps the real key out of the server that could actually use it. Same
 * arrangement as duplicates-smoke.mjs.
 */
loadEnv({ path: ".env.local" });

const PORT = 3107;
const BASE = `http://localhost:${PORT}`;
const APP = resolve(".");

/** A sink. RFC 2606 reserves `.invalid`; nothing resolves there, ever. */
const OWNER = "owner@example.invalid";

/** Who the test pretends to be. Also `.invalid`. */
const SENDER = "sarah.tester@example.invalid";

/** Stands in for EMAIL_REPLY_TO, whose default is her real mailbox. */
const REPLIES = "replies@example.invalid";

/**
 * The three addresses a test run must never touch. Her mailbox, and the
 * operator's two. Asserted against the WHOLE server log at the end, so it
 * catches a message from any code path this suite happened to walk — not only
 * the ones it meant to.
 */
const FORBIDDEN = [
  "marianne@thefieldwork.co.uk",
  "nagrom.1990@gmail.com",
  "david.morgan@gotribe.org",
];

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── the dev server, on our terms ─────────────────────────────────────────────

/**
 * A COPY OF THE APP, somewhere else. bookings-smoke.mjs's `makeCopy`, verbatim
 * and for its two reasons: Next refuses a second dev server on one directory,
 * and the copy has no `.env.local`, which is what guarantees this can never
 * reach the real key. Blanking a variable is a thing that can be got wrong; not
 * copying the file cannot be.
 */
function makeCopy() {
  const root = resolve(".smoke-app-contact");
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
    "prisma.config.ts",
  ]) {
    if (existsSync(entry))
      cpSync(entry, join(root, entry), { recursive: true });
  }
  const link = process.platform === "win32" ? "junction" : "dir";
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), link);
  symlinkSync(resolve("public"), join(root, "public"), link);
  return root;
}

async function startServer(cwd) {
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
      cwd,
      env: {
        // Everything the app needs, named one at a time. Nothing else crosses.
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_SECRET:
          process.env.AUTH_SECRET ?? "smoke-contact-secret-not-real-0123456789",
        NEXT_PUBLIC_SITE_URL: BASE,
        EMAIL_TO_OWNER: OWNER,
        // The acknowledgement sets no Reply-To of its own, so it falls back to
        // this — which defaults to HER real mailbox. Pointed at a sink here so
        // the run does not name a real person anywhere, in any header.
        EMAIL_REPLY_TO: REPLIES,
        // Named explicitly as well as omitted, so the intent is legible even
        // though layer 1 above already makes it impossible.
        RESEND_API_KEY: "",
      },
    },
  );
  const collect = (buffer) => log.push(buffer.toString());
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/contact`);
      if (response.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  if (Date.now() >= deadline) {
    throw new Error(`server never came up:\n${log.join("")}`);
  }
  return { child, out: () => log.join("") };
}

function stopServer(server) {
  // `next dev` forks a worker of its own, so killing only the process we
  // started leaves the port held. The whole tree goes.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-server.child.pid, "SIGKILL");
    } catch {
      server.child.kill("SIGKILL");
    }
  }
}

// ── reading the mail out of the log ──────────────────────────────────────────

/**
 * Every message the log adapter printed, as records.
 *
 * The adapter's block is the shape `lib/email/index.ts` prints when there is no
 * key: a header of `Name: value` lines, then a blank line, then the plain text.
 * Parsing it rather than grepping is what lets the assertions below be about
 * ONE message — "the notice carried both parts and a reply-to" — instead of
 * about whether two strings happen to appear somewhere in the same stream.
 */
function mailsIn(out) {
  const mails = [];
  const blocks = out.split(
    "──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────",
  );
  for (const block of blocks.slice(1)) {
    const end = block.indexOf(
      "──────────────────────────────────────────────────────────────",
    );
    const body = end === -1 ? block : block.slice(0, end);
    const read = (label) => {
      const match = body.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
      return match ? match[1].trim() : null;
    };
    mails.push({
      to: read("To"),
      replyTo: read("Reply-To"),
      subject: read("Subject"),
      parts: read("Parts"),
      body,
    });
  }
  return mails;
}

// ── the run ──────────────────────────────────────────────────────────────────

/** Types the three fields. `novalidate` first, so the SERVER does the refusing. */
async function fillAndSend(page, { name, email, message, honeypot }) {
  await page.evaluate(() => {
    document.querySelector("form")?.setAttribute("novalidate", "novalidate");
  });
  if (name !== undefined) await page.fill('input[name="name"]', name);
  if (email !== undefined) await page.fill('input[name="email"]', email);
  if (message !== undefined)
    await page.fill('textarea[name="message"]', message);
  if (honeypot) {
    await page.evaluate((value) => {
      const field = document.querySelector('input[name="website"]');
      if (field) field.value = value;
    }, honeypot);
  }
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
}

async function main() {
  const root = makeCopy();
  const server = await startServer(root);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // ── A · the two pages exist and say what they are for ────────────────────
    console.log("\n── the pages ──");
    const aboutResponse = await page.goto(`${BASE}/about`, {
      waitUntil: "domcontentloaded",
    });
    ok(
      "/about renders 200",
      aboutResponse.status() === 200,
      `got ${aboutResponse.status()}`,
    );
    const aboutText = await page.textContent("body");
    ok(
      "/about names the practice and the person",
      aboutText.includes("One practitioner. One room.") &&
        aboutText.includes("She has sat where you are sitting."),
    );
    ok(
      "/about claims no number of years and no accreditation",
      !/\b(fifteen|twelve|\d+)\s+years\b/i.test(aboutText) &&
        !/accredit|diploma|certified|qualification/i.test(aboutText),
      "an unverified biographical fact has crept into the copy",
    );
    ok(
      "/about carries no bracketed placeholder",
      !/\[\s*placeholder/i.test(aboutText),
    );
    ok(
      "her portrait carries a description",
      (await page.getAttribute("img.portrait", "alt"))?.length > 20,
    );

    const contactResponse = await page.goto(`${BASE}/contact`, {
      waitUntil: "domcontentloaded",
    });
    ok(
      "/contact renders 200",
      contactResponse.status() === 200,
      `got ${contactResponse.status()}`,
    );
    const contactText = await page.textContent("body");
    ok(
      "/contact carries the direct address as well as the form",
      (await page
        .locator('a[href="mailto:marianne@thefieldwork.co.uk"]')
        .count()) === 1 &&
        (await page.locator('textarea[name="message"]').count()) === 1,
    );
    ok(
      "/contact says Frome, not London",
      contactText.includes("Frome") && !/london|overground/i.test(contactText),
    );
    ok(
      "/contact promises no reply timescale",
      !/same evening|within a day|within 24|24 hours|by return/i.test(
        contactText,
      ),
    );
    ok(
      "the form renders whole on the server, not behind script",
      (await page.locator('input[name="name"]').count()) === 1 &&
        (await page.locator('input[name="email"]').count()) === 1 &&
        (await page.locator('button[type="submit"]').count()) === 1,
    );

    // ── B · every link in the chrome resolves ────────────────────────────────
    console.log("\n── the chrome ──");
    const seen = new Map();
    for (const from of ["/", "/about", "/contact"]) {
      await page.goto(`${BASE}${from}`, { waitUntil: "domcontentloaded" });
      // The chrome on all three, plus the body links on the two new pages —
      // which is where a re-linked entry or a new call to action could dangle.
      const selector =
        from === "/"
          ? ".site-head a, .site-foot a"
          : ".site-head a, .site-foot a, section a";
      const hrefs = await page.$$eval(selector, (nodes) =>
        nodes.map((node) => node.getAttribute("href")),
      );
      for (const href of hrefs) {
        if (!href) continue;
        if (/^(mailto:|tel:|#)/.test(href)) continue;
        if (/^https?:\/\//.test(href) && !href.startsWith(BASE)) continue;
        const url = href.startsWith("http") ? href : `${BASE}${href}`;
        if (!seen.has(url)) seen.set(url, from);
      }
    }
    const dead = [];
    for (const [url, from] of seen) {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok)
        dead.push(`${url} (${response.status}, linked from ${from})`);
    }
    ok(
      `every nav and footer link resolves (${seen.size} checked)`,
      dead.length === 0,
      dead.join("; "),
    );
    ok(
      "the About tab is /about, not the old /#not anchor",
      seen.has(`${BASE}/about`),
    );
    ok("the Contact tab is in the nav", seen.has(`${BASE}/contact`));
    ok(
      "the footer's re-linked entries resolve",
      seen.has(`${BASE}/subscribe`) && seen.has(`${BASE}/about`),
    );

    // ── C · the server refuses, with a sentence beside the field ─────────────
    console.log("\n── what the server refuses ──");
    await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
    await fillAndSend(page, {
      name: "Sarah",
      email: "sarah@",
      message: "Is this going to be embarrassing?",
    });
    const badEmailError = await page
      .locator('input[name="email"] ~ p')
      .first()
      .textContent()
      .catch(() => null);
    ok(
      "a bad address is refused beside the email field",
      !!badEmailError && badEmailError.includes("second half"),
      badEmailError ?? "no sentence rendered",
    );
    ok(
      "the refused field is announced as invalid",
      (await page.getAttribute('input[name="email"]', "aria-invalid")) ===
        "true",
    );

    await fillAndSend(page, {
      name: "Sarah",
      email: SENDER,
      message: "",
    });
    const emptyMessageError = await page
      .locator('textarea[name="message"] ~ p')
      .first()
      .textContent()
      .catch(() => null);
    ok(
      "an empty message is refused beside the message field",
      !!emptyMessageError && emptyMessageError.includes("nothing here to send"),
      emptyMessageError ?? "no sentence rendered",
    );

    const beforeValid = mailsIn(server.out()).length;
    ok(
      "nothing was sent by either refusal",
      beforeValid === 0,
      `${beforeValid} mails`,
    );

    // ── D · a valid message ──────────────────────────────────────────────────
    console.log("\n── a message that goes ──");
    await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
    // The guard's clock: a form submitted within three seconds of being drawn
    // was not read by a person. Waiting past it is what makes this a real
    // submission rather than one the honeypot layer swallows.
    await page.waitForTimeout(3400);
    await fillAndSend(page, {
      name: "Sarah Tester",
      email: SENDER,
      message: "Do I have to take anything off? That is the bit stopping me.",
    });
    ok(
      "the panel says it has gone",
      (await page.textContent("body")).includes("Sent."),
    );

    const mails = mailsIn(server.out());
    const toOwner = mails.filter((mail) => mail.to === OWNER);
    ok(
      "exactly one mail is addressed to her",
      toOwner.length === 1,
      `${toOwner.length}`,
    );
    ok(
      "it is addressed to EMAIL_TO_OWNER and nowhere else",
      toOwner[0]?.to === OWNER,
      toOwner[0]?.to ?? "none",
    );
    ok(
      "its Reply-To is the sender, so she can just reply",
      toOwner[0]?.replyTo === SENDER,
      toOwner[0]?.replyTo ?? "none",
    );
    ok(
      "it carries BOTH a text and an HTML part",
      /^text \+ html \(/.test(toOwner[0]?.parts ?? ""),
      toOwner[0]?.parts ?? "none",
    );
    ok(
      "the text part carries their words, not a summary of them",
      (toOwner[0]?.body ?? "").includes("That is the bit stopping me."),
    );
    ok(
      "the branded half carries the mark inline",
      (toOwner[0]?.body ?? "").includes("cid:thefieldwork-mark"),
    );

    const toSender = mails.filter((mail) => mail.to === SENDER);
    ok(
      "exactly one acknowledgement goes back",
      toSender.length === 1,
      `${toSender.length}`,
    );
    ok(
      "the acknowledgement is plain text alone",
      toSender[0]?.parts === "text only",
      toSender[0]?.parts ?? "none",
    );
    ok(
      "the acknowledgement's replies go to the configured mailbox",
      toSender[0]?.replyTo === REPLIES,
      toSender[0]?.replyTo ?? "none",
    );
    ok(
      "the acknowledgement promises no timescale",
      !/same evening|within a day|within 24|24 hours|by return/i.test(
        toSender[0]?.body ?? "",
      ),
    );

    // ── E · the honeypot ─────────────────────────────────────────────────────
    console.log("\n── the trap ──");
    await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3400);
    const beforeTrap = mailsIn(server.out()).length;
    await fillAndSend(page, {
      name: "Robot",
      email: "robot@example.invalid",
      message: "Cheap watches.",
      honeypot: "http://example.invalid",
    });
    ok(
      "a filled trap is answered exactly as a real one is",
      (await page.textContent("body")).includes("Sent."),
    );
    ok(
      "and nothing is sent",
      mailsIn(server.out()).length === beforeTrap,
      "a trapped submission produced mail",
    );

    // ── F · the hourly counter ───────────────────────────────────────────────
    console.log("\n── the counter ──");
    // Four attempts are already spent on this caller (two refusals, one real
    // message, one trap). `PER_CALLER_LIMIT` is 5 and counts the ATTEMPT rather
    // than the success, so the next one is the last allowed and the one after
    // it is refused. Submitted with a bad address so no mail can result either
    // way, which also proves the counter runs BEFORE validation.
    let limited = null;
    for (let attempt = 0; attempt < 4 && limited === null; attempt += 1) {
      await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
      await fillAndSend(page, {
        name: "Sarah",
        email: "sarah@",
        message: "again",
      });
      const text = await page.textContent("body");
      if (text.includes("a lot of messages from one place")) limited = attempt;
    }
    ok(
      "the counter closes the form after its allowance",
      limited !== null,
      "five more submissions never tripped the limit",
    );
    const limitAlert = await page
      .locator('[role="alert"]')
      .first()
      .textContent();
    ok(
      "and says so without saying what tripped",
      (limitAlert ?? "").includes("Nothing has been sent") &&
        !/honeypot|robot|automated/i.test(limitAlert ?? ""),
      limitAlert ?? "no alert",
    );

    // ── G · nobody real was written to ───────────────────────────────────────
    console.log("\n── nobody real ──");
    const out = server.out();
    for (const address of FORBIDDEN) {
      // The address is ALLOWED to appear as page copy — it is printed on the
      // contact page on purpose, and the suite asserts above that it is. What
      // must never appear is a message ADDRESSED to it, which is exactly what
      // the adapter's `To:` line records. Every envelope in the run is checked,
      // not only the ones this suite meant to produce.
      const addressed = mailsIn(out).some((mail) => mail.to === address);
      ok(`nothing in this run was addressed to ${address}`, !addressed);
    }
    ok(
      "no mail left this run at all — the adapter was the log, not Resend",
      !out.includes("sent via resend"),
    );
  } finally {
    await browser.close();
    stopServer(server);
    await sleep(1500);
    rmSync(root, { recursive: true, force: true });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
