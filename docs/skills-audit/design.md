# Skills Audit — scope: design

Run: `/skills-audit --scope=design` (auto-invoked by `/analyze` per ADR-005).
Date: 2026-08-06 · Project: `thefieldwork-v5`

Scope separation honoured: `.claude/architecture.yaml` was NOT read (it does not
exist yet — `/architect` runs post-design per refactor-003).

## Design-stage MCP servers

Expected from `mcp-defaults-design.json`; present read from `.mcp.json`.

| Server            | Expected | Registered | Notes                                               |
| ----------------- | -------- | ---------- | --------------------------------------------------- |
| `playwright`      | ✓        | ✓          | Mockup + screen rendering, craft-review screenshots |
| `icons8`          | ✓        | ✓          | Icon sourcing                                       |
| `unsplash`        | ✓        | ✓          | Stock imagery                                       |
| `chrome-devtools` | ✓        | ✓          | Computed-style inspection                           |
| `image-generator` | flagged  | —          | Behind `feature_flag: nanobanana`; not active       |

`missingMcpServers[]`: **none**. The four unflagged servers are all registered.
`image-generator` is absent by design — it registers only when the run carries
`--flags=nanobanana`, and this project's six commissioned plates were generated
out-of-band and already sit in `assets/images/`, so the flag is not needed for
`/mockups`.

**Note for `/mockups`:** `unsplash` is registered but this project should not
reach for it. Every image on the marketing surface is commissioned and
art-directed (`asset-inventory.json`), and craft condition C-4 forbids shipping
stock-as-placeholder. Stock imagery here would be a register collision with six
purpose-lit plates.

## Shipped pipeline skills

All 11 present under `.claude/skills/`:

`analyze` · `mockups` · `stylesheet` · `screens` · `visual-review` ·
`user-flows-generator` · `pick-style` · `scan-assets` · `draft-brief` ·
`new-project` · `validate-brief`

## Shipped stack skills

All 5 present under `.claude/skills/agents/`:

| Tier      | Slug             | SKILL.md |
| --------- | ---------------- | -------- |
| back-end  | `node-trpc-nest` | ✓        |
| back-end  | `python-fastapi` | ✓        |
| front-end | `react-next`     | ✓        |
| front-end | `svelte-kit`     | ✓        |
| mobile    | `expo-rn`        | ✓        |

`missingSkills[]`: **none**. Stack selection is the architect's decision at
`/architect`; this audit only confirms the shelf is stocked. Note that a
build-scope audit will re-run against `architecture.yaml.tooling.stack.*` once
that file exists, and that is the audit that can genuinely fail.

## Bespoke design skills (feat-090 — authored pre-Gate-1)

Not part of the MCP/stack audit, recorded here because they were authored during
this same `/analyze` run and the operator reviews their bodies at Gate 1.

| Skill                        | Class     | layoutMove | Citations | Body  |
| ---------------------------- | --------- | ---------- | --------- | ----- |
| `ascending-beat-scroll`      | identity  | **true**   | 4         | 5,302 |
| `the-answered-question`      | identity  | false      | 8         | 5,700 |
| `night-side-emanation`       | identity  | false      | 4         | 5,948 |
| `plain-declarative-voice`    | identity  | false      | 4         | 5,909 |
| `dated-things-are-typeset`   | technique | false      | 3         | 5,577 |
| `stillness-as-motion-budget` | technique | false      | 3         | 4,920 |

6 authored · 0 reused from `_shared-design` (no shared registry exists yet) ·
**0 refused** (`docs/design-skills-refused.json` is `[]`). All bodies under the
6,000-char injection cap. `validate-design-skills.mjs` passes, including the
feat-095 layout-bearing check.

## Output

```json
{
  "success": true,
  "scope": "design",
  "missingSkills": [],
  "missingMcpServers": [],
  "authoredSkills": [],
  "shippedSkills": [
    "analyze",
    "mockups",
    "stylesheet",
    "screens",
    "visual-review",
    "user-flows-generator",
    "pick-style",
    "scan-assets",
    "draft-brief",
    "new-project",
    "validate-brief",
    "agents/back-end/node-trpc-nest",
    "agents/back-end/python-fastapi",
    "agents/front-end/react-next",
    "agents/front-end/svelte-kit",
    "agents/mobile/expo-rn"
  ],
  "warnings": [
    "image-generator MCP is not registered; it is gated behind feature_flag nanobanana and is not required — the six commissioned plates already exist in assets/images/.",
    "unsplash is registered but should not be used on this project's marketing surface: all imagery is commissioned and art-directed, and craft condition C-4 forbids shipping stock-as-placeholder."
  ]
}
```

No gaps. Nothing blocks `/mockups`.
