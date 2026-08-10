# @repo/ui-kit — consumption guide

`0.1.0-tokens-only`. This version ships the framework-agnostic core. React
primitives, the public barrel and Storybook arrive with `/stylesheet-primitives`
after `/architect` selects the stack.

## What you can import today

```css
@import "@repo/ui-kit/styles/globals.css"; /* includes fonts + tokens */
```

```ts
import tokens from "@repo/ui-kit/tokens/tokens.json";
```

`globals.css` opens with `@tailwind base/components/utilities`. Production
consumers pair it with their own `postcss.config.mjs`; without both, every
utility class compiles to nothing.

## HTML previews (no build step)

Inline `src/styles/preview-bootstrap.html` into the `<head>`. It is
self-contained: the token custom properties are DEFINED in its
`<style id="kit-tokens">` block, then referenced by the inline `tailwind.config`.
Never replace it with a `<link>` to `tokens.css` — a `file://` page with
references but no definitions renders blank.

## The two rules this design system will not bend

**Context-locked colour.** Magenta (`accent.500`) only inside a blush pool; gold
(`secondary.500`) only on the dark plate. Each fails contrast on the other
ground.

**Hard edges.** No border-radius, no box-shadow, no cards. The cut edge of pool
against plate is the elevation cue. The one exception is a true-circle avatar.

## Surfaces

Marketing screens route to the narrative-spine model; application screens route
to interface-craft. `docs/design-system-preview.html` shows both running on these
same tokens.
