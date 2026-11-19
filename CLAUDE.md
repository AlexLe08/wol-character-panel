# CLAUDE.md

Project instructions for Claude Code. Personal working-style preferences
live in `CLAUDE.local.md` (gitignored). Current status and next steps live
in `docs/roadmap.md`. `README.md` is the user-facing reference (entries,
config format, behaviour, theming, releasing); read it before changing any
of those, and update it in the same PR when they change.

## What this is

`@solution-nine/wol-character-panel`: a React panel modelled on an RPG
character screen, driven by one JSON config with a published JSON Schema.
Published to npm (public, MIT) from this repository; `solution-nine` is a
free npm organization owned by the npm user `alexle08`.

It started inside
[the-portfolio-site](https://github.com/AlexLe08/the-portfolio-site)
(`../the-portfolio-site` locally), which is still its main host: the home
page renders it, the admin editor writes configs, and the site's backend
validates saves against a copy of this package's JSON Schema. Changes here
reach the site only through a release and an upgrade there.

## Decision records

`docs/decisions/` holds one record per decision that shapes the package
or the workflow, indexed in its `README.md`.

- Before changing an area a record covers, read the record.
- Don't quietly go against one. Propose a new record that supersedes it,
  in the PR that changes course, and say so in the PR.
- Never write a record's **Why**: draft Context and Consequences from the
  history and leave the Why as `TODO(Alex)` for the owner.

## Commands

- Install: `npm ci`
- `npm run lint`: ESLint, including the import allowlist
- `npm run typecheck`: `tsc -p .`, source and tests
- `npm test`: Vitest with coverage, `src/**/*.test.{ts,tsx}`; fails below
  the thresholds in `vitest.config.ts`, report in `.logs/coverage/`
  (`npx vitest` watches, without coverage)
- `npm run test:browser`: Playwright and axe in Chromium (`browser/`)
  against the playground, which it starts; report in
  `.logs/playwright-report/`. Needs `npx playwright install chromium` once.
- `npm run dev`: the playground (`playground/`, Vite) on the configs in
  `examples/`, rendering `src/` with hot reload. Its state is in the URL
  (`/?fixture=edge-cases&theme=game&width=22`). `/static` is the panel
  server-rendered with no script (`playground/static.tsx`).
- `npm run build:demo`: the playground built for GitHub Pages into
  `playground/dist/`, under the base path `/wol-character-panel/`;
  `.github/workflows/pages.yml` deploys it after each successful release,
  npm's `latest` there and `next` (the newest beta) under
  `/wol-character-panel/next/`, each from its release tag
  ([decision 0007](docs/decisions/0007-next-demo-for-betas.md)).
  In the playground, build links and image paths from
  `import.meta.env.BASE_URL`, never a bare `/`; `browser/demo.spec.ts`
  checks the build under both bases.
- `npm run build`: `tsc -p tsconfig.build.json` to `dist/` (ESM, one `.js`
  and `.d.ts` per source file) plus the CSS; then
  `scripts/strip-dts-css-imports.mjs` blanks the CSS import in the
  `.d.ts` files (TypeScript 6+ fails hosts on it, TS2882)
- `npm run generate:schema`: rewrites `character-panel.schema.json` from
  `src/schema.ts`. Run it after any change to `schema.ts` and commit the
  result; CI fails while the committed file is out of date.
- `npm pack --dry-run`: lists what would be published (`prepack` builds)
- `npm run lint:package`: attw (types resolve for each entry, ESM only)
  then publint, on a fresh pack
- `npm run test:pack`: installs the packed tarball in a temp project and
  imports each entry in plain Node (`scripts/smoke-pack.mjs`;
  `--oldest-peers` for the lowest peers in range). Needs the registry.
- `scripts/check.sh`: everything CI's `check` and `browser` jobs run, and
  `compat`'s oldest-peers smoke test (its Node 22.12 run is CI only), one
  line per step, full logs in `.logs/`. Done means it passes.
- `node scripts/preview.mjs [--fixture=a,b] [--theme=document|game]`:
  screenshots of the panel per example, theme and layout (wide, and
  narrow at 22rem) in `.logs/preview/`, from its own dev server on port
  5198 (a busy port fails), plus console errors and warnings, page
  errors and parseConfig reports; exit 1 on any. The `preview` skill
  runs it.
- `scripts/pr-media.mjs`: helpers for a PR's before/after screenshots and
  videos (the playground on this branch and on `origin/main`, side by
  side), imported by a per-PR script in `.logs/pr-media/`; files land
  there. The `pr-media` skill writes the script, uploads the files and
  embeds them in the PR body
  ([decision 0009](docs/decisions/0009-pr-media-uploaded-not-committed.md)).
- `node scripts/fill-edge-cases.mjs`: rewrites the window's fields in
  `examples/edge-cases.json` at the current `LIMITS`;
  `node scripts/check-edge-cases.mjs` checks each window limit is
  reached (exit 1 if not). Run both after changing a window limit; the
  slot, job and tooltip limits are still filled by hand.
- `scripts/new-worktree.sh <branch>`: the next task's worktree (see
  Workflow); `scripts/setup-worktree.sh` (`npm ci`) runs inside it.
