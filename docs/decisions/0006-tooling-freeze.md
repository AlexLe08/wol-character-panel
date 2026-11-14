# 0006: Tooling freeze

Status: Accepted · 2026-11-14

## Context

From 2026-11-08 to 11-10 the roadmap's four-step tooling plan was done in
full: the playground, Vitest with coverage thresholds, Playwright and axe
browser tests, packaging checks (publint, attw, a packed-tarball smoke
test, a `compat` job on the oldest peers and Node), a CHANGELOG,
Dependabot, issue and PR templates, the worktree scripts,
`scripts/check.sh`, the preview script and the `reviewer` agent and
`release-prep` skill. Then came the GitHub Pages demo, and in #26 the
edge-case scripts. Feature work (2.0) is what's left before a stable
release, and the roadmap's Later list still holds tooling candidates (an
`a11y-auditor` agent, a lint rule for dynamic imports).

## Decision

No new tooling (dependencies, workflows, scripts, agents, skills, checks)
unless a real bug or real friction calls for it. Feature work comes first.

**Why:** TODO(Alex)

## Consequences

- A tooling PR names the bug or the friction it fixes, so it can be
  checked against this record.
- Existing tooling is maintained (Dependabot updates, fixing a broken
  check), which isn't new tooling.
- The tooling items in the roadmap's Later list wait for a trigger: the
  `a11y-auditor` agent until component work outgrows axe and the reviewer,
  the dynamic-import lint rule until the package uses one.
- Gaps already known stay open until they bite, such as exported *types*
  not being covered by the export snapshot, or browser tests in Chromium
  only.
- Revisit when 2.0.0 is out, or when the same friction comes up twice.
