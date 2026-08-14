// =============================================================================
// Workshops — the loop, end to end
// =============================================================================
//
// One claim, exercised: she creates a workshop in the portal and it appears on
// the site. Everything else here is a thing that had to be true on the way —
// the address derived from the name, a rejected form losing nothing, the
// refund date worked out from the day, her angle brackets arriving as words
// rather than markup, the photograph modal not writing the URL, an unpublished
// workshop answering 404, and delete actually deleting.
//
// It is a sibling of auth-smoke.mjs and runs the same way.
//
// HOW TO RUN
//
//   1. A database, and a dev server:  cd app && npm run dev
//   2. Sign in once by hand and set a password (the first sign-in forces it).
//   3. node e2e/workshops-smoke.mjs http://localhost:3000 <password>
//
// It CREATES and then DELETES a workshop called "Reading the Field". If it
// fails part way through, that workshop is left behind — delete it in
// Offerings before running again, or the slug clashes.
//
// Requires playwright (`npm i -D playwright`); it is not a dependency of the
// app itself.
// =============================================================================

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASS_WORD = process.argv[3];
const USER = process.env.ADMIN_USERNAME ?? "marianne@thefieldwork.co.uk";

if (!PASS_WORD) {
  console.error("Usage: node e2e/workshops-smoke.mjs <base-url> <password>");
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
const page = await (await browser.newContext()).newPage();
const noise = [];
page.on("pageerror", (e) => noise.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") noise.push(m.text());
});

const path = () => new URL(page.url()).pathname;
const theForm = () =>
  page.locator("form").filter({ has: page.locator('[name="name"]') });

// ── sign in ──────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/login`);
await page.fill('input[name="username"]', USER);
await page.fill('input[name="password"]', PASS_WORD);
await page.click('form button[type="submit"]');
await page.waitForURL(/\/admin$/, { timeout: 15000 });
ok("signs in", path() === "/admin");

// ── create ───────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/offerings/workshops/new`);
const form = theForm();

await form.locator('[name="name"]').fill("Reading the Field");
ok(
  "the address is derived from the name",
  (await form.locator('[name="slug"]').inputValue()) === "reading-the-field",
  await form.locator('[name="slug"]').inputValue(),
);

await form
  .locator('select[name="heroImage"]')
  .selectOption("marianne-room-aglow");
await form
  .locator('[name="heroAlt"]')
  .fill("The Garden Room at dusk, lamps lit, chairs drawn into a circle.");
await form
  .locator('[name="summary"]')
  .fill(
    "A day of learning to notice what you already notice. You stay clothed and seated, and nobody touches you.",
  );
await form.locator('[name="date"]').fill("2026-09-19");
await form.locator('[name="startTime"]').fill("10:00");
await form.locator('[name="endTime"]').fill("16:30");
await form.locator('[name="price"]').fill("95");
await form.locator('[name="capacity"]').fill("10");
await form.locator('[name="venueName"]').fill("The Garden Room");
await form.locator('[name="addressLines"]').fill("Fromefield\nFrome\nSomerset");
await form.locator('[name="postcode"]').fill("ba11 2qn");
await form
  .locator('[name="gettingThere"]')
  .fill(
    "The room is on the ground floor, and it is step-free from the pavement to the chair you sit in.\nThere is an accessible toilet on the same floor.\nThere is parking on Fromefield, two minutes' walk away.",
  );
await form.locator('[name="body"]').fill(
  `## What the day is

You arrive at ten. There is coffee, a circle of ten chairs, and nine other people who also did not quite know what to expect.

### What to bring

- Lunch, coffee and tea are included.
- Bring a jumper. The room is warm at eleven and cooler by four.

## Before you come

A short note comes with your confirmation <two pages> & one question to sit with.`,
);
// Pictures are added one at a time, so the rows have to be asked for before
// they can be filled. The first press says "Add a picture" and the rest say
// "Add another picture".
await form.getByRole("button", { name: "Add a picture" }).click();
await form.getByRole("button", { name: "Add another picture" }).click();
await form.getByRole("button", { name: "Add another picture" }).click();

await form
  .locator('select[name="image-url-0"]')
  .selectOption("work-wide-the-room");
await form
  .locator('[name="image-alt-0"]')
  .fill("The full circle of chairs, seen from the doorway.");
await form
  .locator('select[name="image-url-1"]')
  .selectOption("chair-with-her-coat");
await form
  .locator('[name="image-alt-1"]')
  .fill("A wool coat over the back of a wooden chair.");
await form
  .locator('select[name="image-url-2"]')
  .selectOption("window-last-light");
await form
  .locator('[name="image-alt-2"]')
  .fill("A lit lamp on the deep sill of the window, the last blue daylight.");