- `scripts/cleanup-merged.sh [--apply]`: after a merge, lists (or with
  `--apply` removes) worktrees and local branches whose PR merged.

To try a change in the site before releasing it, install a packed copy
there (`npm pack` here, then `npm install <path>/<tarball>.tgz` in the
site's `frontend/`), never `npm link` (two copies of React). Don't commit
that install in the site.

## Architecture rules

- The package imports nothing but `react`, `zod` and its own files
  (`./…`, never climbing out with `..`); both are peer dependencies.
  `eslint.config.mjs` enforces it. Scripts may also import `node:` modules
  and `../src/…`, except `scripts/smoke/`, which imports the package by
  name, its peers and `node:` modules (it runs against the tarball),
  and `scripts/preview.mjs` and `scripts/pr-media.mjs`, which import only
  `node:` modules and `@playwright/test`; tests may also import `vitest`
  and `react-dom/server`; `vitest.config.ts` only `vitest/config`; the
  playground may also
  import `react-dom/client`, `react-dom/server`, Vite and `../src/…`;
  the browser tests and `playwright.config.ts` only `@playwright/test`,
  `@axe-core/playwright` and each other (they reach the panel through
  the page). Adding a runtime
  dependency is a design decision for the owner, not an implementation
  detail.
- Public API = the `exports` map in `package.json`, documented in the
  README's Entries table:
  - `.` (`src/index.ts`): data only (parse, resolve, limits, types). No
    React and no CSS, so server code and plain Node can import it.
  - `/react` (`src/react-entry.ts`): the component (`src/EquipmentPanel.tsx`,
    which imports its own CSS) and its prop types.
  - `/schema` (`src/schema-entry.ts`): `characterPanelConfigSchema` only;
    the sub-schemas stay internal so their shape can change.
  - The CSS file and `character-panel.schema.json`.
  Entry files only re-export. Anything not reachable from an entry is
  private and can change freely.
- `src/schema.ts` is the config contract: `LIMITS`, `ID_PATTERN`,
  `PARAM_NAME_PATTERN` and the zod schemas built from them, so each limit
  is written once. Hosts read limits from `LIMITS` and patterns from the
  exported constants, never from zod internals.
- Relative imports name the source file (`./parse.ts`); the build rewrites
  them to `.js`, and Node runs `scripts/generate-schema.mjs` straight from
  `src/`. Keep `LIMITS` in `schema.ts` for that reason.
- The JSON Schema closes every plain `z.object` (`additionalProperties:
  false`), so writers reject unknown keys while `parseConfig` strips them.
  An object meant to stay open uses `z.looseObject`.
- `EquipmentPanel` is a Server Component. `src/SlotHover.tsx` is the only
  `"use client"` file and no entry exports it; the build keeps its
  directive because `tsc` emits one file per source file (don't add a
  bundler).
- Behaviour that works without JavaScript stays that way: tooltips show on
  hover and focus through CSS, the job menu is a `<details>` of links,
  the layout is a container query. Escape dismisses a tooltip (WCAG
  1.4.13). Keep `jsx-a11y` passing and every interactive element
  focusable with a visible `:focus-visible` ring.
- Theming is `--cs-*` variables on `.cs`. The `document` theme (the one
  the site uses) reads the host's `--paper`/`--ink`/`--signal` tokens and
  follows the site's design rules: no gradients, rounded-and-shadowed
  cards, or new accent colors. Inside `.cs[data-cs-theme="game"]` only,
  gradients, rounded frames, shadows and its gold accent are allowed.
- Tests are Vitest, beside the code as `src/*.test.ts(x)`: unit tests for
  the data side (`parse`, `resolve`), and the panel server-rendered with
  `react-dom/server` in Node (`src/EquipmentPanel.test.tsx`; no DOM).
  `src/entries.test.ts` snapshots each entry's runtime export names:
  changing that snapshot is a semver decision (removal is major), not a
  fix. Coverage thresholds in `vitest.config.ts` sit just under the
  current numbers; raise them when coverage rises, never lower them to
  pass. Every `examples/*.json` must parse cleanly
  (`src/examples.test.ts`) and render (`src/EquipmentPanel.test.tsx`).
- What needs a browser is Playwright, in `browser/*.spec.ts`, against the
  playground: tooltips on hover and focus, Escape, focus rings, the
  container query, axe (WCAG 2.2 A/AA) on every example in both themes and
  layouts, and `/static` with JavaScript off. Coverage doesn't see these
  (`SlotHover.tsx` stays low in Vitest's numbers). Still check a release
  candidate in the site with a packed copy, since it renders on the server
  with its own CSS around the panel.

## Versioning and releases

- Semver, keyed to the config contract. The schema `$id` is
  `https://cdn.jsdelivr.net/npm/@solution-nine/wol-character-panel@<major>/character-panel.schema.json`,
  built from `name` and the major part of `version`.
  - Compatible (new optional field, looser limit, new export): minor or
    patch; the `$id` keeps its major.
  - Breaking (new required field, tighter limit, removed key or export,
    changed behaviour a host relies on): major bump, then
    `npm run generate:schema` so the `$id` follows. The site depends on
    `^1`, so a major reaches it only through an upgrade PR there that
    handles the break. Say what breaks in the PR.
- A PR that changes anything a host can see adds a line under Unreleased
  in `CHANGELOG.md`. A release is a version-bump PR (`release: X.Y.Z`)
  that turns Unreleased into the new version, merged, then the owner tags
  its squash commit on `main` (`git tag vX.Y.Z && git push origin vX.Y.Z`).
  `.github/workflows/release.yml` checks the tag against `package.json`,
  runs the checks, and publishes with npm trusted publishing (no token,
  provenance from npm), to the `next` dist-tag when the version is a
  prerelease (`2.0.0-beta.N`, while 2.0 is unreleased); the Demo deploy
  then shows it under `/next/`. Never publish from a local machine. The owner
  starts that PR with `/release-prep` (`.claude/skills/`), which proposes
  the bump and waits for a yes; it never tags.
- Betas are tried in the next demo, not the site, which stays on 1.x for
  now ([decision 0007](docs/decisions/0007-next-demo-for-betas.md)).
  After a stable release, the site upgrades in its own repository and session:
  bump the dependency in its `frontend/`, run
  `npm run generate:character-schema` there, and commit both.

## Hard constraints

- Free tiers only (npm, GitHub Actions, jsDelivr). Never configure or
  suggest anything that needs a payment method.
- CI's job id is `check` (`.github/workflows/ci.yml`). Don't add `paths:`
  filters to its `pull_request` trigger.
- Node: `engines` says `>=22.12`, for hosts that load the ESM output
  without a bundler (Vitest 5 needs it here too); CI runs Node 24, like
  the site and Vercel. Output is ESM only, no CommonJS build.
- Dependency ranges are open upward. When something breaks after a fresh
  install, check the library's changelog first.
- No "Eorzea" or other Square Enix trademarks in names or published text.

## Workflow

- Rulesets protect `main` and `v*` tags
  ([decision 0008](docs/decisions/0008-rulesets-on-main-and-tags.md)):
  branch off `main`, PR, CI green (`check`, both `compat` jobs and
  `browser` are required), owner merges (by convention: the ruleset can't
  tell a session from the owner). Direct pushes to `main` are
  refused, and a pushed release tag can't be moved or deleted. Renaming
  a CI job means updating the ruleset. Keep PRs small, one change each;
  a large change is a series of them, each passing the checks.
- PRs are squash-merged, the only merge the repository allows
  ([decision 0005](docs/decisions/0005-small-prs-squash-only.md)): the PR
  title and body become the one commit on `main`, so write the title like
  a commit subject (`fix: …`, `docs: …`). GitHub deletes the branch on
  merge.
- New tooling (dependencies, workflows, scripts, agents, skills, checks)
  only for a real bug or real friction, named in the PR; feature work
  comes first ([decision 0006](docs/decisions/0006-tooling-freeze.md)).
  Maintaining what exists isn't new tooling.
- Each task starts in a new worktree under `.claude/worktrees/`
  (gitignored): `scripts/new-worktree.sh <branch>` branches from the latest
  `origin/main` with no upstream, into `.claude/worktrees/<branch, / as ->`,
  and runs `npm ci` there; then switch the session into it. With no
  upstream, a bare `git push` can't hit `main`; push with
  `git push -u origin <branch>`.
- Once the PR has merged and its remote branch is deleted, run
  `scripts/cleanup-merged.sh` (a dry run), then `--apply`: it removes each
  worktree and local branch whose remote branch is gone and which is
  merged (an ancestor of `origin/main`, or, squash-merged, no further
  than the head of a PR merged into `main`, asked of GitHub with `gh`),
  and nothing else. A dirty worktree is refused (no
  `git worktree remove --force`); a branch goes with `git branch -D` only
  after that check. It skips the worktree it is called from and the one
  the script lives in, so a session cleans up its own worktree after
  creating the next one and switching to it.
- Scratch files (probe scripts, logs) go in the worktree's `.logs/`
  (gitignored).
- Tests: never delete, skip, or loosen a test, or change its expected
  values, to make a check pass. If a test looks wrong, stop and report
  why. New behaviour gets new tests.
- Stay inside the task: no drive-by refactors, renames, or new
  dependencies; list what you noticed instead.
- Commit in small logical steps; Claude may commit and push its task
  branch (never `--force`). The `reviewer` subagent (`.claude/agents/`)
  reviews the branch before the PR is opened; only the owner approves,
  merges, and pushes release tags.
- A PR with a visible change (rendering, CSS, examples, hover or focus
  behaviour) shows it in its body: before/after screenshots, and a short
  video when it's behaviour, made and uploaded with the `pr-media` skill.
  Media is never committed. Other PRs say "None: no visible change."
- The roadmap's Done entry goes in the feature's own PR, not in a
  follow-up (no "add the PR number" commits after merging).
