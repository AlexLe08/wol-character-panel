# Development

Working on the package itself: the checks, the tests, the playground and
the repository's files. [CONTRIBUTING.md](../CONTRIBUTING.md) says how to
send a change, and [releasing.md](releasing.md) how a release is made.

The package imports nothing but React and zod (`eslint.config.mjs`
enforces it).

```sh
npm ci
npx playwright install chromium   # once, for the browser tests
scripts/check.sh    # lint, typecheck, test, schema up to date, build, demo build, pack, package checks, browser
```

## Tests

```sh
npm test            # once, with coverage
npx vitest          # watch, without coverage
```

Vitest, beside the code as `src/*.test.ts(x)`. The data side (`parse`,
`resolve`) has unit tests; the panel is rendered to HTML with
`react-dom/server` in Node (`src/EquipmentPanel.test.tsx`), which is what a
host serves before hydration. `src/entries.test.ts` lists each entry's
runtime exports, so removing one fails a test (it would be a major release).
`npm test` fails when coverage drops below the thresholds in
`vitest.config.ts`; the report is in `.logs/coverage/index.html`.

```sh
npm run test:browser                        # Playwright, in Chromium
npx playwright test --ui                    # the same, step by step
npx playwright show-report .logs/playwright-report
```

What needs a real browser is in `browser/`, run by Playwright against the
playground (it starts its own on port 5199, and fails if the port is busy):
tooltips on hover and keyboard focus, Escape hiding them, a focus ring on
everything Tab reaches, the wide and narrow layouts, and axe (WCAG 2.2 A and
AA) on every example in both themes and both layouts. The no-JavaScript
tests load `/static`, the panel server-rendered with no script, with
JavaScript off. axe can't measure text over the game theme's gradients
(it reports it incomplete, not passed), so a test pins an empty slot's
glyph to its label's colour, which clears 4.5:1 in both themes. The demo
tests build the demo site and serve it under `/wol-character-panel/` on
port 5200, and under `/wol-character-panel/next/` (as the next demo) on
5201, and check its images and links take each base path.

## Package checks

```sh
npm run lint:package                        # attw, then publint
npm run test:pack                           # the tarball in plain Node
node scripts/smoke-pack.mjs --oldest-peers  # the same, react 19.0.0 and zod 4.0.0
```

