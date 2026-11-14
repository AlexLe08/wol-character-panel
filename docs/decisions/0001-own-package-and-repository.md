# 0001: Own package and repository, history kept

Status: Accepted · 2026-11-08

## Context

The character sheet was written inside
[the-portfolio-site](https://github.com/AlexLe08/the-portfolio-site), first
as frontend components. It moved there in steps:

- Site #74 and #75 (2026-11-06): an npm workspace, and the module as
  `packages/eorzean-character-sheet/` (private, 1.0.0), with the entries it
  still has (`.` without React, `/react`, `/schema`, the CSS and the JSON
  Schema) and an ESLint import allowlist as its boundary.
- Site #76 and #85: the versioned `$id` and the closed JSON Schema
  ([0002](0002-closed-json-schema.md)), still inside the site.
- Site #96 (2026-11-08): the rename ([0003](0003-package-name.md)), as step
  1 of the move.
- This repository started from `git filter-repo` on the site, keeping the
  package's history since site #75; #1 joined it to the repository's
  initial commit (`a0cfc22`). 1.0.0 was published by hand, 1.0.1 (#4)
  through `release.yml` with trusted publishing, and the site switched to
  `^1.0.1` from npm (its PR #97).

## Decision

The character sheet is its own npm package, `@solution-nine/wol-character-panel`,
in its own public repository, published from there; the site is a host
that depends on it. The package's history came with it.

**Why:** TODO(Alex)

## Consequences

- A change reaches the site only through a release here and an upgrade PR
  there. Trying an unreleased change in the site means installing a packed
  tarball (`npm pack`), not `npm link`.
- The package has to stand alone: its own build (`tsc` to ESM `dist/`),
  CI, release workflow, README and CHANGELOG, and a public API (the
  `exports` map) held to semver.
- The site's backend validates saves against a copy of the JSON Schema,
  regenerated after each upgrade (`generate:character-schema` there).
- `git log` and `git blame` reach back to site #75 here; decisions from
  before the move are in the site's `docs/roadmap.md`.
- Two repositories to keep in step: rules such as the workflow and these
  records are copied to the site by hand.
