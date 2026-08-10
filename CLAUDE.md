---
agenticVisibility: private
---

# thefieldwork-v5 — Project CLAUDE.md

Generated app scaffolded from the agentflow_phase3 factory. Agentic resources
(`.claude/`) were cloned at `/new-project` time and evolve independently —
factory changes do NOT auto-propagate.

## Brief protocol (NON-NEGOTIABLE)

- `brief.md` at project root is the canonical specification. Read it FIRST.
- Never ask the user for information that is in the brief.
- Reference brief sections; never copy content from them.
- If `brief.md` is missing/invalid, STOP and report. Run `/validate-brief`.

## Pipeline

Mode A (design) → Mode B (build) → verify+bugfix. Drive end-to-end from the
factory root with `/start-build thefieldwork-v5` (or step through `/analyze` →
`/mockups` → `/stylesheet` → `/screens` → `/architect` → `/pm`).

## Key paths

- Brief: `brief.md` · Architecture: `.claude/architecture.yaml` (post-/architect)
- Requirements: `docs/requirements.md` · Tasks: `docs/tasks.yaml`
- Asset inventory: `docs/asset-inventory.json`
