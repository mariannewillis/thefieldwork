// =============================================================================
// Services — writing one, end to end
// =============================================================================
//
// One claim, exercised: a service says how long it runs and exactly one thing
// about where it happens, and both come back. Everything else here is
// something that had to be true on the way — no date and no capacity anywhere
// on the sheet, the address derived from the name, the saved place filling the
// address, a travelling service refused until it can say where from and how
// far, a rejected form losing nothing, changing her mind about where it
// happens leaving nothing of the old answer behind, and delete actually
// deleting.
//
// The sibling of workshops-smoke.mjs and courses-smoke.mjs, and it runs the
// same way:
//
//   node e2e/services-smoke.mjs http://localhost:3000 <password>
//
// A session token can stand in for the password when it is not to hand:
//
//   TFW_SESSION=<token> node e2e/services-smoke.mjs http://localhost:3000
//
// It CREATES two services — "A Single Session" and "At Your Own Table" — and
// DELETES both again. If it fails part way through they are left behind;
// delete them in Offerings before running again, or the addresses clash.
//
// THE PICTURE RAIL IS NOT EXERCISED HERE. Adding one means uploading one, and
// nothing in the portal can take a picture back out of the library again — so
// a test that ran the rail would leave a brown rectangle in her media list
// every time it ran. The rail is `collectImages` in lib/offering-form.ts,
// which is the same code the workshop and course forms post to.
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
// =============================================================================

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASS_WORD = process.argv[3];
const TOKEN = process.env.TFW_SESSION;
const USER = process.env.ADMIN_USERNAME ?? "marianne@thefieldwork.co.uk";

if (!PASS_WORD && !TOKEN) {
  console.error("Usage: node e2e/services-smoke.mjs <base-url> <password>");
  process.exit(2);
}

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

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
if (TOKEN) {
  await context.addCookies([
    {
      name: "tfw_session",
      value: TOKEN,
      url: BASE,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
const page = await context.newPage();
const noise = [];
page.on("pageerror", (e) => noise.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") noise.push(m.text());
});

const at = () => new URL(page.url()).pathname + new URL(page.url()).search;
const val = (name) => page.inputValue(`[name="${name}"]`);
const count = (sel) => page.locator(sel).count();
const body = () => page.locator("body").innerText();

/**
 * Press Save and wait for the action to answer.
 *
 * The response, then the redirect — a save that was accepted navigates and one
 * that bounced stays where it is, so the wait for the second is allowed to
 * time out. Watching the URL alone is not enough: an edit page saves back to
 * the address it is already at.
 */
async function save() {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/services"),
      { timeout: 30000 },
    ),
    page.click('form button[type="submit"]:has-text("Save this service")'),
  ]);
  await response.finished();
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page
    .waitForURL((url) => !url.pathname.endsWith("/new"), { timeout: 4000 })
    .catch(() => {});
}

// ── sign in ───────────────────────────────────────────────────────────────
if (!TOKEN) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS_WORD);
  await page.click('form button[type="submit"]');
  await page.waitForURL(/\/admin$/, { timeout: 15000 });
  ok("signs in", at() === "/admin");
}

// ── 1. the Services tab ───────────────────────────────────────────────────
console.log("\nThe Services tab");
await page.goto(`${BASE}/admin/offerings?kind=services`);
ok("the tab is a link that lands", at() === "/admin/offerings?kind=services");
ok(
  "Services is the tab being shown",
  (
    await page
      .locator('nav[aria-label="Kinds of offering"] a[aria-current="page"]')
      .innerText()
  )
    .toLowerCase()
    .includes("services"),
);
ok(
  "it offers to write one",
  (await count('a[href="/admin/offerings/services/new"]')) === 1,
);

// ── 2. one that happens at a venue ────────────────────────────────────────
console.log("\nWriting one that happens at a venue");
await page.goto(`${BASE}/admin/offerings/services/new`);
ok("there is no day to set", (await count('[name="date"]')) === 0);
ok("there is no time to set", (await count('[name="startTime"]')) === 0);
ok("there are no places to fill", (await count('[name="capacity"]')) === 0);
ok("there is no refund window", (await count('[name="refundDays"]')) === 0);

