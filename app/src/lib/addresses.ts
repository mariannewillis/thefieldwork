import "server-only";
import { MIN_TERM_LENGTH } from "@/lib/workshop-rules";

/**
 * Finding a venue's address by typing it.
 *
 * getAddress.io resells Royal Mail's Postcode Address File, so "the garden
 * room, frome" comes back as the front doors that answer to it and she picks
 * one. That is the thing the form promised and could not deliver while the
 * open postcode data was all it had: that data knows areas and coordinates and
 * has never heard of The Garden Room.
 *
 * TWO CALLS, AND ONLY THE SECOND COSTS ANYTHING.
 *
 *   GET /autocomplete/{term}  → { suggestions: [{ address, url, id }] }
 *   GET /get/{id}             → the named parts of that one address
 *
 * A suggestion carries no address parts — only a line to read and an id — so
 * the second call is what turns the one she picked into four filled fields. It
 * happens ON THE PICK, never per suggestion shown: getAddress bills a look-up
 * for resolving a suggestion and nothing for the suggesting, so resolving six
 * to display them would cost six times what the flow is worth.
 *
 * THERE IS NO `/find/{postcode}` ANY MORE. It is what this module used to call
 * and it now 404s with or without a key — see D-16. A stub in a test cannot
 * tell you an endpoint has been withdrawn, so if this stops working, check the
 * live paths against https://documentation.getaddress.io before anything else.
 *
 * WHICH WAY IT WORKS is decided by whether GETADDRESS_API_KEY exists — the
 * same rule as RESEND_API_KEY in lib/email, and for the same reason. Without a
 * key the form does not offer the search at all, and the four address fields
 * are typed by hand exactly as they always were.
 *
 * It is NEVER allowed to stop a save. Down, slow, over its allowance, or
 * refusing our key: she types the address and the workshop saves as it would
 * have. Same rule as the film still in lib/film.
 */

const API = "https://api.getaddress.io";

/** Longer than any address line; past this she is pasting something else. */
const MAX_TERM_LENGTH = 120;

/**
 * Suggesting is quick and free, so it may give up early — a list that arrives
 * after three more letters were typed is thrown away unread. Resolving is the
 * one she has pressed for and the one that costs a look-up, so it waits longer.
 */
const SUGGEST_TIMEOUT_MS = 3000;
const RESOLVE_TIMEOUT_MS = 6000;

/** One line to read, and the id that turns it into an address. */
export type AddressSuggestion = { id: string; label: string };

export type AddressSuggestions =
  /** What the register offers for what she has typed so far. */
  | { status: "suggestions"; suggestions: AddressSuggestion[] }
  /** Nothing answers to it. She keeps typing, or writes it herself. */
  | { status: "none" }
  /** No key, wrong key, allowance gone, slow, down. Nothing is lost. */
  | { status: "unavailable" };

/** One front door, in the terms the fields it fills are written in. */
export type ChosenAddress = {
  /** The name of the place, where the register holds one. Empty for a number. */
  name: string;
  /** The address as the page prints it: one line each, postcode left off. */
  addressLines: string;
  /** As the register spells it, which is where the space goes. */
  postcode: string;
};

export type AddressResolution =
  | { status: "found"; address: ChosenAddress }
  /** The id meant nothing to them — stale, or mistyped in transit. */
  | { status: "none" }
  | { status: "unavailable" };

/**
 * Whether the form offers the search at all.
 *
 * Read on the server when the page is drawn, and passed down as a plain
 * boolean — a field that quietly does nothing is worse than a field that was
 * never going to.
 */
export function canFindAddresses(): boolean {
  return Boolean(process.env.GETADDRESS_API_KEY);
}

/** `GET /autocomplete/{term}` — what the register offers for a partial term. */
export async function suggestAddresses(
  raw: string,
): Promise<AddressSuggestions> {
  const key = process.env.GETADDRESS_API_KEY;
  // Nothing should be calling this without one, since the field that calls it
  // is drawn without the search. If the key is pulled while a page is open,
  // this is the right answer: the address is hers to type, as it was a moment
  // ago.
  if (!key) return { status: "unavailable" };

  const term = raw.trim().slice(0, MAX_TERM_LENGTH);
  if (term.length < MIN_TERM_LENGTH) return { status: "none" };

  // Every parameter is left at its documented default. `top` is 6 either way;
  // `show-postcode=true` would bill a look-up per keystroke for a postcode the
  // resolve step returns anyway; `all=true` — already the default — is what
  // makes a typed postcode return every door on it, which is the flow the
  // withdrawn /find endpoint used to serve.
  const answer = await ask(
    `${API}/autocomplete/${encodeURIComponent(term)}?api-key=${encodeURIComponent(key)}`,
    { where: "autocomplete", key, timeoutMs: SUGGEST_TIMEOUT_MS },
  );
  if (answer.status !== "ok") return answer;

  const body = answer.body as {
    suggestions?: { id?: string; address?: string }[];
  };
  const suggestions = (body.suggestions ?? [])
    .map((one) => ({
      id: (one.id ?? "").trim(),
      label: (one.address ?? "").trim(),
    }))
    .filter((one) => one.id && one.label);

  return suggestions.length > 0
    ? { status: "suggestions", suggestions }
    : { status: "none" };
}

/** The named parts of one address, as `/get/{id}` returns them. */
type RawAddress = {
  postcode?: string;
  formatted_address?: string[];
  building_name?: string;
  sub_building_name?: string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  line_4?: string;
  locality?: string;
  town_or_city?: string;
  county?: string;
};

/**
 * `GET /get/{id}` — the suggestion she picked, as four fields.
 *
 * THE ONE BILLED CALL in the flow, which is why it waits for a press.
 */
