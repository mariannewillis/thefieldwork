/**
 * Tailwind v4 runs as a PostCSS plugin. Only the admin portal uses Tailwind —
 * the public site is bespoke CSS lifted from the approved mockup and must not
 * be touched by it. That separation is enforced by WHERE the stylesheet is
 * imported (app/(admin)/admin.css, imported only by the admin layout), so
 * Next emits it as a route-scoped chunk. Verified by pixel-diffing the
 * homepage before and after this file existed — see docs/DECISIONS-BUILD.md D-7.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
