# 0006: Tooling freeze

Status: Accepted · 2026-11-14

## Context

From 2026-11-08 to 11-09 came the Claude Code setup (`scripts/check.sh`,
the `reviewer` agent, #5), the playground (#6), the worktree scripts (#8)
and the roadmap's four-step tooling plan: Vitest with coverage thresholds,
Playwright and axe browser tests (#7, #9), packaging checks (publint,
attw, a packed-tarball smoke test, a `compat` job on the oldest peers and
Node, #10), a CHANGELOG, Dependabot and issue and PR templates (#12), and
the preview script and `release-prep` skill (#16). Then came the GitHub
Pages demo (#20, 11-10), and in #26 the edge-case scripts. Feature work (2.0) is what's left before a stable
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
- When to revisit: TODO(Alex)
