// =============================================================================
// Admin sign-in — security smoke test
// =============================================================================
//
// Every security claim made about the portal is exercised here. A claim that
// is only reasoned about is not a claim, it is a hope — this file is the
// difference.
//
// It found a real bug on its first run: the change-password form imported a
// constant from the module that does the hashing, which pulled node:crypto
// into the browser bundle. The build reported success and the form silently
// failed to render. Nothing but an end-to-end run would have caught it.
//
// HOW TO RUN
//
//   1. Build:  cd app && npm run build
//   2. Start with a THROWAWAY data dir, so a real password is never touched:
//
//        cd app
//        PORT=3900 //        AUTH_SECRET="any-value-at-least-32-characters-long-xx" //        DATA_DIR=/tmp/tfw-auth-test //        npx next start
//
//   3. From app/, in another terminal:  node e2e/auth-smoke.mjs http://localhost:3900
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself. Wiring this into CI is a follow-up.
//
// NOTE: run it against a FRESH DATA_DIR each time. It changes the password and
// exhausts the rate limiter, so a second run against the same state fails for
// reasons that have nothing to do with the code.
// =============================================================================

import { chromium } from "playwright";

const BASE = process.argv[2];
const USER = "mariannevwillis";
const TEMP = "test1234";
const STRONG = "clearing-lamp-quiet-hour";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};

const b = await chromium.launch();
const fresh = async () => (await b.newContext()).newPage();
const path = (p) => new URL(p.url()).pathname;

// 1 — the door is shut
let p = await fresh();
await p.goto(`${BASE}/admin`);
ok("unauthenticated /admin redirects to sign-in", path(p) === "/admin/login", path(p));

await p.goto(`${BASE}/admin/settings`);
ok("deep admin link also redirects", path(p) === "/admin/login", path(p));
ok("...and remembers where she was going",
   new URL(p.url()).searchParams.get("next") === "/admin/settings");

// 2 — wrong password is refused, and says nothing useful
await p.goto(`${BASE}/admin/login`);
await p.fill('input[name="username"]', USER);
await p.fill('input[name="password"]', "wrongpassword");
await p.click('button[type="submit"]');
await p.waitForSelector('p[role="alert"]');
const msg1 = (await p.locator('p[role="alert"]').innerText()).trim();
ok("wrong password refused", path(p) === "/admin/login");

await p.fill('input[name="username"]', "someoneelse");
await p.fill('input[name="password"]', "wrongpassword");
await p.click('button[type="submit"]');
await p.waitForSelector('p[role="alert"]');
const msg2 = (await p.locator('p[role="alert"]').innerText()).trim();
ok("unknown username gives the SAME message (no user enumeration)",
   msg1 === msg2, `"${msg1}" vs "${msg2}"`);

// 3 — the temporary password gets you to the change screen and no further
await p.goto(`${BASE}/admin/login`);
await p.fill('input[name="username"]', USER);
await p.fill('input[name="password"]', TEMP);
await p.click('button[type="submit"]');
await p.waitForURL("**/admin/change-password");
ok("temporary password forces a change", path(p) === "/admin/change-password");

const oldCookie = (await p.context().cookies()).find(c => c.name === "tfw_session");
ok("session cookie is httpOnly", oldCookie?.httpOnly === true);
ok("session cookie is sameSite Lax", oldCookie?.sameSite === "Lax");

await p.goto(`${BASE}/admin/offerings`);
ok("cannot skip the forced change by navigating", path(p) === "/admin/change-password", path(p));

