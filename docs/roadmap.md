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
- Playground (`npm run dev`): a Vite page rendering the panel from `src/`
  on the configs in `examples/` (`full`, `minimal`, `edge-cases`), with its
  controls in the URL; a test keeps every example parsing cleanly. Chosen
  over Storybook and Ladle: Vite was already in the tree through Vitest, so
  it added only `vite`, `@vitejs/plugin-react`, `react-dom` and
  `@types/react-dom` (dev only). First phase of the tooling plan below.
- Tests and coverage, first PR of the tooling plan's step 1:
  server-render tests of `CharacterSheet` with `renderToStaticMarkup` (Node,
  no DOM; targeted assertions on elements and attributes rather than
  whole-render snapshots, so unrelated markup changes don't churn them;
  class names are pinned, since hosts restyle them), an inline snapshot of each entry's runtime
  export names, and `@vitest/coverage-v8` with thresholds at 92/96/86/93
  (statements, branches, functions, lines), enforced by `npm test` in CI.
  Gaps left: removing an exported *type* isn't caught (types vanish at
  runtime), and `SlotHover.tsx` sits at about 26% because its handlers only
  run in a browser.
- Browser tests, second PR of the tooling plan's step 1: Playwright and
  `@axe-core/playwright` (dev only) against the playground, in Chromium,
  as `npm run test:browser`, a `browser` CI job beside `check` (report
  uploaded on failure) and a step in `scripts/check.sh`. Tooltips on
  hover (and hoverable) and keyboard focus, Escape focused and hovered,
  focus rings on everything Tab reaches in both themes, wide and narrow
  layouts (following the container), axe WCAG 2.2 A/AA across examples,
  themes and layouts, and a no-JavaScript page: `/static`, the panel
  server-rendered by the playground's dev server (`static.tsx` through
  `ssrLoadModule`), loaded with JavaScript off. No `@types/node`, so
  `src/` can't lean on Node globals; the two config files declare what
  they use. axe found one thing: empty slots' glyphs are below 4.5:1 in
  the document theme. Left out of axe as an inactive component (WCAG
  1.4.3), pending the owner's call on raising them to `--cs-muted`.
  Chromium only; Firefox and WebKit are a project line each.
- Claude Code setup: `CLAUDE.md`, `.claude/settings.json` (no force push,
  merge, or npm publishing commands; tag pushes ask), the `reviewer`
  subagent, `scripts/check.sh`, and this roadmap.
- Worktree scripts, ported from the-portfolio-site: `new-worktree.sh`,
  `setup-worktree.sh` (here only `npm ci`) and `cleanup-merged.sh`. The
  cleanup now resolves symlinked paths (`pwd -P`), so it always recognises
  the worktree it runs from; tested against a local bare origin (merged,
  open, never-pushed, and merged-but-remote-kept branches).

## Next up: tooling plan (in order, one PR and session each)

Agreed 2026-11-08 after a review of the repository as extracted.

1. Tests and coverage: done (both PRs, above).
2. Packaging checks: `publint` and `@arethetypeswrong/cli`; a smoke test
   that installs the packed tarball and imports each entry in plain Node
   (and checks `"use client"` in `dist/SlotHover.js`); CI on Node 22.12
   (the `engines` floor) and 24, and a job on the oldest peer versions.
3. Repository hygiene: `CHANGELOG.md`, Dependabot (npm dev dependencies and
   Actions), actions pinned by SHA in `release.yml`, a PR template with a
   semver line, issue templates, `CONTRIBUTING.md`, `SECURITY.md`,
   `.nvmrc`. Drop the README's "The URL opens once the package is
   published" line (it is).
4. Claude Code: a `preview` skill (start `npm run dev`, screenshot both
   themes wide and narrow, report console errors), a `release-prep` skill
   (semver call from the API and schema diff, version bump, CHANGELOG, the
   `release:` PR; never tags), maybe an `a11y-auditor` agent, and
   `reviewer.md` updated for the playground and the export snapshot.

Found with the playground's `edge-cases` example, for a component PR: at
the limits, the tooltip runs far below the panel, the level line wraps
mid-label, and "Change job" wraps onto two lines.

## Later (candidates, unordered)

- Themes beyond `document` and `game`.
- CMS adapters, Contentful first (on its free plan), as `loadConfig`
  sources. The core never imports a CMS SDK: an adapter is its own entry
  or package, so the allowlist and peer dependencies stay as they are.
- A demo site (free hosting) showing the panel with a sample config and
  both themes: build the playground with Vite and deploy it to GitHub
  Pages.
- A custom-element wrapper, only if someone asks for one.
- Backend code stays out (decided with the site's PR #54): the JSON
  Schema is the contract, which any backend validates in its own language.
  A Python validator package (`find_issues` and its `oneOf` explanation)
  only if someone asks, and then in this repository, so it ships with the
  schema version it checks.
- The import allowlist doesn't see dynamic `import()`, `require()` or
  Vite's `import.meta.glob()`. Add a `no-restricted-syntax` rule if the
  package ever uses them (it doesn't today; `src/examples.test.ts` globs
  `../examples/`, which is fine for a test that never ships).
