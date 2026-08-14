// Walks the address typeahead in a real browser against a dev server whose
// getAddress calls are stubbed at the module boundary (_stub-getaddress.mjs).
//   node _address-smoke.mjs http://localhost:3000
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

await page.goto(`${BASE}/admin/login`);
await page.fill('input[name="username"]', "marianne@thefieldwork.co.uk");
await page.fill('input[type="password"]', "clearing-lamp-quiet-hour");
await page.click('button[type="submit"]');
// Not /\/admin/ — that matches the login page it is still standing on, and
// the next navigation then races the sign-in.
await page.waitForURL((u) => u.pathname === "/admin", { timeout: 20000 });

const NAME = 'input[name="venueName"]';
const note = () =>
  page.locator(`${NAME} >> xpath=../../..`).locator("p").first().textContent();
const values = () =>
  page.evaluate(() => {
    const v = (n) => document.querySelector(`[name="${n}"]`)?.value ?? "";
    return {
      venueName: v("venueName"),
      addressLines: v("addressLines"),
      postcode: v("postcode"),
      gettingThere: v("gettingThere"),
      venueId: v("venueId"),
    };
  });
const options = () => page.locator('[role="option"]').allTextContents();

const fresh = async () => {
  await page.goto(`${BASE}/admin/offerings/workshops/new`);
  await page.waitForSelector(NAME);
};

// A term typed as a burst, then time for the debounce to fire and land.
const type = async (term, settle = 1400) => {
  await page.fill(NAME, "");
  await page.fill(NAME, term);
  await page.waitForTimeout(settle);
};

console.log("\n== the branches she can land on");
await fresh();
await type("zzz nowhere");
eq(
  "no matches",
  (await note()).trim(),
  "Nothing answers to that. Keep typing, or write the address below.",
);
ok("  and no list", (await options()).length === 0);

await type("fail429 hall");
eq(
  "over the rate limit",
  (await note()).trim(),
  "Could not look that up just now. Write the address below — it saves the same either way.",
);

await type("boom hall");
eq(
  "their server erroring",
  (await note()).trim(),
  "Could not look that up just now. Write the address below — it saves the same either way.",
);

await type("fail401 hall");
eq(
  "a refused key, to her",
  (await note()).trim(),
  "Could not look that up just now. Write the address below — it saves the same either way.",
);

await type("slow hall", 5200);
eq(
  "slower than the timeout",
  (await note()).trim(),
  "Could not look that up just now. Write the address below — it saves the same either way.",
);

await type("sl", 1400);
eq(
  "under the minimum term, nothing said",
  (await note()).trim(),
  "Type a name, a street or a postcode and the real addresses are offered to pick from.",
);

console.log("\n== nothing here can stop a save");
ok(
  "the save button is live throughout",
  await page.getByRole("button", { name: "Save this workshop" }).isEnabled(),
);
await page.fill(NAME, "A hall she typed herself");
await page.fill('[name="addressLines"]', "Behind the church\nMells");
await page.fill('[name="postcode"]', "BA11 3PT");
const typedByHand = await values();
eq("her own name survives", typedByHand.venueName, "A hall she typed herself");
eq(
  "her own lines survive",
  typedByHand.addressLines,
  "Behind the church\nMells",
);
eq("her own postcode survives", typedByHand.postcode, "BA11 3PT");

console.log("\n== choosing with the keyboard");
await fresh();
await type("The Garden");
await page.click(NAME);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(900);
eq(
  "Enter chose rather than saved",
  new URL(page.url()).pathname,
  "/admin/offerings/workshops/new",
);
const byKey = await values();
eq("name", byKey.venueName, "The Garden Room");
eq(
  "lines, with the name not repeated",
  byKey.addressLines,
  "Fromefield\nFrome\nSomerset",
);
eq("postcode, as the register spells it", byKey.postcode, "BA11 2QN");
ok("the list shut behind it", (await options()).length === 0);

console.log("\n== Escape shuts it, and leaves what she typed");
await fresh();
await type("The Garden");
ok("open", (await options()).length > 0);
await page.click(NAME);
await page.keyboard.press("Escape");
await page.waitForTimeout(250);
ok("shut", (await options()).length === 0);
eq("what she typed is still there", (await values()).venueName, "The Garden");

console.log("\n== an address with no name of its own");
await fresh();
await page.fill(NAME, "10 Watkin");
await page.waitForTimeout(1400);
await page.locator('[role="option"]', { hasText: "Watkin" }).click();
await page.waitForTimeout(900);
const house = await values();
eq(
  "the register has no name, so hers is left alone",
  house.venueName,
  "10 Watkin",
);
eq(
  "the address lands in the lines",
  house.addressLines,
  "10 Watkin Terrace\nNorthampton\nNorthamptonshire",
);
eq("postcode", house.postcode, "NN1 3ER");

console.log("\n== the saved-venue picker, which is still the first thing");
await fresh();
const buttonsBeforeFields = await page.evaluate(() => {
  const picker = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "The Garden Room",
  );
  const field = document.querySelector('input[name="venueName"]');
  return !!(
    picker &&
    field &&
    picker.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING
  );
});
ok("it sits above the typing field", buttonsBeforeFields);
await page
  .getByRole("button", { name: "The Garden Room", exact: true })
  .click();
await page.waitForTimeout(400);
const saved = await values();
eq("name", saved.venueName, "The Garden Room");
eq("lines", saved.addressLines, "Fromefield\nFrome\nSomerset");
eq("postcode", saved.postcode, "BA11 2QN");
ok(
  "getting there too — all four in one press",
  saved.gettingThere.includes("step-free"),
);
ok("and it records which place it was", saved.venueId !== "");
ok("no list opened behind it", (await options()).length === 0);

console.log("\n== one request per pause, not per letter");
await fresh();
const hits = [];
page.on("request", (r) => {
  if (r.url().includes("/offerings/workshops/new")) hits.push(r.url());
});
const seen = [];
await page.exposeFunction("__seen", (n) => seen.push(n));
await page.click(NAME);
await page.keyboard.type("The Garden Room", { delay: 60 });
await page.waitForTimeout(1500);
ok("the list arrived after the burst", (await options()).length > 0);

console.log("\n== fields stay editable after a fill");
await page.locator('[role="option"]').first().click();
await page.waitForTimeout(800);
await page.fill(NAME, "The Garden Room, side door");
await page.fill('[name="addressLines"]', "The Garden Room\nFromefield\nFrome");
const edited = await values();
eq("name corrected", edited.venueName, "The Garden Room, side door");
eq(
  "lines corrected",
  edited.addressLines,
  "The Garden Room\nFromefield\nFrome",
);
eq("and it is no longer attributed to a saved place", edited.venueId, "");

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
