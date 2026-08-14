import "server-only";
import Stripe from "stripe";
import { CANONICAL_SITE_URL, SITE_URL } from "@/content/site";

/**
 * Stripe, and the one rule that decides whether buying is offered at all.
 *
 * BOTH KEYS OR NEITHER. `STRIPE_SECRET_KEY` opens a Checkout Session;
 * `STRIPE_WEBHOOK_SECRET` is what lets us believe the payment that comes back.
 * With the first and not the second, a real card is charged and nothing on this
 * side can confirm it — the buyer pays, no Booking is written, no confirmation
 * is sent, and the place is not held. That is the worst failure this feature
 * has, so the half-configured state is treated as NOT CONFIGURED and the panel
 * keeps the honest "you cannot book this online yet" it has always had.
 *
 * Chosen by the presence of the keys, never by NODE_ENV — the same rule as
 * RESEND_API_KEY (D-13) and MEDIA_BUCKET_ID (D-14), and for the same reason:
 * what actually stops a payment working is a missing key, and keying off the
 * environment would let a production deploy with no key pretend it was fine.
 *
 * The webhook secret is not something the Stripe dashboard hands out for local
 * work — `stripe listen` prints one, and it belongs to that session. So the
 * half-configured state is the NORMAL state on a developer's machine, which is
 * why it says which half is missing in the server log rather than failing
 * silently or blaming the integration.
 */

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;

/** Read by the webhook route to verify signatures. Null means refuse. */
export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;

// ── which site opened a checkout ─────────────────────────────────────────────

/**
 * WHICH DEPLOYMENT THIS IS, and the metadata key it writes onto every Checkout
 * Session it opens.
 *
 * One Stripe account serves the live site and every preview of it. Stripe sends
 * `checkout.session.completed` to EVERY endpoint registered on the account, so
 * a place bought on the Replit preview is delivered here as well — and the live
 * database has never heard of that workshop. Before this stamp existed the
 * webhook could not tell that event from a workshop Marianne had genuinely
 * taken down, so it did the thing that path is for: refunded the payment and
 * emailed the buyer to say the day was no longer running. It happened twice on
 * 2026-08-14, to a real buyer, on a booking made on the preview (D-19).
 *
 * The identity is the SITE'S OWN HOST — `thefieldwork.co.uk` live, the
 * `.replit.dev` address on a preview, `localhost:3100` under the smoke test.
 * No new environment variable: NEXT_PUBLIC_SITE_URL already differs between
 * deployments and already has to be right, because the cancellation links
 * inside emails are built from it. A variable that only mattered here could be
 * wrong for months without anything noticing.
 */
export const SITE_METADATA_KEY = "site";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    // Something unparseable in NEXT_PUBLIC_SITE_URL. Comparing the raw strings
    // still tells two deployments apart, which is the whole job here.
    return url.trim();
  }
}

/** This deployment, as it will be written into session metadata. */
export const thisSite = hostOf(SITE_URL);

export type SessionOrigin =
  /** Opened by this deployment. Act on it. */
  | "thisSite"
  /** Opened by a different one. Not ours to touch. */
  | "elsewhere"
  /** Opened before the stamp existed. Treated as ours — see whoseSession. */
  | "unstamped";

/**
 * Whose checkout a completed session was.
 *
 * An UNSTAMPED session is treated as this site's, deliberately. Sessions opened
 * before this guard shipped are still valid for hours, and a real buyer's
 * payment is in some of them; calling those foreign would take the money, write
 * no booking, and send nothing — a silent swallow, which is worse than the bug
 * being fixed. The unstamped population only shrinks, because every session
 * opened from now on carries the stamp.
 */
export function whoseSession(stamp: string | null | undefined): SessionOrigin {
  const site = stamp?.trim();
  if (!site) return "unstamped";
  return site === thisSite ? "thisSite" : "elsewhere";
}

let announced = false;

/**
 * Whether a place on a workshop can be bought right now.
 *
 * Says WHY in the log, once per process, so a missing webhook secret can be
 * told apart from a broken integration at a glance. Once, not per request: a
 * line on every page render is a line nobody reads.
 */
export function paymentsConfigured(): boolean {
  const ready = Boolean(secretKey && webhookSecret);

  if (!announced) {
    announced = true;
    if (ready) {
      console.info(
        `[stripe] configured — places can be bought, and checkouts opened here are stamped ${SITE_METADATA_KEY}=${thisSite}.`,
      );
      announceKeyMode();
    } else if (secretKey && !webhookSecret) {
      console.warn(
        "[stripe] STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not, so buying is NOT offered. A Checkout Session opened now could take a real payment with nothing able to confirm it. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the whsec_… it prints into STRIPE_WEBHOOK_SECRET.",
      );
    } else if (!secretKey && webhookSecret) {
      console.warn(
        "[stripe] STRIPE_WEBHOOK_SECRET is set but STRIPE_SECRET_KEY is not, so buying is NOT offered and no webhook can be acted on.",
      );
    } else {
      console.info(
        "[stripe] no keys set — buying is not offered, and the workshop page says so.",
      );
    }
  }

  return ready;
}

/**
 * Says, once, when the keys and the site do not belong to each other.
 *
 * THE REAL FIX FOR D-19 IS CONFIGURATION, NOT CODE: a preview holding
 * `sk_test_…` and production holding `sk_live_…` makes a crossed delivery
 * impossible, because a test-mode event is only ever sent to a test-mode
 * endpoint. Nothing in the app can arrange that, so it does the next thing —
 * notices, and says so where the boot log is read.
 *
 * A LINE IN THE LOG, NEVER A REFUSAL. Refusing to start on a mismatch would
 * take the site down for a wrong guess about which host is production, and the
 * guard in the webhook already makes the crossed case harmless.
 */
function announceKeyMode(): void {
  const live = secretKey?.startsWith("sk_live_") ?? false;
  const test = secretKey?.startsWith("sk_test_") ?? false;
  const isLiveSite = thisSite === hostOf(CANONICAL_SITE_URL);

  if (live && !isLiveSite) {
    console.warn(
      `[stripe] LIVE KEYS ON ${thisSite}, which is not ${hostOf(CANONICAL_SITE_URL)}. Cards used here are charged for real, and this deployment shares one Stripe account — and one set of webhook deliveries — with the live site. Use the sk_test_ / whsec_ pair anywhere that is not production.`,
    );
  } else if (test && isLiveSite) {
    console.warn(
      `[stripe] TEST KEYS ON THE LIVE SITE (${thisSite}). Buying is offered, and no real payment can be taken — a card typed on the workshop page will be declined or charged nothing.`,
    );
  }
}

let client: Stripe | null = null;

/**
 * The client itself.
 *
 * Only reachable from paths already guarded by `paymentsConfigured()`, so
 * throwing here means a caller skipped the gate — a bug, not a configuration
 * problem, and it should be loud.
 *
 * No `apiVersion` is pinned. The account's own default is what the dashboard
 * and the CLI both use, and pinning it here would mean this file and the
 * operator's Stripe account could drift apart with nothing to notice.
 */
export function stripe(): Stripe {
  if (!secretKey) {
    throw new Error(
      "Stripe was asked for without STRIPE_SECRET_KEY. Every path that can reach it must check paymentsConfigured() first.",
    );
  }
  client ??= new Stripe(secretKey);
  return client;
}
