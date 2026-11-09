# Contributing

Issues and pull requests are welcome. For anything bigger than a fix,
open an issue first: the config format and the entries are public API, and
a change to either is a semver decision.

## Setup

Node 24 (`.nvmrc`; the package itself supports 22.12+), then:

```sh
npm ci
npx playwright install chromium   # once, for the browser tests
npm run dev                       # the playground on the configs in examples/
```

The README's Development section covers the tests, the package checks and
the playground.

## Pull requests

- Branch from `main` and keep each PR to one change.
- `scripts/check.sh` runs everything CI runs; it must pass.
- New behaviour gets tests. Don't loosen or delete a test to make a check
  pass; say in the PR why it looks wrong instead.
- The package imports only `react`, `zod` and its own files. A new
  runtime dependency is a design decision; raise it in an issue.
- After changing `src/schema.ts`, run `npm run generate:schema` and commit
  `character-sheet.schema.json`.
- Fill in the template's semver line, and add a line under Unreleased in
  `CHANGELOG.md` for anything a host can see.
- Changes to entries, the config format, behaviour or theming update the
  README in the same PR.

The maintainer reviews, merges, and makes releases (see the README's
Releasing section).

## Security

Don't open a public issue for a vulnerability; see [SECURITY.md](SECURITY.md).
