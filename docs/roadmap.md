# Roadmap

## Done

- Extracted from the-portfolio-site (2026-11-08). History since its PR #75
  came over with `git filter-repo` (#1). Build with plain `tsc` to ESM
  `dist/`, CI (`check`: lint, type-check, tests, schema up to date, build,
  pack) and `release.yml` (#2, #3). 1.0.0 was published by hand; 1.0.1
  (#4, tag `v1.0.1`) was the first release through trusted publishing,
  with provenance. The site depends on `^1.0.1` (its
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
  they use. Chromium only; Firefox and WebKit are a project line each.
  `release.yml` doesn't rerun the browser tests: the tag sits on a merge
  commit CI already ran them on.
- Packaging checks, step 2 of the tooling plan: `publint` and
  `@arethetypeswrong/cli` (dev only) as `npm run lint:package` (attw with
  `--profile esm-only`, the CSS export excluded), and `npm run test:pack`,
  which installs the packed tarball in a throwaway project and imports each
  entry by name in plain Node: `.` and `/schema` with React absent, `/react`
  server-rendered with its CSS import stubbed, and `"use client"` checked
  in `dist/SlotHover.js`. CI: both in `check`, plus a `compat` job (type-check,
  tests, smoke test) on Node 22.12 with the latest peers and on Node 24
  with the oldest (react 19.0.0, zod 4.0.0); `check` stays one job so its
  status check keeps its name. attw found a real bug, fixed here: the
  emitted `CharacterSheet.d.ts` kept `import "./character-sheet.css"`,
  which fails a host on TypeScript 6 or 7 with `skipLibCheck` off (TS2882);
  the build now blanks it. `release.yml` doesn't rerun these, like the
  browser tests. The fix ships in the patch 1.0.2 (its `release:` PR, tag
  `v1.0.2` on the merge commit); the site picks it up with an upgrade in
  its own repository.
- Repository hygiene, step 3 of the tooling plan: a hand-written
  `CHANGELOG.md` (Keep a Changelog, back to 1.0.0, an Unreleased section
  each host-visible PR adds to); chosen over changesets (a dependency and
  a bot workflow) and release-please (its bot PRs would replace the
  `release:` PRs), which don't pay off for one maintainer releasing now
  and then. Dependabot, weekly: dev dependencies only (the peer ranges are
  API), `increase-if-necessary` so ranges stay open and only majors touch
  `package.json`, majors of react, zod and their types ignored (they'd
  move the dev range past the peer range), minors and patches grouped, a
  7-day cooldown; and the
  actions, grouped. `release.yml`'s actions pinned by commit SHA (the
  latest v6 of each, what the `v6` tags pointed at); `ci.yml` keeps tags.
  A PR template with a semver line, bug and feature issue forms,
  `CONTRIBUTING.md`, `SECURITY.md` (GitHub's private vulnerability
  reporting, which the owner turns on in the repository settings), and
  `.nvmrc` (24).
- Claude Code setup: `CLAUDE.md`, `.claude/settings.json` (no force push,
  merge, or npm publishing commands; tag pushes ask), the `reviewer`
  subagent, `scripts/check.sh`, and this roadmap.
- Worktree scripts, ported from the-portfolio-site: `new-worktree.sh`,
  `setup-worktree.sh` (here only `npm ci`) and `cleanup-merged.sh`. The
  cleanup now resolves symlinked paths (`pwd -P`), so it always recognises
  the worktree it runs from; tested against a local bare origin (merged,
  open, never-pushed, and merged-but-remote-kept branches).
- Claude Code skills, step 4 of the tooling plan: `scripts/preview.mjs`
  (Playwright's Chromium, already a dev dependency) screenshots each
  example in both themes, wide and narrow, from its own dev server on
  port 5198, and reports console errors; the `preview` skill runs it and
  reads the shots. A script rather than the Playwright MCP plugin, so it
  works for any contributor and without Claude; the allowlist lets only
  that script import `@playwright/test`. `release-prep`, invoked only by
  the owner (`/release-prep`), reads the diff since the last tag (export
  snapshot, schema, types, CSS, `package.json`, build inputs, Unreleased),
  proposes the bump and waits, then bumps with `npm version
  --no-git-tag-version`, rolls the CHANGELOG, runs the checks and opens
  the `release:` PR; it never tags. Instructions only: the export
  snapshot and schema diff already are the API diff. `reviewer.md` now
  checks the export snapshot as a semver call, the CHANGELOG line and PR
  semver line, browser coverage of rendering changes, accessibility
  beyond axe, and may run the preview. No `a11y-auditor` agent (see
  Later).
- The `edge-cases` findings (a patch). "Change job" wrapped onto two
  lines beside a long title: the menu no longer shrinks and the toggle
  doesn't wrap, with a browser test in both themes and layouts. The other
  two are accepted, measured in Chromium:
  - The tooltip at the limits is about 985px tall (some 1,600 characters
    in a 17rem card) against a 598px panel, so a bottom-row slot's runs
    about 900px below it. It stays usable: it's hoverable and the page
    scrolls. Widening it to 22rem across the portrait cut that only to
    805px and left realistic cards (`full`) as tall, only wider, so it
    was dropped. A height cap with scrolling would need a tab stop in
    long cards for keyboard users, and tighter `LIMITS` is a major.
    `full`'s bottom-row cards (`tools`, `contact`) also run 31px below
    the panel, wide; opening the lower rows upward would fix that, at the
    cost of at-limit cards running off the top instead.
  - The level label (20 characters) only breaks when the job column is
    narrower than the label: panels under about 20rem in the document
    theme, 22rem in the game theme (the job column is 117px at 18rem; the
    label needs 144px, 164px uppercase). Fixing it means moving the
    header slots on very small panels.
- Empty slots' glyphs meet contrast (a patch). axe found the document
  theme's `--cs-rule-strong` glyph at 2.64:1 on white; it now takes its
  label's `--cs-muted` (6.24:1), and the axe skip and `test.fail` are gone.
  The game theme had the same glyph at 2.5 to 2.8:1, which axe can't see
  (it reports text over a gradient as incomplete); it gets `--cs-muted`
  too (6.3 to 7.1:1, measured by hand), and a browser test pins the glyph
  to its label's colour in both themes.
- Demo site: the playground, as is, built by Vite (`npm run build:demo`)
  and deployed to GitHub Pages at
  `https://alexle08.github.io/wol-character-panel/` by
  `.github/workflows/pages.yml`, through GitHub's own Pages actions
  (upload an artifact, then deploy with an OIDC token; actions pinned by
  SHA, as in `release.yml`). Chosen over a `gh-pages` branch (a
  third-party action pushing build output with a write token) and over
  Vercel or Netlify (another account for a static page). It runs on
  `workflow_run` after Release succeeds, building the released commit, so
  the demo shows what npm has: not unreleased `main`, nor a tag whose
  publish failed. By hand it takes a tag and builds only `refs/tags/…`.
  Both run with `main` as their ref, so the `github-pages` environment
  needs no tag rule. CI's `check` builds it on every PR, and
  `browser/demo.spec.ts` loads the build under `/wol-character-panel/`
  (images load, links keep the base). Under the base path, the playground
  builds links from `BASE_URL` and prefixes the examples' root-relative
  image paths; the examples keep those, as a host's config would. The page
  gained a heading and a short intro, with GitHub and npm links in a footer
  after the panel (links above it would add Tab stops before the panel,
  which the browser tests reach by Tab). `/static` stays dev only. Needs
  the owner once: Pages source "GitHub Actions". The first deploy is the
  next release (1.0.4): older tags have no `build:demo`.

## Next up: tooling plan (in order, one PR and session each)

Agreed 2026-11-08 after a review of the repository as extracted.

1. Tests and coverage: done (both PRs, above).
2. Packaging checks: done (above), released as 1.0.2 for the `.d.ts` fix.
3. Repository hygiene: done (above).
4. Claude Code: done (above).

## Next up: character window

Planned 2026-11-11: a `CharacterWindow` component around today's panel,
with a tab strip, a content pane of typed blocks (gauges, stats, fields,
levels, progress) and a gear-set row, all from new optional config fields.
A major (2.0.0): the job menu moves into the gear-set row for every host. The decisions, config shape, work order (six PRs) and the
questions still open are in `docs/character-window-plan.md`.

## Later (candidates, unordered)

- Themes beyond `document` and `game`.
- CMS adapters, Contentful first (on its free plan), as `loadConfig`
  sources. The core never imports a CMS SDK: an adapter is its own entry
  or package, so the allowlist and peer dependencies stay as they are.
- A custom-element wrapper, only if someone asks for one.
- An `a11y-auditor` agent (screen-reader names, keyboard walk-throughs,
  WCAG 1.4.13 on new hover content), if component work grows past what
  axe, the browser specs and the reviewer's accessibility checks catch.
  Left out of step 4: an agent called now and then goes stale.
- Backend code stays out (decided with the site's PR #54): the JSON
  Schema is the contract, which any backend validates in its own language.
  A Python validator package (`find_issues` and its `oneOf` explanation)
  only if someone asks, and then in this repository, so it ships with the
  schema version it checks.
- The import allowlist doesn't see dynamic `import()`, `require()` or
  Vite's `import.meta.glob()`. Add a `no-restricted-syntax` rule if the
  package ever uses them (it doesn't today; `src/examples.test.ts` globs
  `../examples/`, which is fine for a test that never ships).