await page.fill('[name="name"]', "A Single Session");
await page.fill(
  '[name="summary"]',
  "An hour and a half, one to one, in the Garden Room.",
);
await page.fill('[name="duration"]', "90");
await page.fill('[name="price"]', "65");

ok(
  "the length is read back in words",
  (await body()).includes("Which the page reads as 1 hour 30 minutes."),
);
ok(
  "the address is made from the name",
  (await val("slug")) === "a-single-session",
);

await page.click('button:has-text("The Garden Room")');
ok("the place fills the name", (await val("venueName")) === "The Garden Room");
ok("the place fills the postcode", (await val("postcode")) === "BA11 2QN");
ok(
  "the place fills the address",
  (await val("addressLines")).includes("Fromefield"),
);
ok(
  "the place fills getting there",
  (await val("gettingThere")).includes("step-free"),
);
ok("the place itself is recorded", (await val("venueId")) === "1");

const BODY =
  "## What happens\n\nWe sit down and begin.\n\n- Nothing is rushed\n- You lead";
await page.fill('[name="body"]', BODY);
await save();
ok(
  "it saves and lands on its own page",
  at() === "/admin/offerings/services/a-single-session",
);

// ── 3. it all comes back ──────────────────────────────────────────────────
console.log("\nReopening it");
await page.goto(`${BASE}/admin/offerings/services/a-single-session`);
ok(
  "the name is the heading",
  (await page.locator("h1#form-h").innerText()) === "A Single Session",
);
const line = await page.locator("h1#form-h + p").innerText();
ok(
  "the line reads length, price and place",
  line.includes("1 hour 30 minutes") &&
    line.includes("£65") &&
    line.includes("The Garden Room"),
  line,
);
ok("the name comes back", (await val("name")) === "A Single Session");
ok(
  "the sentence comes back",
  (await val("summary")) ===
    "An hour and a half, one to one, in the Garden Room.",
);
ok("the length comes back", (await val("duration")) === "90");
ok("the price comes back", (await val("price")) === "65");
ok("the body comes back as she wrote it", (await val("body")) === BODY);
ok("the place comes back", (await val("venueName")) === "The Garden Room");
ok("the postcode comes back", (await val("postcode")) === "BA11 2QN");
ok(
  "the address comes back",
  (await val("addressLines")).includes("Fromefield"),
);
ok(
  "getting there comes back",
  (await val("gettingThere")).includes("accessible toilet"),
);
ok("the place breadcrumb comes back", (await val("venueId")) === "1");
ok(
  "the venue branch is the one chosen",
  await page.isChecked('input[value="venue"]'),
);
ok(
  "the map link is offered on a saved one",
  (await count('a:has-text("Check this address on a map")')) === 1,
);

// ── 4. one she travels for ────────────────────────────────────────────────
console.log("\nWriting one she travels for");
await page.goto(`${BASE}/admin/offerings/services/new`);
await page.fill('[name="name"]', "At Your Own Table");
await page.fill('[name="summary"]', "The same session, in your own kitchen.");
await page.fill('[name="duration"]', "50");
await page.fill('[name="price"]', "80");
await page.check('input[name="location"][value="travels"]');

ok("the venue fields are not drawn", (await count('[name="venueName"]')) === 0);
ok("getting there is not drawn", (await count('[name="gettingThere"]')) === 0);
ok("a base is asked for instead", (await count('[name="basePostcode"]')) === 1);

await page.fill(
  '[name="body"]',
  "## In your own place\n\nWhatever room you use.",
);
await page.fill('[name="travelRadiusMiles"]', "15");
await save();
ok(
  "it refuses a travelling service with nowhere to travel from",
  (await body()).includes("A distance has to be measured from somewhere"),
);
ok("nothing is lost — the length", (await val("duration")) === "50");
ok("nothing is lost — the distance", (await val("travelRadiusMiles")) === "15");
ok(
  "nothing is lost — the branch",
  await page.isChecked('input[value="travels"]'),
);