ok(
  "the refund date is worked out as she types",
  (await page.getByText("Which makes Saturday 5 September").count()) === 1,
);

// ── a rejected form loses nothing ────────────────────────────────────────────
await form.locator('[name="endTime"]').fill("09:30");
await form.locator('button[type="submit"]').click();
await page.waitForTimeout(1200);
ok(
  "an end before its start is refused, in words",
  (await page.getByText("before its 10:00 start").count()) === 1,
);
ok(
  "and the form still holds what was typed",
  (await theForm().locator('[name="summary"]').inputValue()).startsWith(
    "A day",
  ),
);

await theForm().locator('[name="endTime"]').fill("16:30");
await theForm().locator('[name="published"]').check();
await theForm().locator('button[type="submit"]').click();
await page.waitForURL(/\/admin\/offerings\/workshops\/reading-the-field$/, {
  timeout: 20000,
});
ok("saving lands on the workshop's own page", true);
ok(
  "the portal says it is on the site",
  (await page.getByText("On the site").count()) >= 1,
);

// ── the site ─────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/workshops`);
ok(
  "the index lists it",
  (await page.getByRole("heading", { name: "Reading the Field" }).count()) ===
    1,
);
ok("with its price", (await page.getByText("£95").count()) >= 1);

await page.goto(`${BASE}/workshops/reading-the-field`);
ok(
  "the workshop's own page renders",
  path() === "/workshops/reading-the-field",
);
ok(
  "her headings became the page's headings",
  (await page.getByRole("heading", { name: "What to bring" }).count()) === 1,
);
ok(
  "angle brackets in her copy arrive as words, not markup",
  (await page.getByText("<two pages> &").count()) === 1,
);
ok(
  "the refund date is on the page",
  (await page.getByText("Saturday 5 September").count()) === 1,
);
ok(
  "the rail carries three pictures",
  (await page.locator(".rail > li").count()) === 3,
);

await page.locator('button[aria-label="One more place"]').click();
ok(
  "the stepper prices two places",
  (await page.locator("#qty").inputValue()) === "2" &&
    (await page.locator("#book").innerText()).includes("£190"),
);
ok(
  "and the button does not pretend to take money",
  (await page.getByText("You cannot book this online yet.").count()) === 1 &&
    (await page.getByRole("button", { name: /^Book / }).count()) === 0,
);

// ── the photograph modal ─────────────────────────────────────────────────────
await page.locator(".rail > li a.shot").first().click();
await page.waitForTimeout(400);
ok(
  "clicking a photograph opens the dialog",
  (await page.locator("dialog.lb[open]").count()) === 1,
);
ok("and the url is never written", !page.url().includes("#photo"));
ok(
  "previous is drawn as an end at the first picture",
  await page.locator("dialog.lb button", { hasText: "Previous" }).isDisabled(),
);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(250);
ok(
  "arrow keys move through the set",
  // innerText, not textContent: the counter is uppercased by CSS, so what
  // comes back is "2 OF 3". Compared case-insensitively rather than matching
  // the styling, which is not what this test is about.
  (await page.locator("dialog.lb .lb-count").innerText())
    .toLowerCase()
    .startsWith("2 of 3"),
);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
ok("escape closes it", (await page.locator("dialog.lb[open]").count()) === 0);

// ── the home page's dates block ──────────────────────────────────────────────
await page.goto(`${BASE}/`);
ok(
  "the home page's dates block lists it",
  (await page.getByText("Reading the Field").count()) >= 1,
);

// ── taken off the site ───────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/offerings/workshops/reading-the-field`);
await theForm().locator('[name="published"]').uncheck();
await theForm().locator('button[type="submit"]').click();
await page.waitForTimeout(2000);
const gone = await page.goto(`${BASE}/workshops/reading-the-field`);
ok(
  "an unpublished workshop is not found",
  gone.status() === 404,
  String(gone.status()),
);
await page.goto(`${BASE}/workshops`);
ok(
  "and the index draws its empty state instead",
  (await page.getByText("Nothing in the diary just now").count()) === 1,
);

// ── delete ───────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/offerings/workshops/reading-the-field`);
await page.getByRole("button", { name: "Delete this workshop" }).click();
await page.getByRole("button", { name: /^Yes, delete/ }).click();
await page.waitForURL(/\/admin\/offerings$/, { timeout: 20000 });
ok(
  "deleting returns to the list, and the workshop is gone",
  (await page.getByRole("heading", { name: "Reading the Field" }).count()) ===
    0,
);

console.log(`\n  ${pass} passed, ${fail} failed`);
if (noise.length) {
  console.log("  console/page errors:", [...new Set(noise)].slice(0, 8));
}
await browser.close();
process.exit(fail ? 1 : 0);
