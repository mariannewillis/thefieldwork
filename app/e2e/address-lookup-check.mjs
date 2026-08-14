/**
 * Exercises the REAL src/lib/addresses.ts with the network stubbed at the
 * module boundary (globalThis.fetch). The source is transpiled as-is; only the
 * `import "server-only"` line is dropped, because that package deliberately
 * throws outside a server component graph.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const APP = path.join(
  path.dirname(new URL(import.meta.url).pathname.slice(1)),
  "..",
);
const require = createRequire(path.join(APP, "package.json"));
const ts = require("typescript");

const build = (rel, tweak = (s) => s) => {
  const js = ts.transpileModule(
    tweak(fs.readFileSync(path.join(APP, rel), "utf8")),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const to = path.join(
    APP,
    "e2e",
    "_" + path.basename(rel, ".ts") + ".built.mjs",
  );
  fs.writeFileSync(to, js);
  return to;
};

// The rule the form and the lookup share travels with it, so the minimum term
// length under test is the one the app actually ships.
const rules = build("src/lib/workshop-rules.ts");
const out = build("src/lib/addresses.ts", (s) =>
  s
    .replace(/^import "server-only";$/m, "")
    .replace(
      '"@/lib/workshop-rules"',
      JSON.stringify("./" + path.basename(rules)),
    ),
);
const mod = await import(pathToFileURL(out).href + "?v=" + Date.now());
const shared = await import(pathToFileURL(rules).href + "?v=" + Date.now());

// ── the stub ───────────────────────────────────────────────────────────────
let calls = [];
let handler = null;
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return handler(String(url), init);
};

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });

// ── the documented payloads, copied from documentation.getaddress.io ───────
const AUTOCOMPLETE = {
  suggestions: [
    {
      address:
        "Westminster Gallery, Westminster Central Hall, Westminster, London",
      url: "/get/NDg5YmQ5NzY5Zjk0YmI5IDUxMTQ3MTI1",
      id: "NDg5YmQ5NzY5Zjk0YmI5IDUxMTQ3MTI1",
    },
    {
      address:
        "Westminster School Lawrence Hall, Greycoat Street, Westminster, London",
      url: "/get/MDZlNWYxYTUyMDA0NDUyIDUxMDY1ODM0",
      id: "MDZlNWYxYTUyMDA0NDUyIDUxMDY1ODM0",
    },
  ],
};
const GET_HOUSE = {
  postcode: "NN1 3ER",
  latitude: 52.245,
  longitude: -0.891,
  formatted_address: [
    "10 Watkin Terrace",
    "",
    "",
    "Northampton",
    "Northamptonshire",
  ],
  thoroughfare: "Watkin Terrace",
  building_name: "",
  sub_building_name: "",
  sub_building_number: "",
  building_number: "10",
  line_1: "10 Watkin Terrace",
  line_2: "",
  line_3: "",
  line_4: "",
  locality: "",
  town_or_city: "Northampton",
  county: "Northamptonshire",
  district: "Northampton",
  country: "England",
  residential: true,
};
const GET_NAMED = {
  postcode: "ba11 2qn",
  formatted_address: ["The Garden Room", "Fromefield", "", "Frome", "Somerset"],
  building_name: "The Garden Room",
  sub_building_name: "",
  line_1: "The Garden Room",
  line_2: "Fromefield",
  line_3: "",
  line_4: "Frome",
  locality: "Frome",
  town_or_city: "Frome",
  county: "Somerset",
};

// ── harness ────────────────────────────────────────────────────────────────
let pass = 0,
  fail = 0;
const logs = [];
const realError = console.error;
console.error = (...a) => logs.push(a.join(" "));

function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    realError(`  ok   ${name}`);
  } else {
    fail++;
    realError(`  FAIL ${name} ${detail}`);
  }
}
const eq = (name, got, want) =>
  check(
    name,
    JSON.stringify(got) === JSON.stringify(want),
    `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`,
  );

async function scenario(name, fn) {
  realError(`\n== ${name}`);
  calls = [];
  logs.length = 0;
  await fn();
}

const KEY = "SEKRIT-key-abc123";

// 1 == no key at all
await scenario("absent key", async () => {
  delete process.env.GETADDRESS_API_KEY;
  check("canFindAddresses() false", mod.canFindAddresses() === false);
  eq("suggest -> unavailable", await mod.suggestAddresses("the garden room"), {
    status: "unavailable",
  });
  eq("expand -> unavailable", await mod.expandSuggestion("abc"), {
    status: "unavailable",
  });
  check("no request was made", calls.length === 0, `made ${calls.length}`);
});

process.env.GETADDRESS_API_KEY = KEY;
check("canFindAddresses() true with a key", mod.canFindAddresses() === true);

// 2 == the term guard
await scenario("term shorter than the minimum", async () => {
  eq("MIN_TERM_LENGTH is 3", shared.MIN_TERM_LENGTH, 3);
  eq("two letters -> none", await mod.suggestAddresses("ba"), {
    status: "none",
  });
  eq("whitespace -> none", await mod.suggestAddresses("   "), {
    status: "none",
  });
  check("nothing was spent", calls.length === 0, `made ${calls.length}`);
});

// 3 == the happy suggest path, and the PATH ITSELF
await scenario("autocomplete happy path", async () => {
  handler = () => json(AUTOCOMPLETE);
  const got = await mod.suggestAddresses("  the garden room, frome  ");
  eq("suggestions parsed", got, {
    status: "suggestions",
    suggestions: [
      {
        id: "NDg5YmQ5NzY5Zjk0YmI5IDUxMTQ3MTI1",
        label:
          "Westminster Gallery, Westminster Central Hall, Westminster, London",
      },
      {
        id: "MDZlNWYxYTUyMDA0NDUyIDUxMDY1ODM0",
        label:
          "Westminster School Lawrence Hall, Greycoat Street, Westminster, London",
      },
    ],
  });
  const u = new URL(calls[0].url);
  check("host is api.getaddress.io", u.host === "api.getaddress.io", u.host);
  check(
    "path is /autocomplete/{term}",
    u.pathname.startsWith("/autocomplete/"),
    u.pathname,
  );
  check(
    "term is trimmed + encoded",
    u.pathname === "/autocomplete/the%20garden%20room%2C%20frome",
    u.pathname,
  );
  check("key travels as ?api-key", u.searchParams.get("api-key") === KEY);
  check("no /find anywhere", !calls[0].url.includes("/find"));
  check("no expand=true left over", !calls[0].url.includes("expand"));
});

await scenario("autocomplete with nothing to offer", async () => {
  handler = () => json({ suggestions: [] });
  eq("empty list -> none", await mod.suggestAddresses("zzzqqq"), {
    status: "none",
  });
  handler = () => json({});
  eq("missing key -> none", await mod.suggestAddresses("zzzqqq"), {
    status: "none",
  });
});

// 4 == the resolve path
await scenario("get: a house with no name", async () => {
  handler = () => json(GET_HOUSE);
  const got = await mod.expandSuggestion("NDg5YmQ5NzY5Zjk0YmI5IDUxMTQ3MTI1");
  eq("fields", got, {
    status: "found",
    address: {
      name: "",
      addressLines: "10 Watkin Terrace\nNorthampton\nNorthamptonshire",
      postcode: "NN1 3ER",
    },
  });
  const u = new URL(calls[0].url);
  check(
    "path is /get/{id}, id verbatim",
    u.pathname === "/get/NDg5YmQ5NzY5Zjk0YmI5IDUxMTQ3MTI1",
    u.pathname,
  );
  check("key travels as ?api-key", u.searchParams.get("api-key") === KEY);

  // The id is round-tripped through the browser, so it must not be able to
  // climb out of the path or bolt a second parameter onto the query.
  calls = [];
  await mod.expandSuggestion("../../v3/usage?x=1 y");
  const escaped = new URL(calls[0].url);
  check(
    "an id cannot escape /get/",
    escaped.pathname === "/get/..%2F..%2Fv3%2Fusage%3Fx%3D1%20y",
    escaped.pathname,
  );
  check(
    "an id cannot add a parameter",
    [...escaped.searchParams.keys()].join(",") === "api-key",
    [...escaped.searchParams.keys()].join(","),
  );
});

await scenario("get: a named place", async () => {
  handler = () => json(GET_NAMED);
  const got = await mod.expandSuggestion("x");
  eq(
    "name split out, never repeated in the lines, postcode canonicalised",
    got,
    {
      status: "found",
      address: {
        name: "The Garden Room",
        addressLines: "Fromefield\nFrome\nSomerset",
        postcode: "BA11 2QN",
      },
    },
  );
});

await scenario("get: every part blank", async () => {
  handler = () => json({ postcode: "X1 1XX" });
  eq(
    "nothing to fill -> none, rather than emptying her fields",
    await mod.expandSuggestion("x"),
    { status: "none" },
  );
});

// 5 == every failure branch
await scenario("401 - the situation the key is in today", async () => {
  handler = () =>
    new Response(JSON.stringify({ Message: `Invalid api key ${KEY}` }), {
      status: 401,
    });
  eq("-> unavailable", await mod.suggestAddresses("garden room"), {
    status: "unavailable",
  });
  check("something was logged", logs.length === 1, `${logs.length} lines`);
  const line = logs[0] ?? "";
  check("names the status", line.includes("401"));
  check("names the env var", line.includes("GETADDRESS_API_KEY"));
  check("says REFUSED, not just a number", /REFUSED/.test(line));
  check(
    "names the three causes",
    /activated/.test(line) &&
      /admin key/.test(line) &&
      /domain restriction/.test(line),
  );
  check("names which endpoint", line.includes("/autocomplete"));
  check(
    "passes getAddress's own message through",
    line.includes("Invalid api key"),
  );
  check("THE KEY IS NOT IN THE LOG", !line.includes(KEY), line);
  check("the key was redacted to [key]", line.includes("[key]"));
  check("THE URL IS NOT IN THE LOG", !line.includes("api.getaddress.io"), line);
  realError(`       -> ${line}`);
});

await scenario("403 gets the same treatment", async () => {
  handler = () => new Response("forbidden", { status: 403 });
  eq("-> unavailable", await mod.expandSuggestion("x"), {
    status: "unavailable",
  });
  check(
    "diagnosed like a 401",
    (logs[0] ?? "").includes("REFUSED") && logs[0].includes("/get"),
  );
});

await scenario("429 - over the plan's rate limit", async () => {
  handler = () =>
    new Response("{}", { status: 429, headers: { "Retry-After": "42" } });
  eq("-> unavailable", await mod.suggestAddresses("garden room"), {
    status: "unavailable",
  });
  check(
    "logged with the wait from Retry-After",
    (logs[0] ?? "").includes("retry after 42s"),
    logs[0],
  );
  realError(`       -> ${logs[0]}`);
});

await scenario("500 - their end, not ours", async () => {
  handler = () => new Response("boom", { status: 500 });
  eq("-> unavailable", await mod.suggestAddresses("garden room"), {
    status: "unavailable",
  });
  check("still said out loud", (logs[0] ?? "").includes("500"), logs[0]);
});

await scenario(
  "404 and 400 are 'nothing answers to it', and stay quiet",
  async () => {
    handler = () => new Response("", { status: 404 });
    eq("404 -> none", await mod.suggestAddresses("garden room"), {
      status: "none",
    });
    eq("404 on get -> none", await mod.expandSuggestion("stale-id"), {
      status: "none",
    });
    handler = () => new Response("", { status: 400 });
    eq("400 -> none", await mod.suggestAddresses("garden room"), {
      status: "none",
    });
    check(
      "nothing logged - neither is a fault to chase",
      logs.length === 0,
      logs.join(" | "),
    );
  },
);

await scenario("timeout / offline / DNS", async () => {
  handler = () => {
    throw new DOMException("The operation was aborted", "TimeoutError");
  };
  eq("suggest -> unavailable", await mod.suggestAddresses("garden room"), {
    status: "unavailable",
  });
  eq("expand -> unavailable", await mod.expandSuggestion("x"), {
    status: "unavailable",
  });
  check(
    "no noise - a dropped connection is not a dead key",
    logs.length === 0,
    logs.join(" | "),
  );
});

await scenario("200 with junk in it", async () => {
  handler = () => new Response("<html>maintenance</html>", { status: 200 });
  eq("suggest -> unavailable", await mod.suggestAddresses("garden room"), {
    status: "unavailable",
  });
  eq("expand -> unavailable", await mod.expandSuggestion("x"), {
    status: "unavailable",
  });
});

await scenario("a caller pushing junk at the actions", async () => {
  handler = () => json(GET_HOUSE);
  eq("empty id -> none, unspent", await mod.expandSuggestion("   "), {
    status: "none",
  });
  eq(
    "absurd id -> none, unspent",
    await mod.expandSuggestion("x".repeat(500)),
    {
      status: "none",
    },
  );
  check(
    "neither reached getAddress",
    calls.length === 0,
    `made ${calls.length}`,
  );
  handler = () => json(AUTOCOMPLETE);
  await mod.suggestAddresses("y".repeat(400));
  check(
    "an over-long term is cut to 120",
    new URL(calls[0].url).pathname === "/autocomplete/" + "y".repeat(120),
  );
});

console.error = realError;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
