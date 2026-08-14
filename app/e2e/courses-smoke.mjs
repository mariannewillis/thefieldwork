// =============================================================================
// Courses — writing one, end to end
// =============================================================================
//
// One claim, exercised: she writes a course with a run of dates and every one
// of them comes back. Everything else here is something that had to be true on
// the way — the address derived from the name, the saved place filling the
// address, the run reading back from the dates, dates entered out of order
// landing in date order anyway, a date with no name stopping it going live, a
// rejected form losing nothing, taking one date off taking only that one, and
// delete actually deleting.
//
// The sibling of workshops-smoke.mjs, and it runs the same way:
//
//   node e2e/courses-smoke.mjs http://localhost:3000 <password>
//
// A session token can stand in for the password when it is not to hand:
//
//   TFW_SESSION=<token> node e2e/courses-smoke.mjs http://localhost:3000
//
// It CREATES a course called "Attention, Week by Week" and DELETES it again.
// If it fails part way through, that course is left behind — delete it in
// Offerings before running again, or the address clashes.
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
  console.error("Usage: node e2e/courses-smoke.mjs <base-url> <password>");
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

const path = () => new URL(page.url()).pathname + new URL(page.url()).search;
const val = (name) => page.inputValue(`[name="${name}"]`);

// ── sign in ───────────────────────────────────────────────────────────────
if (!TOKEN) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS_WORD);
  await page.click('form button[type="submit"]');
  await page.waitForURL(/\/admin$/, { timeout: 15000 });
  ok("signs in", path() === "/admin");
}

// ── 1. the courses tab ────────────────────────────────────────────────────
console.log("\nThe Courses tab");
await page.goto(`${BASE}/admin/offerings?kind=courses`);
ok("reachable", path() === "/admin/offerings?kind=courses", path());
ok(
  "the tab is current",
  (await page.getAttribute('a[href="/admin/offerings?kind=courses"]', "aria-current")) === "page",
);
ok(
  "and it offers a new course",
  await page.getByRole("link", { name: "Write a new course" }).isVisible(),
);

// ── 2. writing one ────────────────────────────────────────────────────────
console.log("\nWriting a course");
await page.goto(`${BASE}/admin/offerings/courses/new`);
ok("the form opens", await page.locator('[name="name"]').isVisible());

await page.fill('[name="name"]', "Attention, Week by Week");
ok(
  "the address is offered from the name",
  (await val("slug")) === "attention-week-by-week",
  await val("slug"),
);

await page.fill(
  '[name="summary"]',
  "Six evenings on noticing, in the Garden Room.",
);
await page.fill(
  '[name="body"]',
  "## What this is\n\nA run of evenings on attention.\n\n- Bring nothing\n- Wear what you like",
);
await page.fill('[name="price"]', "240");
await page.fill('[name="deposit"]', "60");
await page.fill('[name="capacity"]', "8");
await page.fill('[name="refundDays"]', "14");

// The saved place fills the four address fields in one press.
await page.getByRole("button", { name: "The Garden Room" }).click();
ok("the place fills the address", (await val("postcode")) === "BA11 2QN");

// A picture, chosen from what is already on the site.
const options = await page.$$eval('select[name="heroImage"] option', (list) =>
  list.map((o) => o.value).filter(Boolean),
);
await page.selectOption('select[name="heroImage"]', options[0]);
await page.fill('[name="heroAlt"]', "The Garden Room at dusk, chairs in a circle");

// ── 3. three dates, entered out of order ──────────────────────────────────
const dates = [
  {
    title: "The third evening",
    date: "2026-11-04",
    start: "19:00",
    end: "21:00",
    venue: "The Garden Room",
    description: "Worked slowly from the head down.",
  },
  {
    title: "The first evening",
    date: "2026-10-21",
    start: "19:00",
    end: "21:00",
    venue: "The Garden Room",
    description: "Introductions, then two hours on attention.",
  },
  {
    title: "The second evening",
    date: "2026-10-28",
    start: "19:00",
    end: "21:30",
    venue: "Rook Lane Chapel",
    description: "Both turns, twenty minutes each way.",
  },
];

