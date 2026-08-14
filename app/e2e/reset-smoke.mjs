// =============================================================================
// Password reset — security smoke test
// =============================================================================
//
// The dev email adapter prints the reset link to the server log, so this test
// reads the log exactly where a real inbox would be. That is the whole reason
// the adapter exists: the flow is testable before the sending domain's DNS is
// verified.
//
// HOW TO RUN (from app/, with a THROWAWAY database):
//
//   PORT=4700 AUTH_SECRET="any-value-at-least-32-characters-long" //   DATABASE_URL=postgresql://... npx next start > /tmp/reset.log 2>&1 &
//
//   node e2e/reset-smoke.mjs http://localhost:4700 /tmp/reset.log
//
// Requires playwright. Run against a FRESH database each time — it changes a
// password and consumes the rate limiter.
// =============================================================================

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2];
const LOG = process.argv[3];
const EMAIL = "nagrom.1990@gmail.com";
const NEWPW = "window-lamp-dusk-sill";

let pass = 0,
  fail = 0;
const ok = (n, c, d = "") => {
  c
    ? (pass++, console.log(`  PASS  ${n}`))
    : (fail++, console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`));
};

const b = await chromium.launch();
const page = async () => (await b.newContext()).newPage();
const path = (p) => new URL(p.url()).pathname;

const linkFromLog = () => {
  const m = [
    ...fs
      .readFileSync(LOG, "utf8")
      .matchAll(/\/admin\/reset-password\?token=([A-Za-z0-9_-]+)/g),
  ];
  return m.length ? m[m.length - 1][0] : null;
};

// 1 — the flow is reachable without a session
let p = await page();
await p.goto(`${BASE}/admin/forgot-password`);
ok(
  "forgot-password is reachable signed out",
  path(p) === "/admin/forgot-password",
  path(p),
);
await p.goto(`${BASE}/admin/login`);
ok(
  "sign-in links to it",
  (await p.locator('a[href="/admin/forgot-password"]').count()) > 0,
);

// 2 — an address that is NOT registered gets the same answer
const before = linkFromLog();
await p.goto(`${BASE}/admin/forgot-password`);
await p.fill('input[name="email"]', "definitely-not-registered@example.com");
await p.click('button[type="submit"]');
await p.waitForTimeout(1500);
const unknownMsg = await p.locator("text=/reset link is on its way/i").count();
ok("unknown address gets the same 'on its way' message", unknownMsg > 0);
ok("...and no link was actually generated for it", linkFromLog() === before);

// 3 — the real address
await p.goto(`${BASE}/admin/forgot-password`);
await p.fill('input[name="email"]', EMAIL);
await p.click('button[type="submit"]');
await p.waitForTimeout(2500);
const link = linkFromLog();
ok(
  "a reset link is generated for the registered address",
  link !== null && link !== before,
);
if (!link) {
  console.log(`\n  ${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(1);
}

// 4 — a tampered token is refused
const q = await page();
await q.goto(`${BASE}${link.replace(/token=(.{8})/, "token=AAAAAAAA")}`);
ok(
  "a tampered token shows the expired screen",
  (await q.locator("text=/link has expired/i").count()) > 0,
);

// 5 — too-short password is refused by the SERVER, and does not burn the link
await p.goto(`${BASE}${link}`);
await p.waitForSelector('input[name="password"]');
await p.evaluate(() =>
  document.querySelector('input[name="password"]').removeAttribute("minlength"),
);
await p.fill('input[name="password"]', "short1");
await p.fill('input[name="confirm"]', "short1");
await p.click('button[type="submit"]');
await p.waitForTimeout(1500);
ok(
  "server refuses a short password on reset",
  (await p.locator('p[role="alert"]').count()) > 0,
);

await p.goto(`${BASE}${link}`);
ok(
  "...and the link still works afterwards (not burned by a failed attempt)",
  (await p.locator('input[name="password"]').count()) > 0,
);

// 6 — mismatch refused
await p.fill('input[name="password"]', NEWPW);
await p.fill('input[name="confirm"]', NEWPW + "x");
await p.click('button[type="submit"]');
await p.waitForTimeout(1500);
ok(
  "mismatched confirmation is refused",
  (await p.locator('p[role="alert"]').count()) > 0,
);

// 7 — the real reset
await p.goto(`${BASE}${link}`);
await p.waitForSelector('input[name="password"]');
await p.fill('input[name="password"]', NEWPW);
await p.fill('input[name="confirm"]', NEWPW);
await p.click('button[type="submit"]');
await p
  .waitForURL((u) => new URL(u).pathname === "/admin", { timeout: 30000 })
  .catch(() => {});
ok("a valid reset signs you straight in", path(p) === "/admin", path(p));

// 8 — single use
const r = await page();
await r.goto(`${BASE}${link}`);
ok(
  "the link cannot be used twice",
  (await r.locator("text=/link has expired/i").count()) > 0,
);

// 9 — the new password works at the normal sign-in
const s = await page();
await s.goto(`${BASE}/admin/login`);
await s.fill('input[name="username"]', "nagrom.1990@gmail.com");
await s.fill('input[name="password"]', NEWPW);
await s.click('button[type="submit"]');
await s.waitForTimeout(2500);
ok("the new password works at sign-in", path(s) === "/admin", path(s));

// 10 — the other account is untouched
const t = await page();
await t.goto(`${BASE}/admin/login`);
await t.fill('input[name="username"]', "mariannevwillis");
await t.fill('input[name="password"]', NEWPW);
await t.click('button[type="submit"]');
await t.waitForTimeout(2000);
ok(
  "the reset did NOT change the other account's password",
  path(t) === "/admin/login",
);

await b.close();
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
