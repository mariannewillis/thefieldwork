/**
 * Stands in for api.getaddress.io inside the Next server process, so the
 * typeahead can be walked in a real browser while the key is being refused.
 *
 * Loaded with `node --import ./_stub-getaddress.mjs`, which runs before Next
 * boots — Next's own fetch wrapper then captures THIS fetch as its original,
 * so the interception survives. Nothing but api.getaddress.io is touched.
 *
 * The term drives the branch, so every failure can be reached from the form:
 *   fail401 / fail429 / boom / zzz (no matches) / slow (past the timeout)
 */
const real = globalThis.fetch;
const t0 = Date.now();
const say = (m) =>
  process.stderr.write(
    `[stub +${String(Date.now() - t0).padStart(6)}ms] ${m}\n`,
  );

const PLACES = {
  "id-garden": {
    postcode: "ba11 2qn",
    formatted_address: [
      "The Garden Room",
      "Fromefield",
      "",
      "Frome",
      "Somerset",
    ],
    building_name: "The Garden Room",
    line_1: "The Garden Room",
    line_2: "Fromefield",
    line_4: "Frome",
    locality: "Frome",
    town_or_city: "Frome",
    county: "Somerset",
  },
  "id-cheese": {
    postcode: "BA11 1BE",
    building_name: "",
    line_1: "24 Cheap Street",
    town_or_city: "Frome",
    county: "Somerset",
  },
  "id-house": {
    postcode: "NN1 3ER",
    formatted_address: [
      "10 Watkin Terrace",
      "",
      "",
      "Northampton",
      "Northamptonshire",
    ],
    building_name: "",
    line_1: "10 Watkin Terrace",
    town_or_city: "Northampton",
    county: "Northamptonshire",
  },
};

const SUGGESTIONS = [
  { id: "id-garden", address: "The Garden Room, Fromefield, Frome, Somerset" },
  { id: "id-cheese", address: "24 Cheap Street, Frome, Somerset" },
  {
    id: "id-house",
    address: "10 Watkin Terrace, Northampton, Northamptonshire",
  },
];

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

globalThis.fetch = async (input, init) => {
  const url = String(input?.url ?? input);
  if (!url.startsWith("https://api.getaddress.io/")) return real(input, init);

  const { pathname } = new URL(url);

  if (pathname.startsWith("/autocomplete/")) {
    const term = decodeURIComponent(pathname.slice("/autocomplete/".length));
    say(`autocomplete "${term}"`);
    if (term.includes("fail401"))
      return json({ Message: "Invalid api key" }, 401);
    if (term.includes("fail429")) return json({}, 429, { "Retry-After": "37" });
    if (term.includes("boom")) return new Response("boom", { status: 500 });
    if (term.includes("zzz")) return json({ suggestions: [] });
    if (term.includes("slow")) {
      // The caller's AbortSignal is HONOURED, or this stub would quietly make
      // the timeout branch untestable by outliving it.
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, 5000);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(init.signal.reason ?? new Error("aborted"));
        });
      });
      return json({ suggestions: SUGGESTIONS });
    }
    const hits = SUGGESTIONS.filter((s) =>
      s.address.toLowerCase().includes(term.toLowerCase().split(",")[0].trim()),
    );
    return json({ suggestions: hits.length ? hits : SUGGESTIONS });
  }

  if (pathname.startsWith("/get/")) {
    const id = decodeURIComponent(pathname.slice("/get/".length));
    say(`get "${id}"  <- THE BILLED CALL`);
    if (id === "id-cheese-401")
      return json({ Message: "Invalid api key" }, 401);
    const place = PLACES[id];
    return place ? json(place) : new Response("", { status: 404 });
  }

  return new Response("", { status: 404 });
};

say("api.getaddress.io is stubbed in this process");