for (const [index, one] of dates.entries()) {
  await page
    .getByRole("button", { name: index === 0 ? "Add the first date" : "Add a date" })
    .click();
  await page.fill(`[name="run-${index}-title"]`, one.title);
  await page.fill(`[name="run-${index}-date"]`, one.date);
  await page.fill(`[name="run-${index}-start"]`, one.start);
  await page.fill(`[name="run-${index}-end"]`, one.end);
  await page.fill(`[name="run-${index}-venue"]`, one.venue);
  await page.fill(`[name="run-${index}-description"]`, one.description);
}

ok(
  "a new date is offered the course's own place",
  (await page.inputValue('[name="run-0-venue"]')) === "The Garden Room",
);

// The run reads back from the dates, in date order, while she is still typing.
const runLine = await page
  .locator("h2#facts-h")
  .locator("xpath=../..")
  .locator("text=/3 dates/")
  .first()
  .textContent();
ok(
  "the run reads back in date order",
  /3 dates · Wed 21 Oct – Wed 4 Nov/.test(runLine ?? ""),
  runLine ?? "",
);

const marks = await page.$$eval("ul li p.fig", (list) =>
  list.map((p) => p.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean),
);
ok(
  "the third-entered date is marked 3 of 3",
  marks.some((m) => m?.startsWith("3 of 3") && m.includes("Wed 4 Nov")),
  JSON.stringify(marks),
);
ok(
  "the second-entered date is marked 1 of 3",
  marks.some((m) => m?.startsWith("1 of 3") && m.includes("Wed 21 Oct")),
  JSON.stringify(marks),
);

// ── 4. saving ─────────────────────────────────────────────────────────────
await page.getByRole("button", { name: "Save this course" }).click();
await page
  .waitForURL(/\/admin\/offerings\/courses\/attention-week-by-week/, {
    timeout: 15000,
  })
  .catch(async () => {
    console.log(
      "  bounced:",
      JSON.stringify(
        await page.$$eval('[role="alert"]', (l) =>
          l.map((e) => e.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean),
        ),
      ),
    );
  });
ok("it saves and opens", path() === "/admin/offerings/courses/attention-week-by-week");

// ── 5. everything comes back ──────────────────────────────────────────────
console.log("\nReopening it");
ok("the name", (await val("name")) === "Attention, Week by Week");
ok(
  "the sentence underneath",
  (await val("summary")) === "Six evenings on noticing, in the Garden Room.",
);
ok("the price", (await val("price")) === "240");
ok("the deposit", (await val("deposit")) === "60");
ok("the places", (await val("capacity")) === "8");
ok("the refund window", (await val("refundDays")) === "14");
ok("the place", (await val("venueName")) === "The Garden Room");
ok("the postcode", (await val("postcode")) === "BA11 2QN");
ok(
  "the long body, as she typed it",
  (await val("body")).startsWith("## What this is"),
  await val("body"),
);
ok("the picture", (await val("heroImage")) === options[0]);
ok(
  "what is in the picture",
  (await val("heroAlt")) === "The Garden Room at dusk, chairs in a circle",
);

const inDateOrder = [
  { date: "2026-10-21", title: "The first evening", venue: "The Garden Room", end: "21:00" },
  { date: "2026-10-28", title: "The second evening", venue: "Rook Lane Chapel", end: "21:30" },
  { date: "2026-11-04", title: "The third evening", venue: "The Garden Room", end: "21:00" },
];
for (const [index, one] of inDateOrder.entries()) {
  ok(
    `date ${index + 1} is ${one.date}`,
    (await page.inputValue(`[name="run-${index}-date"]`)) === one.date,
    await page.inputValue(`[name="run-${index}-date"]`),
  );
  ok(
    `date ${index + 1} kept its name`,
    (await page.inputValue(`[name="run-${index}-title"]`)) === one.title,
  );
  ok(
    `date ${index + 1} kept its room`,
    (await page.inputValue(`[name="run-${index}-venue"]`)) === one.venue,
  );
  ok(
    `date ${index + 1} kept its finish`,
    (await page.inputValue(`[name="run-${index}-end"]`)) === one.end,
  );
}
ok(
  "and its paragraph",
  (await page.inputValue('[name="run-1-description"]')) ===
    "Both turns, twenty minutes each way.",
);
ok(
  "the last day to cancel is counted from the first date",
  (await page.locator("text=/last day to cancel/").first().textContent())?.includes(
    "Wednesday 7 October",
  ),
  await page.locator("text=/last day to cancel/").first().textContent(),
);