await page.fill('[name="basePostcode"]', "ba11 1aa");
await page.fill('[name="baseAddressLines"]', "The Studio\nFrome");
await page.fill(
  '[name="travelNote"]',
  "Within fifteen miles there is nothing to pay. Further than that, write and ask.",
);
await save();
ok("it saves", at() === "/admin/offerings/services/at-your-own-table");

await page.goto(`${BASE}/admin/offerings/services/at-your-own-table`);
ok("the branch persists", await page.isChecked('input[value="travels"]'));
ok(
  "the base postcode comes back, tidied",
  (await val("basePostcode")) === "BA11 1AA",
);
ok("the distance comes back", (await val("travelRadiusMiles")) === "15");
ok(
  "the travel note comes back as she wrote it",
  (await val("travelNote")).startsWith("Within fifteen miles"),
);
ok(
  "the base address comes back",
  (await val("baseAddressLines")) === "The Studio\nFrome",
);
ok("the length comes back", (await val("duration")) === "50");
ok("no venue fields are drawn", (await count('[name="venueName"]')) === 0);
const travelLine = await page.locator("h1#form-h + p").innerText();
ok(
  "the line says how far she goes",
  travelLine.includes("50 minutes") && travelLine.includes("Travels 15 miles"),
  travelLine,
);

// ── 5. changing her mind leaves nothing behind ────────────────────────────
console.log("\nChanging her mind about where it happens");
await page.goto(`${BASE}/admin/offerings/services/a-single-session`);
await page.check('input[name="location"][value="travels"]');
await page.fill('[name="basePostcode"]', "BA11 3BB");
await page.fill('[name="travelRadiusMiles"]', "8");
await page.fill('[name="travelNote"]', "No charge inside Frome.");
await save();
await page.goto(`${BASE}/admin/offerings/services/a-single-session`);
ok("it now travels", await page.isChecked('input[value="travels"]'));
ok(
  "the venue it used to be at is gone from the sheet",
  (await count('[name="venueName"]')) === 0,
);
ok(
  "the line at the top says so too",
  (await page.locator("h1#form-h + p").innerText()).includes("Travels 8 miles"),
);

await page.check('input[name="location"][value="venue"]');
await page.click('button:has-text("The Garden Room")');
await save();
await page.goto(`${BASE}/admin/offerings/services/a-single-session`);
ok(
  "it is back at the Garden Room",
  await page.isChecked('input[value="venue"]'),
);
ok(
  "and the travelling answer is gone",
  (await count('[name="basePostcode"]')) === 0,
);
ok("the length survived both switches", (await val("duration")) === "90");

// ── 6. the list ───────────────────────────────────────────────────────────
console.log("\nThe list");
await page.goto(`${BASE}/admin/offerings?kind=services`);
const list = await body();
ok(
  "both are listed",
  list.includes("A Single Session") && list.includes("At Your Own Table"),
);
ok("the length is the first column", list.includes("1 hour 30 minutes"));
ok(
  "the travelling one says how far and from where",
  list.includes("Travels 15 miles from BA11 1AA"),
);

// Checked before the deletes, because asking for a page that has just been
// deleted logs a 404 on purpose and that is not noise.
ok(
  "no console noise anywhere",
  noise.length === 0,
  noise.slice(0, 3).join(" | "),
);

// ── 7. taking them down ───────────────────────────────────────────────────
console.log("\nTaking them down");
for (const slug of ["a-single-session", "at-your-own-table"]) {
  await page.goto(`${BASE}/admin/offerings/services/${slug}`);
  await page.click('button:has-text("Delete this service")');
  await page.click('button:has-text("Yes, delete")');
  await page.waitForURL(/\/admin\/offerings\?kind=services$/, {
    timeout: 20000,
  });
  const gone = await page.goto(`${BASE}/admin/offerings/services/${slug}`);
  ok(`${slug} is gone`, gone.status() === 404, String(gone.status()));
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
