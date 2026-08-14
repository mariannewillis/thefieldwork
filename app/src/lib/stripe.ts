import "server-only";
import Stripe from "stripe";

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
 * RESEND_API_KEY (D-13), MEDIA_BUCKET_ID (D-14) and GETADDRESS_API_KEY (D-15),
 * and for the same reason: what actually stops a payment working is a missing
 * key, and keying off the environment would let a production deploy with no
 * key pretend it was fine.
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
      console.info("[stripe] configured — places can be bought.");
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
