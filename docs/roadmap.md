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
- The `edge-cases` findings (a patch; superseded for 2.0.0, where the job
  menu moved to the gear-set row and both accepted limits were tightened:
  see `docs/character-window-plan.md`). "Change job" wrapped onto two
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

- Character window (2026-11-11 to 11-13, six PRs, the plan and what each
  PR measured in `docs/character-window-plan.md`): `CharacterWindow` from
  `/react`, a bar, a tab strip and sub-tabs as links (`?tab=`, `?page=`), a
  content pane of typed blocks (`gauges`, `stats`, `fields`, `levels`,
  `progress`) with groups, two-column runs, collapsible groups, row
  tooltips and actions, and detail windows through the Popover API, beside
  the equipment pane, which gained the gear-set row (the job menu moved
  there). All from new optional config fields with their own `LIMITS`,
  measured on `edge-cases`. The major's other breaks ride along:
  `CharacterSheet` is `EquipmentPanel`, `parts` replaces the `show*`
  props, `tab` and `page` are reserved parameter names, and the tooltip,
  level-label and slot-column limits are tighter. Still no client code but
  `SlotHover` (and, later, the job menu's `JobMenuFocus`, decision 0010),
  and everything works with JavaScript off. The playground and
  demo open on the window. Ships as `2.0.0-beta.N` betas first (next
  entry), then 2.0.0; the site takes it in an upgrade PR of its own (Next
  up, item 5).
- Prereleases (2026-11-13): `release.yml` publishes a version with a `-`
  to npm's `next` dist-tag (npm 11 refuses a prerelease without `--tag`),
  the Demo deploy skips prerelease tags, and `/release-prep` proposes
  `2.0.0-beta.N` until the owner calls the API settled.
- Decision records (2026-11-14): `docs/decisions/`, a template and an
  index, and six records drafted from the history (the extraction, the
  closed JSON Schema, the name, the 2.0 betas, squash-only small PRs, the
  tooling freeze), each with its Why left for the owner. `CLAUDE.md` has
  agents read them before changing what they cover and propose a
  superseding record rather than go against one.
- Workflow rules (2026-11-18): `CLAUDE.md` says PRs are squash-merged
  with the title as the commit subject, the roadmap entry rides in the
  feature's PR, and new tooling waits for a real bug or friction
  (decisions 0005, 0006); the README, `release-prep` and CONTRIBUTING tag
  and describe the squash commit instead of a merge commit.
  `scripts/cleanup-merged.sh` now finds squash-merged branches: a branch
  whose tip is, or is an ancestor of, the head of a PR of that name merged
  into `main` (`gh pr list --state merged --base main`) counts as merged,
  beside the ancestor check that still covers PRs up to #31. Without `gh`
  it says so and keeps those branches.
- 2.0.0-beta.0 (2026-11-18, #34): on npm's `next`, `latest` still 1.0.4.
- Next demo (2026-11-18): `pages.yml` deploys two demos in one Pages
  deploy, built from the release tags npm's dist-tags name: `latest` at
  `/wol-character-panel/`, `next` at `/wol-character-panel/next/` (or
  `latest` again once no beta is newer). It runs after every successful
  release, betas included, and by hand with no input. Chosen over a
  `gh-pages` branch with a `next/` folder and over a second repository or
  host ([decision 0007](decisions/0007-next-demo-for-betas.md), which
  supersedes 0004's "the site tries the betas"). `browser/demo.spec.ts`
  also checks the playground under the `/next/` base.
- Dependency majors (2026-11-11 to 11-18, dev only, no release).
  Dependabot's ESLint 10 (#14) and TypeScript 7 (#15) PRs failed `npm ci`
  on peer ranges: `eslint-plugin-jsx-a11y` 6.10.2 and `eslint-plugin-react`
  7.37.5 allow ESLint up to 9, `typescript-eslint` 8.72–8.73 TypeScript
  below 6.1. Both closed. TypeScript
  moved to `^6.0.3` instead, the newest that `typescript-eslint` allows.
  `dependabot.yml` ignores ESLint majors and TypeScript `>=6.1.0`: a 6.1
  in the grouped minor PR would otherwise fail every dev update with it.
  TS 6 checks side-effect imports by default, so the build (which sees
  only `src/`, not the playground's Vite types) needed `src/css.d.ts` for
  the components' CSS import; it isn't emitted. `dist/`'s `.d.ts` files
  are unchanged and its `.js` loses only a few `//` comments before JSX.
- The portrait badge meets contrast (2026-11-18, the first of the beta.0
  findings recorded in #36): it had no background, so its text sat on the
  host's portrait, on the playground's down to 1.00:1 in `game` and 3.62:1
  at best. It now has an opaque plate, `--cs-badge-bg` (`--cs-panel`
  by default): flat in `document`, with the radius and a rule border in
  `game`. Over an image axe reports text as incomplete, so a browser test
  asks it for a pass with nothing incomplete in both themes and on dark
  host tokens; it failed on the bare badge. The text moves 0.4rem in from
  the corner, inside the plate. The plate hides a little more of the
  portrait, and at-limit badges far more: the badge's limits are #36's
  other finding.
- The badge's limits (2026-11-18, the second of the beta.0 findings
  recorded in #36): `LIMITS.badge`, label and value 24 each, in place of
  `pair`'s 40/80, which tooltip stats and items, and window rows, keep.
  Measured in Chromium on `edge-cases` in both views and themes: at 40/80
  an at-limit badge covered 24% of the portrait wide and 46% at 22rem (six
  lines); at 24/24 it is two lines, 12% and 16%. A 40-character label with
  a 24-character value still made three lines at 22rem. The value matches
  `row.figure`. A break, taken while 2.0.0 is in beta; the site's source
  sets no badge.
- 2.0.0-beta.1 (2026-11-19, #40): both badge fixes, on npm's `next`; the
  Demo deploy put it at `/wol-character-panel/next/`.
- One file for next tasks (2026-11-19): what the character window plan
  left open, folded into Next up and Later below; the plan stays as the
  design record. The owner's uncommitted 2.0 checklist (prereleases,
  decision records, workflow rules) had nothing left: its PRs are the
  Done entries above.
- Rulesets on `main` and `v*` tags (2026-11-19, decision 0008): `main`
  takes only squash-merged PRs with `check`, both `compat` jobs and
  `browser` green, and pushed release tags can't be moved or deleted.
  Admins can bypass the checks only through a PR.
- Narrow tooltips stay inside the panel (2026-11-19, #44, a finding from
  trying beta.1 in `/next/`): in the narrow layout's rows of three, the
  middle column's tooltip opened from its slot's left edge and ran past
  the panel's right, scrolling a 390px or 320px page sideways. It is
  centred on its slot now (the middle column's centre is the panel's).
  A browser test hovers every slot with a tooltip, in both themes, at
  22rem and 18rem and at 390px and 320px viewports, and checks each stays
  inside the panel with no sideways scroll; it failed on the Projects
  slot before.
- The job menu closes on Escape, outside clicks and focus-out (2026-11-19,
  the other finding from trying beta.1, decision 0010): the open `<details>` list
  stayed open when Tab moved on, entirely over the next slot (WCAG 2.4.11),
  and only its toggle closed it, so a README sentence wouldn't do. It is a
  `popover="auto"` list with a `popoverTarget` button now, as the detail
  windows are, anchored below the gear-set row with CSS anchor
  positioning: Escape from anywhere, a click outside, focus back on Escape
  from inside, all without JavaScript. A second client file,
  `JobMenuFocus.tsx` (owner's call), closes it when focus lands outside of
  the menu, as the APG example does. Its box and styles match the
  `<details>` list in both themes at every width measured; without anchor
  positioning it is centred on the screen. Browser tests: its place below
  the row, centred with the anchor positioning block taken out, Tab-out,
  Escape after a hovered slot's tooltip, Escape on a covered slot with
  JavaScript off, Escape inside, a click
  outside, a detail window and the menu closing each other, and
  `/static`; the new close tests failed on
  the `<details>` menu. A markup break (`<details>`, `<summary>`,
  `[open]`), in the CHANGELOG's breaking changes.
- Screenshots and videos in PRs (2026-11-19, decision 0009): the
  `pr-media` skill and `scripts/pr-media.mjs` make #44's hand-made
  before/after shots routine. The playground runs on the branch and on a
  `git archive` copy of `origin/main` side by side; a per-PR script in
  `.logs/` takes cropped shots and captioned `.webm` videos with a cursor
  dot, and stills of each video to check it. The body references them as
  local Markdown and `gh pr edit --attach` (gh 2.99.0+) uploads them and
  rewrites the references, so no browser sign-in; never committed. The
  PR template has a
  Screenshots section. Tried on #44's fix: the before shows the tooltip
  past the panel's edge, the after shows it inside.
- The demo opens on a game character screen (2026-11-20, the owner's
  request): a new `adventurer` example, in the game
  theme, is the playground's and demo's default, so a visitor recognises
  the kind of screen at once. It uses the genre's vocabulary and the
  familiar job names (Paladin, Dragoon, Gunbreaker…: the owner's call,
  including names first coined for that game), the 6+6 gear columns
  (Main Hand to Feet, Off Hand to the rings), Item Level as the badge and
  the game's attribute groups; every proper noun (character, gear,
  guardian, city, allegiance, allied peoples) is invented, and the game
  isn't named (the trademark rule). Three playable jobs (Paladin fully
  geared, White Mage, Black Mage) show the job menu and per-job blocks
  (each its own vitals and attributes).
  `full` became `portfolio` (#48), and every browser test names its theme
  and fixture, so the new defaults changed no test. Still a playground
  example: shipping it as a preset hosts can start from is a later minor
  (Later).
- A portrait upload on the demo (2026-11-20, the owner's request; playground
  only, no API change): a Portrait file input and a Remove portrait button
  in the controls. The chosen image becomes a `blob:` URL in React state,
  set as every job's portrait before `parseConfig`, including jobs without
  one; the example's `framing` is kept, `width` and `height` go with the
  old image, and the alt text is "The image you chose", since the
  example's would describe another picture. Nothing is uploaded, stored or
  put in the page's URL, so it survives job and fixture switches but not a
  reload, as a note under the controls (the input's description) says.
  The old URL is revoked on a new choice or Remove. A browser test
  (`browser/portrait-upload.spec.ts`) chooses a file and checks the
  portrait loads it, across a job switch and on the no-portrait job, the
  URL unchanged, axe on the panel and the controls, and Remove and a
  reload each restoring the example's portrait.
- 2.0.0-beta.2 (2026-11-21, #51): the job menu popover (#47, a markup
  and CSS break) and the narrow tooltip fix (#44), on npm's `next`; the
  owner confirmed the `/next/` demo.
- README trimmed to a host's quick start (2026-11-21, the owner's
  request; 641 lines to about 225): entries, a small config, usage with
  `parts` and `gearSetEnd`, behaviour in brief, theming and versioning.
  The rest moved verbatim into `docs/`: `config.md` (every field),
  `behaviour.md`, `development.md` (checks, tests, playground, the Files
  table) and `releasing.md`. The README links them by absolute GitHub
  URL, since `docs/` doesn't ship and npm shows the README alone.
  CLAUDE.md, CONTRIBUTING, the PR template, the reviewer agent and
  release-prep point at the new files.
- "Modelled on, not copied from" (2026-11-21, the owner's request): a
  paragraph in the demo's header and in the README saying the panel isn't
  a one-to-one copy of the game's character screen, with two of the
  adventurer example's differences (no weapon slot on the job crystal's
  row; DPS on a page of its own in Classes/Jobs), and that the package
  isn't affiliated with the game's publisher. The game stays unnamed (the
  trademark rule). Text only in the header, so the browser tests' Tab
  walk to the panel is unchanged.
- The README says which version it describes, with a Next.js page
  (2026-11-21, the first of the first-impressions docs items): a note at
  the top that it describes 2.0, on `next` until 2.0.0, while a bare
  install gets 1.0.4's `CharacterSheet` (its README linked at the
  `v1.0.4` tag), and the install line uses `@next`. A complete App Router
  `app/page.tsx` under Usage: the config parsed and `publicConfig`'d at
  module level, awaited `searchParams`, `next/link` through `renderLink`
  (`scroll={false}` for job switches), the CSS import. Checked by
  `next build` and `next start` (Next 16.4.6, React 19.3, zod 4.6) in a
  throwaway app on the packed beta.2 tarball, with the page copied out of
  the README: it typechecks, renders, its links are `next/link`, and
  `?job=` switches the job. Screenshots of both themes at the top
  (`adventurer` in `game`, `portfolio` in `document`, from
  `scripts/preview.mjs`), committed under `docs/media/v2/` (not
  published; a new major gets its own folder, so each major's npm pages
  keep its look), compressed to palette PNGs (195 KB to 52 KB) and shown
  by absolute URL from `main`, by the owner's call: decision 0011, which
  supersedes 0009's "never committed" for the README.
- Each demo example opens in its own theme (2026-11-21, the first of the
  first-impressions demo items; playground only, no API change):
  `portfolio`, a résumé, in `document`, the others in `game`, from one
  map in `playground/example-themes.ts` that the main page and `/static`
  both read. The Theme control's default is the example's own, so the
  URL leaves out a theme equal to it, and choosing an example drops
  `theme`, so it opens in its own rather than keeping the last one.
  `browser/playground.spec.ts` checks both, and `no-js.spec.ts` checks
  `/static` with no theme; the existing tests name their theme, so none
  changed.
- The demo's example picker and header (2026-11-21, the rest of the first
  first-impressions demo item; playground only, no API change): the
  "Fixture" control is "Example" (`?fixture=` stays, with the links,
  tests and scripts that use it), listing `adventurer`, `portfolio`,
  `minimal`, then "edge-cases (stress test)"; the header has an intro
  for the chosen example (also the control's description), and the
  version the page was built from with its install line as plain text,
  `@next` when that version is a prerelease. Keyed to the version rather
  than the `/next/` base, since after 2.0.0 `/next/` falls back to
  `latest`'s build while npm's `next` still names a beta; the playground's
  allowlist takes `../package.json` for it, and Vite bundles only
  `version`; the line matches the README's, peers included. The header
  says to hover over a slot or Tab to it (not tap: on touch a slot's tap
  follows its link). All of it is one paragraph, shorter than the one it
  replaced: as separate lines it moved the panel about 65px down, and CI's
  hoverable-tooltip test, moving the pointer onto a bottom-row tooltip in
  a 720px-high viewport, lost it below the fold.
  Each example's theme, intro and place are in
  `playground/example-info.ts` (was `example-themes.ts`). New tests in
  `browser/playground.spec.ts`; its "Fixture" locators follow the label.
- "Show config" on the demo (2026-11-21, the second first-impressions
  demo item; playground only, no API change), since the pitch is "one
  JSON config" and the demo never showed one: a native `<details>`,
  closed, under the panel. It holds the code a host would write for the
  current controls (the imports with the CSS line, `parseConfig` and
  `publicConfig` as in the README's Next.js page, or the whole config
  with Drafts on, and the component with the props the controls set,
  defaults left out but `theme`; a width becomes a wrapper `<div>`) from
  `playground/host-code.ts`, and the example's file as written (Vite's
  `?raw`, so its own formatting and `$schema`). Under the panel so the
  Tab walk to it and its place in CI's 720px viewport don't change; the
  text wraps rather than scrolling in a box. Not on `/static`, which is
  for the panel's no-JavaScript tests and isn't in the demo. New tests
  in `browser/playground.spec.ts`: closed and below the panel, the JSON
  per example, the code following the controls, keyboard and focus
  ring, and axe on it open.
- The README's opening says what the panel is for (2026-11-21, the last
  first-impressions docs item; docs and the demo's header text, no API
  change): a "Use it for" list (a portfolio, a game character sheet, a
  persona card), a line each for job, slot and host, and the
  accessibility the browser tests check, in Chromium only (no JavaScript
  needed, keyboard with focus rings and Escape, axe on WCAG 2.2 A/AA in
  every example, theme and layout), with Firefox, WebKit and screen
  readers named as untested. The "not a copy" paragraph is one line, in
  the README and in the demo's header (shorter, so the panel moves up).
  The line on the-portfolio-site moved to the README's end, and the development and
  releasing links out of its More list (CONTRIBUTING links both). The
  `$schema` line shows the `$id` URL; jsDelivr's `@2` skips prereleases
  (404 today), so the README says to use `@next` until 2.0.0, and
  release-prep's notes take that sentence out with the version note.
- README badges (2026-11-22, the owner's request while preparing beta.3,
  merged before it so beta.3 ships them): CI on `main` (GitHub's own
  badge), the version on npm's `next` tag, the license and the Node
  versions from `engines` (shields.io, read from the registry), and the
  `/next/` demo, each with alt text. Left out: coverage (a Codecov-style
  service is new tooling, decision 0006; Vitest's thresholds already fail
  CI), bundle size, downloads, and a self-made WCAG badge (it would read
  as a certification). The version and Node badges read the `next` tag;
  at 2.0.0 they and the demo badge move to `latest` and the root
  (release-prep step 3). npm's page shows `latest`'s README, so the
  badges reach npm only with 2.0.0; until then they show on GitHub.
- 2.0.0-beta.3 (2026-11-22, #60): the first-impressions README and demo
  work and the badges (#61), no API change, on npm's `next`; provenance
  confirmed by the owner, and the `/next/` demo's bundle reports it.
- Tooltip-only slots open on a tap (2026-11-22, the owner's phone test of
  beta.3's `/next/`, Firefox on Android): a tap on an adventurer slot
  opened nothing, though its rows' tooltips opened and closed as meant.
  Every adventurer slot has a tooltip and a `none` action, so its item
  cards couldn't be seen on a phone. A tap focuses without
  `:focus-visible`, and the `(hover: none)` rule that shows a focused
  row's tooltip was scoped to the content pane. It now covers any
  tooltip-only face (the `tabindex` span, never a link), CSS only. Chosen
  over a first tap that shows and a second that follows (needs
  JavaScript) and over documenting the gap; linked slots stay name-only
  on touch, a known limit in `docs/behaviour.md`. Browser tests tap a
  tooltip-only slot open and closed, check a linked slot's tap still
  navigates, and tap every adventurer slot on a phone-sized window,
  checking each card stays inside the pane's width. A fix, not an API change, so
  it doesn't restart the soak; beta.4 took it to the phone again, where it
  passed (below).
- 2.0.0-beta.4 (2026-11-22, #64): the tooltip-only slot tap fix (#63), no
  API change, on npm's `next`. On a real phone (2026-11-23, Chrome and
  Firefox on Android), a tap on any of the adventurer's slots or rows
  opened its tooltip and a tap elsewhere closed it. An open slot card
  covered the neighbouring slots, so reaching one took a second tap (the
  first closed the card); fixed (next entry).
- A tap on a slot under an open card reaches it (2026-11-24, from the
  beta.4 phone test): on touch screens, `SlotHover.tsx` hands a tap
  (`pointerup`, touch, `(hover: none)`) on an open tooltip to the
  tooltip-only slot or row under it, by focusing it, so its tooltip opens
  and the first closes in one tap. A link or button under the tooltip
  isn't reached: the tap only closes the tooltip, as before. Without
  JavaScript, two taps still work. Chosen over `pointer-events: none` on
  the open tooltip under `(hover: none)` (tried first, CSS only): the
  reviewer found it sends a tap meant to close the card to any link or
  button under it, and the `portfolio` example's Tools card covers five
  links (the React link was followed in a test). Also chosen over moving
  each card clear of its neighbours (no room on a phone). Browser tests
  tap a slot under an open card (`adventurer`) and a row under an open
  tooltip (`edge-cases`; both fail without the hand-off), and a link
  under one, in the panel (`portfolio`) and in a detail window
  (`edge-cases`; both fail with the CSS-only rule). Not covered: a row
  under a row's tooltip inside a detail window, which no example has at
  phone width. Only a `role="group"` face takes the tap, so a host's link
  given a tabindex doesn't, and the focus doesn't scroll, so the tap
  lands where it was aimed. A fix, not an
  API change, so it doesn't restart the soak; a beta.5 takes it to the
  phone.
- Limits in the schema's descriptions come from `LIMITS` (2026-11-24, the
  first of a pre-2.0.0 refactor review): four `.describe()` texts wrote
  their limit as a number ("up to 6 each", "Up to 4 characters", "up to
  2 … 1"), which could drift from what parsing enforces. The generated
  `character-panel.schema.json` is byte-identical, so no API change.
- One `ActionLink` (2026-11-24, from a pre-2.0.0 refactor review): a
  slot's link was a second copy of `ActionLink`'s branches (the own-param
  guard, intents, `aria-current`, "(opens in a new tab)"), and a row's
  focusable tooltip-only face a third copy of its unlinked span.
  `src/ActionLink.tsx` now holds `ActionLink` (out of `GearSet.tsx`, which
  `Blocks.tsx` imported it from), `UnlinkedFace`, and `LinkContext`, the
  seven props an action needs, passed as one in place of five hand-written
  lists. A slot passes the `active` it already asked for, so the host's
  `isParamActive` is still asked once per slot. Every example's
  server-rendered HTML (each job, tab, page, theme, with and without
  `publicConfig`, 762 renders) is the same as `main`'s with attributes
  sorted: React writes them in prop order, which moved for slots. No API
  change.
- One top bar and one set of `parts` defaults (2026-11-24, from a
  pre-2.0.0 refactor review): `EquipmentPanel` and `CharacterWindow` each
  drew the bar and spelled out the six defaults. `EquipmentPanel.tsx` now
  has `Bar` and `resolveParts` (no entry exports them), which the window
  uses beside its own `tabs` and `equipment`. Every example's
  server-rendered HTML, under ten `parts` values from none to several
  off (7,620 renders), is the same as `main`'s. No API change.
- `scripts/compare-markup.mjs` (2026-11-24, the owner's request after
  #68 and #69): the throwaway comparison those two PRs ran, kept as a
  script. The friction (decision 0006): a refactor has to show that
  nothing a host sees changed, and the unit tests check chosen
  attributes, not whole renders. It runs every example through `src/`
  and through a base ref's `src/` (`git archive`, default `origin/main`),
  loaded by Vite's SSR loader, each side with its own code: `parseConfig`
  and `publicConfig` compared as JSON (keys sorted), then the server
  renders compared as HTML (attributes sorted); exit 1 on a difference,
  2 on a setup error or a throw (after review: a crash used to exit 1
  like a difference, and the first version rendered only the current
  side's parsed config on both sides). Its own allowlist entry (`node:`, `vite`, `react`,
  `react-dom/server`). Not in `check.sh`, since a markup change on
  purpose differs by design. Against `origin/main` and against `035493a`
  (before the three refactors): 7,620 renders, 0 differ. Caught: one
  string changed (2,454 renders differ), a `publicConfig` change, and a
  tighter slot column limit (at `parseConfig`). Not reported: a
  key-order-only change in `parseConfig`. A base without
  `CharacterWindow` exits 2.

## Tooling plan (done)

Agreed 2026-11-08 after a review of the repository as extracted.

1. Tests and coverage: done (both PRs, above).
2. Packaging checks: done (above), released as 1.0.2 for the `.d.ts` fix.
3. Repository hygiene: done (above).
4. Claude Code: done (above).

## Next up: 2.0 betas, then 2.0.0

The one list of next tasks. The character window plan
(`docs/character-window-plan.md`) is complete and kept as the design
record; what it left open is here. Feature work toward a stable 2.0.0; no
new tooling meanwhile ([decision 0006](decisions/0006-tooling-freeze.md)).

Done so far: beta.0 in the next demo (the owner ran the Demo workflow by
hand, 2026-11-18); a `scripts/preview.mjs` pass over it (every example,
view, theme, layout and tab; no console or parse errors) found the badge's
contrast and limits, both fixed (Done) and shipped in beta.1.

Then: the site's saved config (2026-11-19), from its public
`GET /character-sheet`, passes beta.1: `parseConfig` reports no issues,
`findUnknownKeys` finds none, every slot and job is kept, and the backend's
`jsonschema` finds nothing against beta.1's schema (`$id` `@2`). Every
value is under its new limit (`levelLabel` 9 of 16, tooltip `note` 98 of
120, `subtitle` 24 of 60, `items` 3 of 5, no badge, the one `param` action
named `stack`) but the side columns: 6 slots each, at the limit, so the
site can't add one there under 2.0.

And beta.1 tried in `/next/` (2026-11-19, with Playwright scripts in
Chromium, touch emulated as an iPhone at 390×844): hover, focus rings, Escape on
focused and hovered tooltips, tab and page links with `aria-current` and
Back, the detail window (Escape, Close and light dismiss return focus;
the second Escape), the job menu by keyboard, a tap on a tooltip-only row,
and no console errors over 52 loads. Not covered: a real phone (item 2),
and Firefox, WebKit and screen readers, which stay gaps (the browser
tests are Chromium only). It found the narrow middle-column tooltips
running past the viewport (fixed in #44, Done; unreleased until beta.2)
and the job menu ignoring Escape and outside clicks (fixed, Done;
unreleased until beta.2).

Demo work the owner wanted before the release, playground only (no API
change, so the soak runs on): the game-styled default and the portrait
upload are both Done (above).

1. **First impressions** (2026-11-21, a review of the demo and the root
   docs as a newcomer reads them; docs and playground only, no API
   change, so the soak runs on). npm's `latest` is 1.0.4 and the demo's
   root is built from it, while the README on GitHub describes 2.0: its
   bare `npm install` gets 1.0.4, which has `CharacterSheet` rather than
   the README's `EquipmentPanel` and `CharacterWindow` (now said at the
   README's top). 2.0.0 ends that,
   and is also when most newcomers will first see the demo and the npm
   page, so these come before it, one small PR each:
   - **demo:** the example picker and header: Done (above), with each
     example in its own theme.
   - **demo:** a "Show config" disclosure: Done (above).
   - **docs:** the README's opening (what it's for, job, slot and host,
     the tested accessibility, the `$schema` URL): Done (above).

   Then beta.3 shipped them to `/next/` (Done), to be seen there before
   2.0.0 puts them at the root.
2. **Soak.** 2.0.0 once a beta has gone about a week without an API
   change ([decision 0004](decisions/0004-2.0-betas-on-next.md)): from
   beta.1 (2026-11-19), 2026-11-26 at the earliest; a new beta that
   changes the API restarts the week. beta.2 (2026-11-21) shipped the
   tooltip fix and the job menu popover to `/next/`. The tooltip fix
   doesn't restart the week, and neither does the job menu's markup
   break (`<details>` to a popover, listed as breaking): the owner's
   call (2026-11-23), so the week still counts from beta.1. beta.3 (2026-11-22) changed only the
   README and the demo, so it doesn't restart the week. On a real phone
   (2026-11-22, Firefox on Android, beta.3's `/next/`), a tap on a
   tooltip-only row opened its tooltip and a tap elsewhere closed it,
   but a tap on a tooltip-only slot opened nothing; fixed (Done, above),
   not an API change, so the week stands. beta.4 (2026-11-22) took the
   fix to `/next/`, and on a real phone again (2026-11-23, Chrome and
   Firefox on Android) a tap on any of the adventurer's slots or rows
   opened its tooltip and a tap elsewhere closed it. An open slot card
   covered the neighbouring slots, so reaching one took a second tap;
   fixed (Done, above), not an API change, so the week stands. A beta.5
   (owner, `/release-prep`) takes the fix to `/next/`, and the owner taps
   a slot under an open card on the phone.
3. **A packed release candidate in the site**, which the next demo doesn't
   cover: `npm pack` here, `npm install <tarball>` in the site's
   `frontend/` (not committed), server-rendered with the site's CSS
   around the panel.
4. **2.0.0 (owner):** `/release-prep` with the API called settled (it
   proposes `2.0.0`; the schema's `$id` has named `@2` since beta.0),
   merge, tag. The demo's `latest` then shows 2.0.0, and `/next/` falls
   back to it. The release PR also takes out the README's version note,
   the `@next` in its install line and the "`@next` in place of `@2`"
   sentence under Config (check the `@2` `$schema` URL resolves once
   2.0.0 is out), and moves the README's badges off `next` (the exact
   values are in release-prep step 3).
5. **The site's upgrade PR**, in its own repository and session (it
   depends on `^1`, so nothing reaches it before then):
   - bump to `^2` and run `npm run generate:character-schema` (the
     backend's copy must accept the new keys before the admin can save
     them);
   - take the renames: `CharacterSheet` → `EquipmentPanel`, the config type
     `CharacterPanelConfig`, `characterPanelConfigSchema`, the CSS and
     schema paths (`character-panel.*`), and `parts` for
     `showSockets`/`showToolbar`;
   - restyle anything that assumed the job menu in the bar (it is in the
     gear-set row now);
   - handle every other break under "Changed (breaking)" in the
     CHANGELOG's 2.0.0-beta.N sections (among them `intent: "tab"`, the
     second Escape, `EquipmentPanelProps` and the default label);
   - switch the home page to `CharacterWindow`, and extend the admin
     editor for the new fields, with its own save button as `gearSetEnd`;
   - point the saved config's `$schema` at the `@2` `$id`: it still names
     `../components/character-sheet/character-sheet.schema.json`, from
     before the extraction (an annotation only, so nothing fails on it).

## Later (candidates, unordered)

- Lift the Dependabot ignores once the plugins allow the versions (check
  their `peerDependencies`): ESLint majors when `eslint-plugin-jsx-a11y`
  and `eslint-plugin-react` both allow ESLint 10; TypeScript `>=6.1.0` as `typescript-eslint` widens its
  range (narrow it to the next blocked version, or drop it).
- If the `browser` job's "Install Chromium" keeps failing on Ubuntu's apt
  archive (it did four times on 2026-11-11, PR #22: `security.ubuntu.com`
  and `azure.archive.ubuntu.com` unreachable from the runner, while
  `packages.microsoft.com` answered), run that job in Playwright's image
  (`mcr.microsoft.com/playwright:v<version>`) instead of
  `install --with-deps`, with a check that the tag matches
  `@playwright/test`. apt retries wouldn't cover a minutes-long outage.
- Themes beyond `document` and `game`.
- The `adventurer` example as a preset hosts can import and edit (for
  example a `presets/` file in the `exports` map): a new export, so a
  minor, once real users are in sight. Gear-like slot icons (images
  through `iconSrc`) would make it closer to the real screen.
- From the character window plan, each only when a real config needs it:
  more `iconName` drawings (adding a name is a minor, removing one a
  major); a job hiding a shared block (today it can only replace one);
  the decorative toolbar's round buttons toggling overlays on the
  portrait (its decision 14).
- CMS adapters, Contentful first (on its free plan), as `loadConfig`
  sources. The core never imports a CMS SDK: an adapter is its own entry
  or package, so the allowlist and peer dependencies stay as they are.
- A custom-element wrapper, only if someone asks for one.
- An `a11y-auditor` agent (screen-reader names, keyboard walk-throughs,
  WCAG 1.4.13 on new hover content), if component work grows past what
  axe, the browser specs and the reviewer's accessibility checks catch.
  Left out of step 4: an agent called now and then goes stale.
- An optional prop for the components' fixed English names (the tab
  strip's "Tabs", a detail window's "Close", "(opens in a new tab)", "No
  portrait yet"), for a host in another language. A minor whenever it
  comes; left out of 2.0.0 until a host needs it.
- Backend code stays out (decided with the site's PR #54): the JSON
  Schema is the contract, which any backend validates in its own language.
  A Python validator package (`find_issues` and its `oneOf` explanation)
  only if someone asks, and then in this repository, so it ships with the
  schema version it checks.
- The import allowlist doesn't see dynamic `import()`, `require()` or
  Vite's `import.meta.glob()`. Add a `no-restricted-syntax` rule if the
  package ever uses them (it doesn't today; `src/examples.test.ts` globs
  `../examples/`, which is fine for a test that never ships).