These check what gets published rather than the source. `lint:package` runs
[attw](https://github.com/arethetypeswrong/arethetypeswrong.github.io), which
packs the package and checks each entry's types resolve under Node's and
bundlers' module resolution (CommonJS is skipped: the package is ESM only; so
is the CSS export, which has no types), then
[publint](https://publint.dev), which checks `package.json` against the
packed files. `test:pack` installs the tarball in a throwaway project and
imports each entry by name: `.` and `/schema` with zod but no React
installed, then `/react` server-rendered once React is added (its CSS import
stubbed, as a bundler would handle it). It also checks `dist/SlotHover.js`
and `dist/JobMenuFocus.js` still start with `"use client"`. It needs the
npm registry (or npm's cache) for the peers.

CI runs these in `check` (Node 24, latest peers), and in `compat`, with the
tests, on Node 22.12 (the `engines` floor) and with the oldest peers the
ranges allow.

## Preview locally

```sh
npm run dev         # http://localhost:5173
```

The playground renders the panel straight from `src/` with hot reload, on any
config in `examples/`. Its controls (view, example, theme, labels, sockets,
toolbar, end control, container width, dark host tokens, drafts) are query
parameters, so every state is a link, such as
`/?fixture=edge-cases&theme=document&width=22` (the Example control's
parameter is `fixture`). It opens on the `adventurer`
example in the game theme, and shows `CharacterWindow`. Each example opens
in its own theme (`portfolio` in `document`, the others in `game`), so
choosing one drops `theme` from the
URL, which leaves out a theme equal to the example's own. The header shows
an intro for the chosen example and the install line for the version the
page was built from (`@next` for a prerelease), and the Example control
lists `edge-cases` last, as a stress test; each example's theme, intro and
place are in `playground/example-info.ts`;
`view=equipment` shows `EquipmentPanel` alone. Like a host, it reads `?job=`,
`?tab=`, `?page=` and the param actions' parameters from the URL and passes
`isParamActive`; a `link` action shows where a host would go instead of
leaving the page. Portrait tries an image of your own as every job's
portrait; it stays in the tab (a `blob:` URL, not a query parameter), so
nothing is uploaded and a reload clears it. "Show config", a closed
`<details>` under the panel, shows the code a host would write for the
current controls (imports, `parseConfig`, the component and its props, from
`playground/host-code.ts`) and the example's file as written (without
a chosen portrait). It renders on the client, while hosts render the panel on the server; `/static?fixture=portfolio&theme=document&width=22` shows the server-rendered panel
with no script (view, fixture, theme, labels, width, `job`, `tab` and `page`
from the query; with no theme, the example's own).
Check a release candidate in a host too (below).

The demo site is this page built with Vite (`npm run build:demo`, into
`playground/dist/`), served from `/wol-character-panel/`: the panel's links
take that base path, and the examples' root-relative image paths
(`/portrait.svg`) are prefixed with it. `/static` is dev-server only, so the
demo doesn't have it. The next demo is the same page built under
`/wol-character-panel/next/` (`npx vite build playground --base
/wol-character-panel/next/`). To look at the build locally:

```sh
npm run build:demo && npx vite preview playground --base /wol-character-panel/
```

`node scripts/preview.mjs` screenshots the panel and the window (once per
tab) for every example, in both themes, wide and narrow (22rem), into
`.logs/preview/`, and lists any console error or warning (exit 1 if there is
one). `--fixture=portfolio`, `--view=window` and `--theme=game` narrow it down. It starts its own dev server on port 5198 and
needs Chromium (`npx playwright install chromium`).

A PR with a visible change shows it in its body with before/after
screenshots, and a short video when the change is behaviour
([decision 0009](decisions/0009-pr-media-uploaded-not-committed.md)).
`scripts/pr-media.mjs` runs the playground on the branch and on a copy of
`origin/main` side by side, each on a free port, and takes cropped shots
and captioned `.webm` videos into `.logs/pr-media/`, from a short per-PR
script there (usage in its header). The files are uploaded to the PR on
GitHub, never committed.

A refactor shows the opposite: that nothing a host sees changed. The unit
tests check chosen elements and attributes, not whole renders, so
`node scripts/compare-markup.mjs` server-renders every example from `src/`
and from `origin/main`'s `src/` (`--base=<ref>` for another) and compares
the HTML: each job, theme, tab and page, parsed and through
`publicConfig`, with `isParamActive` true, false and absent, and ten
`parts` values, as `EquipmentPanel` and `CharacterWindow` (7,620 renders
today). Each link's intent is written into the HTML, and attributes are
sorted within each tag, since React writes them in prop order. It exits 1
on a difference, printing the first and writing up to 20 to
`.logs/compare-markup/diffs.json`. It isn't part of `scripts/check.sh`: a
PR that changes the markup on purpose differs by design. A refactor PR
says how many renders it compared.

Relative imports name the source file (`./parse.ts`): the build rewrites them
to `.js`, and Node can run the schema generator straight from `src/`. After
changing `src/schema.ts`, run `npm run generate:schema` and commit the JSON
Schema with it. A host that keeps its own copy (like the portfolio site's
backend) copies it from the installed package.

To try a change in a host before releasing it, install a packed copy rather
than linking (`npm link` can load two copies of React):

```sh
npm pack                                # writes solution-nine-wol-character-panel-<version>.tgz
npm install ../wol-character-panel/solution-nine-wol-character-panel-<version>.tgz   # in the host
```

## Files

| File | Purpose |
| --- | --- |
| `src/index.ts` | The data-side entry (re-exports only) |
| `src/schema.ts` | `LIMITS`, `ID_PATTERN`, `PARAM_NAME_PATTERN` and the zod schemas built from them: the config contract |
| `src/schema-entry.ts` | The `/schema` entry (re-exports only) |
| `src/types.ts` | Types inferred from the schemas |
| `src/parse.ts` | `parseConfig` (drops invalid jobs, tabs and blocks, reports errors) and `loadConfig` (fallback chain of sources) |
| `src/resolve.ts` | `publicConfig`, `resolveJob`, `resolveTab`, `withQuery`, and the links built on it: `jobHref`, `tabHref`, `actionHref` |
| `src/react-entry.ts` | The `/react` entry (re-exports only) |
| `src/EquipmentPanel.tsx` | The panel (a Server Component): the section and the bar around `EquipmentBody`; also `Bar` and `resolveParts` (the `parts` defaults), which the window shares |
| `src/CharacterWindow.tsx` | The window (a Server Component): the section, the bar, the tab strip and sub-tabs, the content pane, and `EquipmentBody` as the equipment pane |
| `src/Blocks.tsx` | The content pane's blocks and their rows. Private |
| `src/Tooltip.tsx` | The tooltip card slots and rows share. Private |
| `src/EquipmentBody.tsx` | The equipment pane's inside: the gear-set row, header and body (slots, tooltips, portrait). Private: no entry exports it |
| `src/GearSet.tsx` | The gear-set row: its links, the job menu, the caption and the end control. Private |
| `src/ActionLink.tsx` | An action as a link, for slots, block rows and gear-set links alike (intents, `aria-current`, new-tab text), or a face with no link. Private |
| `src/icons.tsx` | The built-in drawings (`iconName`, the job menu's, the toolbar's) and the icon precedence. Private |
| `src/SlotHover.tsx` | Client code: Escape dismisses a tooltip. Private: no entry exports it |
| `src/JobMenuFocus.tsx` | Client code: the job menu closes when focus lands outside it. Private: no entry exports it |
| `src/character-panel.css` | Styles and themes; everything themable is a `--cs-*` variable |
| `character-panel.schema.json` | Generated JSON Schema for editing a config file by hand |
| `examples/` | Sample configs (`adventurer`, a game character screen; `portfolio`, a résumé; `minimal`; `edge-cases` with every field at its limit); tests check each one parses cleanly and renders |
| `playground/` | The local preview (`npm run dev`), and `/static`, the panel server-rendered with no script (`static.tsx`). Built for the demo site by `npm run build:demo`. Not published |
| `browser/` | Browser tests (`npm run test:browser`): Playwright and axe against the playground |
| `docs/media/v<major>/` | The README's screenshots, one folder per major (`v2/`): `scripts/preview.mjs` shots compressed to palette PNGs, shown by absolute URL from `main` ([decision 0011](decisions/0011-readme-screenshots-committed.md)). Not published |
| `scripts/generate-schema.mjs` | Regenerates the JSON Schema (`npm run generate:schema`) |
| `scripts/strip-dts-css-imports.mjs` | The build's last step: blanks the CSS import in the emitted `.d.ts` files, which TypeScript 6+ would reject in a host |
| `scripts/smoke-pack.mjs` | Installs the packed tarball in a throwaway project and runs `scripts/smoke/` there (`npm run test:pack`) |
| `scripts/check.sh` | Runs every check CI runs, one line per step, full logs in `.logs/` |
| `scripts/fill-edge-cases.mjs` | Rewrites the window's fields in `examples/edge-cases.json` at the current `LIMITS` |
| `scripts/check-edge-cases.mjs` | Checks that `examples/edge-cases.json` reaches every window limit (exit 1 if not) |
| `scripts/pr-media.mjs` | Helpers for a PR's before/after screenshots and videos: the playground on the branch and on `origin/main` side by side (the `pr-media` skill) |
| `scripts/compare-markup.mjs` | For a refactor: every example's server-rendered HTML from `src/` against a base ref's (default `origin/main`), exit 1 on a difference |
| `scripts/new-worktree.sh` | A new branch from `origin/main` in its own worktree under `.claude/worktrees/`, set up by `scripts/setup-worktree.sh` (`npm ci`) |
| `scripts/cleanup-merged.sh` | After a merge: removes worktrees and local branches merged into `origin/main` whose remote branch is gone (dry run unless `--apply`) |
| `eslint.config.mjs` | Lint rules (React, hooks, jsx-a11y, TypeScript) and the import allowlist (`npm run lint`) |
| `tsconfig.json` | Compiler options for editors and `npm run typecheck` (tests, the playground, the browser tests and both test configs included) |
| `vitest.config.ts` | Which tests run (`src/**/*.test.{ts,tsx}`), and coverage: every source file in `src/` (not the tests or CSS), its thresholds, the report in `.logs/coverage/` |
| `playwright.config.ts` | The browser tests: Chromium, the playground started on port 5199, the demo build on 5200 and the next demo's on 5201, the report in `.logs/playwright-report/` |
| `tsconfig.build.json` | `npm run build`: one `.js` and `.d.ts` per source file in `dist/`, so `SlotHover.js` and `JobMenuFocus.js` keep their `"use client"` |
| `.github/workflows/ci.yml` | On every pull request: `check` (lint, type-check, tests with coverage thresholds, the schema up to date, build, demo build, pack, package lint and the tarball smoke test), `compat` (type-check, tests and the smoke test on Node 22.12, and with the oldest peers) and `browser` (the Playwright tests) |
| `.github/workflows/release.yml` | Publishes to npm when a `v*` tag is pushed (its actions pinned by commit SHA) |
| `.github/workflows/pages.yml` | Deploys the demos (the built playground) to GitHub Pages after each successful release, or by hand: npm's `latest` at the root and `next` under `/next/`, each built from its release tag (its actions pinned by commit SHA) |
| `.github/dependabot.yml` | Weekly update PRs for dev dependencies and the workflows' actions (not the peer ranges), each release a week old first |
| `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/` | The PR checklist with its semver line and Screenshots section; bug and feature forms |
| `CHANGELOG.md` | What changed for hosts in each release |
| `CONTRIBUTING.md`, `SECURITY.md` | How to send a change; how to report a vulnerability privately |
| `.nvmrc` | Node 24 for development, as CI (the package supports 22.12+) |