// 4 — the new password has to be worth something
const tryChange = async (cur, next) => {
  await p.goto(`${BASE}/admin/change-password`);
  await p.waitForSelector('input[name="password"]');
  await p.evaluate(() =>
    document.querySelector('input[name="password"]').removeAttribute("minlength"));
  await p.fill('input[name="current"]', cur);
  await p.fill('input[name="password"]', next);
  await p.fill('input[name="confirm"]', next);
  await p.locator('button[type="submit"]').click();
  await p.waitForTimeout(900);
  return p.locator('p[role="alert"]').count().then(n => n ? p.locator('p[role="alert"]').innerText() : null);
};
// the form has minLength, so bypass it to prove the SERVER rejects it too
await p.goto(`${BASE}/admin/change-password`);
await p.waitForSelector('input[name="password"]');
await p.evaluate(() => document.querySelector('input[name="password"]').removeAttribute("minlength"));
await p.fill('input[name="current"]', TEMP);
await p.fill('input[name="password"]', "short1");
await p.fill('input[name="confirm"]', "short1");
await p.locator('button[type="submit"]').click();
await p.waitForTimeout(900);
ok("server rejects a short password even with client validation stripped",
   path(p) === "/admin/change-password" && await p.locator('p[role="alert"]').count() > 0);

ok("the temporary password cannot be kept as the new one",
   (await tryChange(TEMP, TEMP))?.length > 0);
ok("wrong current password is rejected",
   (await tryChange("notthepassword", STRONG))?.length > 0);

// 5 — a real change works, and revokes what came before
await tryChange(TEMP, STRONG);
await p.waitForURL(url => new URL(url).pathname === "/admin", { timeout: 8000 }).catch(() => {});
ok("valid change lands in the portal", path(p) === "/admin", path(p));
ok("portal renders the signed-in user",
   (await p.locator("text=Signed in as").count()) > 0);

const q = await b.newContext();
await q.addCookies([oldCookie]);
const qp = await q.newPage();
await qp.goto(`${BASE}/admin`);
ok("session issued BEFORE the change is revoked", path(qp) === "/admin/login", path(qp));

// 6 — forged tokens
const t = await b.newContext();
await t.addCookies([{ ...oldCookie, value: oldCookie.value.split(".")[0] + ".AAAAtampered" }]);
const tp = await t.newPage();
await tp.goto(`${BASE}/admin`);
ok("tampered signature is refused", path(tp) === "/admin/login", path(tp));

// 7 — old password dead, new password live, sign out works
await p.goto(`${BASE}/admin`);
await p.locator('button[type="submit"]:has-text("Sign out")').click();
await p.waitForURL("**/admin/login");
ok("sign out returns to the sign-in page", path(p) === "/admin/login");
await p.goto(`${BASE}/admin`);
ok("...and the portal is shut again", path(p) === "/admin/login");

const signIn = async (pw) => {
  await p.goto(`${BASE}/admin/login`);
  await p.fill('input[name="username"]', USER);
  await p.fill('input[name="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1200);
  return path(p);
};
ok("the temporary password no longer works", (await signIn(TEMP)) === "/admin/login");
ok("the new password works", (await signIn(STRONG)) === "/admin");

// 8 — open redirect
await p.goto(`${BASE}/admin/login?next=https://evil.example/steal`);
await p.fill('input[name="username"]', USER);
await p.fill('input[name="password"]', STRONG);
await p.click('button[type="submit"]');
await p.waitForTimeout(1200);
ok("cannot be redirected off-site after sign-in",
   new URL(p.url()).host === new URL(BASE).host, p.url());

// 9 — brute force
const r = await fresh();
let locked = null;
for (let i = 0; i < 9; i++) {
  await r.goto(`${BASE}/admin/login`);
  await r.fill('input[name="username"]', USER);
  await r.fill('input[name="password"]', `guess-${i}`);
  await r.click('button[type="submit"]');
  await r.waitForSelector('p[role="alert"]');
  const m = await r.locator('p[role="alert"]').innerText();
  if (/too many/i.test(m)) { locked = { attempt: i + 1, m: m.trim() }; break; }
}
ok("repeated guessing gets locked out", locked !== null,
   locked ? "" : "9 wrong passwords accepted without a lockout");
if (locked) console.log(`        locked after ${locked.attempt} attempts: "${locked.m}"`);

await b.close();
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