export async function expandSuggestion(id: string): Promise<AddressResolution> {
  const key = process.env.GETADDRESS_API_KEY;
  if (!key) return { status: "unavailable" };

  // The ids are base64-ish and arrive from the suggestion we just handed out,
  // but they are round-tripped through the browser, so they are treated as
  // something a caller typed rather than something we know.
  const chosen = id.trim();
  if (!chosen || chosen.length > 200) return { status: "none" };

  const answer = await ask(
    `${API}/get/${encodeURIComponent(chosen)}?api-key=${encodeURIComponent(key)}`,
    { where: "get", key, timeoutMs: RESOLVE_TIMEOUT_MS },
  );
  if (answer.status !== "ok") return answer;

  const raw = answer.body as RawAddress;
  const address = readAddress(raw);
  // A row with neither a name nor a line is not an address; better to say
  // nothing came back than to empty her fields with it.
  if (!address.name && !address.addressLines) return { status: "none" };

  return { status: "found", address };
}

/**
 * One request to getAddress, and every way it can fail said out loud once.
 *
 * Both endpoints answer the same way and are wrong the same way, so the
 * handling lives here rather than twice. `none` and `unavailable` are the only
 * two things the form can do anything about; the DETAIL that tells the two of
 * us which one it is goes to the server log.
 */
type Answer =
  | { status: "ok"; body: unknown }
  | { status: "none" }
  | { status: "unavailable" };

async function ask(
  url: string,
  context: { where: string; key: string; timeoutMs: number },
): Promise<Answer> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(context.timeoutMs),
    });
  } catch {
    // Timed out, DNS failed, offline, blocked. All the same to the form.
    return { status: "unavailable" };
  }

  // 400 is "that is not something to search for" and 404 is "nothing answers
  // to it". Two findings, one thing for her to do about either.
  if (response.status === 400 || response.status === 404) {
    return { status: "none" };
  }

  if (!response.ok) {
    await complain(response, context);
    return { status: "unavailable" };
  }

  try {
    return { status: "ok", body: await response.json() };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * The server log entry for a lookup that was refused rather than answered.
 *
 * Said out loud, because none of these are hers to fix and a search that
 * quietly answers "not just now" forever is how a wrong key survives for
 * months. A 401 gets the three things it is ever actually caused by, spelled
 * out, because "401" alone leaves whoever reads it guessing — which is where
 * this key stood on the day the endpoint was rebuilt.
 *
 * THE URL IS NEVER LOGGED: the key is in it. getAddress's own message is
 * passed through because it is the most useful line here, with any occurrence
 * of the key struck out of it first — a service is free to echo back what it
 * was sent, and a key in a log file is a key.
 */
async function complain(
  response: Response,
  context: { where: string; key: string },
): Promise<void> {
  const said = await response
    .text()
    .then((text) => text.slice(0, 300).replaceAll(context.key, "[key]").trim())
    .catch(() => "");

  const because =
    response.status === 401 || response.status === 403
      ? " — GETADDRESS_API_KEY was sent and REFUSED. The key exists; getAddress will not accept it." +
        " Check, in this order: that the subscription is active and the key has been activated;" +
        " that it is an API key and not the admin key (the admin key only works on /v3/usage and the other" +
        " administration endpoints); and that it has no domain restriction — this call is made from the" +
        " server, so it arrives with no Origin or Referer for a domain-locked key to match."
      : response.status === 429
        ? ` — over the plan's rate limit; retry after ${response.headers.get("Retry-After") ?? "?"}s`
        : "";

  console.error(
    `[addresses] getAddress.io answered ${response.status} on /${context.where}${because}` +
      (said ? ` — it said: ${said}` : ""),
  );
}

/**
 * One address from the register, in the form's own terms.
 *
 * The name and the lines are kept APART because the page prints them apart —
 * the name of the place is a heading above the address, so leaving The Garden
 * Room in both would print it twice.
 *
 * A NAME here is a name and not a number. `building_name` first, and the
 * sub-building only where there is no building name, because a room can sit
 * inside something larger. "Flat 3" will land in it occasionally and be wrong,
 * which is exactly why the field stays hers to correct.
 */
function readAddress(raw: RawAddress): ChosenAddress {
  const name = (raw.building_name || raw.sub_building_name || "").trim();

  // line_1 to line_4 already carry the number and the street joined the way
  // the Post Office writes them, so they are used as they arrive rather than
  // rebuilt out of the parts beside them.
  const street = [raw.line_1, raw.line_2, raw.line_3, raw.line_4, raw.locality];
  const lines = tidy([...street, raw.town_or_city, raw.county], name);

  return {
    name,
    // The lines DROP the name, because it is written in the field above them
    // and the page prints the two apart. `formatted_address` is the fallback
    // for a row whose named parts are all empty — rare, but it holds the same
    // address in one piece.
    addressLines: (lines.length > 0
      ? lines
      : tidy(raw.formatted_address ?? [], name)
    ).join("\n"),
    postcode: (raw.postcode ?? "").trim().toUpperCase(),
  };
}

/**
 * The lines worth printing, in order.
 *
 * Blanks go, because the register pads every address out to the same set of
 * slots. Repeats go, because line_4 and the locality are frequently the same
 * village written twice. And `drop`, where one is given, goes with them.
 */
function tidy(parts: (string | undefined)[], drop = ""): string[] {
  const seen = new Set(drop ? [drop.toLowerCase()] : []);
  const lines: string[] = [];
  for (const part of parts) {
    const line = (part ?? "").trim();
    if (!line || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    lines.push(line);
  }
  return lines;
}
