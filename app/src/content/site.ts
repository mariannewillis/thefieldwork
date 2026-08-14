/**
 * The canonical origin. Every absolute URL the app emits — canonical tags,
 * social-share previews, the sitemap, and the links inside emails — is built
 * from this one value, so there is exactly one place to change it.
 *
 * The default is the real domain rather than a placeholder: if the env var is
 * ever missing in production, the site falls back to being correct instead of
 * quietly advertising a replit.app address to Google. NEXT_PUBLIC_SITE_URL
 * overrides it for previews and local work.
 *
 * That override is also what tells one deployment from another, which is why
 * the real domain is named separately below rather than left inline: the Stripe
 * webhook compares the two to decide whether a payment was made here or on a
 * preview sharing the same Stripe account (D-19).
 */
export const CANONICAL_SITE_URL = "https://thefieldwork.co.uk";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? CANONICAL_SITE_URL;
