# Roadmap

## Done

- Extracted from the-portfolio-site (2026-11-08). History since its PR #75
  came over with `git filter-repo` (#1). Build with plain `tsc` to ESM
  `dist/`, CI (`check`: lint, type-check, tests, schema up to date, build,
  pack) and `release.yml` (#2, #3). 1.0.0 was published by hand; 1.0.1
  (#4, tag `v1.0.1`) was the first release through trusted publishing,
  with provenance, and is `latest`. The site depends on `^1.0.1` (its
  PR #97). The decisions behind the package up to the move (entries,
  `LIMITS`, job status, the versioned `$id`, the name) are in the site's
  `docs/roadmap.md`.
- Claude Code setup: `CLAUDE.md`, `.claude/settings.json` (no force push,
  merge, or npm publishing commands; tag pushes ask), the `reviewer`
  subagent, `scripts/check.sh`, and this roadmap.

## Next up (candidates, unordered)

- Themes beyond `document` and `game`.
- CMS adapters, Contentful first (on its free plan), as `loadConfig`
  sources. The core never imports a CMS SDK: an adapter is its own entry
  or package, so the allowlist and peer dependencies stay as they are.
- A demo site (free hosting) showing the panel with a sample config and
  both themes.
- A custom-element wrapper, only if someone asks for one.
- Backend code stays out (decided with the site's PR #54): the JSON
  Schema is the contract, which any backend validates in its own language.
  A Python validator package (`find_issues` and its `oneOf` explanation)
  only if someone asks, and then in this repository, so it ships with the
  schema version it checks.
- The import allowlist doesn't see dynamic `import()` or `require()`. Add
  a `no-restricted-syntax` rule if the package ever uses them (it doesn't
  today).
- Component or DOM tests (jsdom or happy-dom plus Testing Library) once
  rendering logic is worth testing apart from the site.
