// The absent-key path, in a real browser: with no GETADDRESS_API_KEY the form
// offers nothing, says nothing, and the four address fields work as they
// always have — including a save that reaches the database.
//   node _address-nokey-smoke.mjs http://localhost:3000
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
let pass = 0,
  fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${detail}`);
  }
};
const eq = (name, got, want) =>
  ok(
    name,
    got === want,
    `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`,
  );

const browser = await chromium.launch();
const page = await browser.newPage();

// Anything that leaves for getAddress with no key is a bug; nothing should.
const outbound = [];
page.on("request", (r) => {
  if (r.url().includes("getaddress")) outbound.push(r.url());
});

await page.goto(`${BASE}/admin/login`);
await page.fill('input[name="username"]', "marianne@thefieldwork.co.uk");
await page.fill('input[type="password"]', "clearing-lamp-quiet-hour");
await page.click('button[type="submit"]');
await page.waitForURL((u) => u.pathname === "/admin", { timeout: 20000 });

await page.goto(`${BASE}/admin/offerings/workshops/new`);
const NAME = 'input[name="venueName"]';
await page.waitForSelector(NAME);

console.log("\n== with no key, nothing is offered");
const field = page.locator(NAME);
eq(
  "the name field is a plain field, not a combobox",
  await field.getAttribute("role"),
  null,
);
eq("no aria-expanded", await field.getAttribute("aria-expanded"), null);
eq("no aria-autocomplete", await field.getAttribute("aria-autocomplete"), null);

const where = page.locator('section[aria-labelledby="where-h"]');
const text = await where.textContent();
ok(
  "no line about typing an address",
  !text.includes("the real addresses are offered"),
);
ok("no leftover Find button", !text.includes("Find the address"));
ok("nothing says a lookup failed", !text.includes("Could not look that up"));

console.log("\n== and typing simply types");
await page.fill(NAME, "The Long Barn");
await page.waitForTimeout(1600);
eq("no list appears", await page.locator('[role="option"]').count(), 0);
eq("what she typed stays put", await field.inputValue(), "The Long Barn");
eq("nothing was asked of getAddress", outbound.length, 0);

console.log("\n== the four fields work exactly as they always have");
await page.fill('[name="addressLines"]', "Wanstrow\nSomerset");
await page.fill('[name="postcode"]', "BA4 4TE");
await page.fill('[name="gettingThere"]', "Step-free from the yard.");
const v = await page.evaluate(() => {
  const g = (n) => document.querySelector(`[name="${n}"]`).value;
  return { a: g("addressLines"), p: g("postcode"), t: g("gettingThere") };
});
eq("lines", v.a, "Wanstrow\nSomerset");
eq("postcode", v.p, "BA4 4TE");
eq("getting there", v.t, "Step-free from the yard.");

console.log("\n== the saved-venue picker still fills all four");
await page
  .getByRole("button", { name: "The Garden Room", exact: true })
  .click();
await page.waitForTimeout(400);
const filled = await page.evaluate(() => {
  const g = (n) => document.querySelector(`[name="${n}"]`).value;
  return {
    n: g("venueName"),
    a: g("addressLines"),
    p: g("postcode"),
    t: g("gettingThere"),
  };
});
eq("name", filled.n, "The Garden Room");
eq("lines", filled.a, "Fromefield\nFrome\nSomerset");
eq("postcode", filled.p, "BA11 2QN");
ok("getting there", filled.t.includes("step-free"));

console.log("\n== and a workshop still saves");
const slug = `no-key-smoke-${Date.now()}`;
await page.fill('[name="name"]', "No-key smoke workshop");
await page.fill(
  '[name="summary"]',
  "Written while the address lookup was switched off.",
);
await page.fill('[name="slug"]', slug);
await page.fill('[name="date"]', "2026-11-14");
await page.fill('[name="startTime"]', "10:00");
await page.fill('[name="price"]', "95");
await page.getByRole("button", { name: "Save this workshop" }).click();
await page.waitForURL((u) => u.pathname.includes(slug), { timeout: 25000 });
ok("it saved and landed on its own page", page.url().includes(slug));
const saved = await page.locator('[name="postcode"]').inputValue();
eq("with the address it was given", saved, "BA11 2QN");
eq("still nothing asked of getAddress", outbound.length, 0);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