// ── 6. publishing needs a name on every date ──────────────────────────────
console.log("\nThe publish gate");
await page.fill('[name="run-1-title"]', "");
await page.check('[name="published"]');
await page.getByRole("button", { name: "Save this course" }).click();
await page.waitForSelector("text=/needs another look/", { timeout: 15000 });
ok(
  "a date with no name stops it going live",
  path() === "/admin/offerings/courses/attention-week-by-week",
  path(),
);
ok(
  "and the fault is drawn beside that date",
  await page
    .locator('[name="run-1-title"]')
    .locator("xpath=ancestor::li")
    .locator('[role="alert"]')
    .first()
    .isVisible(),
);
ok(
  "nothing was lost",
  (await page.inputValue('[name="run-2-description"]')) ===
    "Worked slowly from the head down.",
  await page.inputValue('[name="run-2-description"]'),
);

// ── 7. taking one date off ────────────────────────────────────────────────
console.log("\nTaking one date off");
await page.fill('[name="run-1-title"]', "The second evening");
await page.uncheck('[name="published"]');
await page
  .locator('[name="run-1-title"]')
  .locator("xpath=ancestor::li")
  .getByRole("button", { name: "Take this date off" })
  .click();
ok(
  "the row goes",
  (await page.locator('[name^="run-"][name$="-date"]').count()) === 2,
);
await page.getByRole("button", { name: "Save this course" }).click();
await page.waitForTimeout(1500);
await page.reload();

const remaining = await page.$$eval('[name^="run-"][name$="-date"]', (list) =>
  list.map((i) => i.value),
);
ok(
  "only that one went, and the rest are still in date order",
  JSON.stringify(remaining) === JSON.stringify(["2026-10-21", "2026-11-04"]),
  JSON.stringify(remaining),
);

// ── 8. the list ───────────────────────────────────────────────────────────
console.log("\nThe list");
await page.goto(`${BASE}/admin/offerings?kind=courses`);
const row = page.locator('a[href="/admin/offerings/courses/attention-week-by-week"]');
ok("the course is listed", await row.isVisible());
const rowText = (await row.textContent())?.replace(/\s+/g, " ") ?? "";
ok("with its run", /Wed 21 Oct.*to Wed 4 Nov/.test(rowText), rowText);
ok("and its price", rowText.includes("£240"), rowText);

// ── 9. taking it down ─────────────────────────────────────────────────────
console.log("\nDeleting it");
await page.goto(`${BASE}/admin/offerings/courses/attention-week-by-week`);
await page.getByRole("button", { name: "Delete this course" }).click();
await page
  .getByRole("button", { name: "Yes, delete Attention, Week by Week" })
  .click();
await page.waitForURL(/\/admin\/offerings\?kind=courses$/, { timeout: 15000 });
ok("it goes", !(await page.locator('a[href*="attention-week-by-week"]').count()));
await page.goto(`${BASE}/admin/offerings/courses/attention-week-by-week`);
ok(
  "and its page is gone with it",
  (await page.locator("text=/404|not be found|This page could not/i").count()) > 0,
  await page.title(),
);

console.log(`\n  ${pass} passed, ${fail} failed`);
if (noise.length) console.log("  console noise:", noise.slice(0, 5));
await browser.close();
process.exit(fail ? 1 : 0);
