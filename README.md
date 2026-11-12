# Character panel (`@solution-nine/wol-character-panel`)

A panel modelled on an RPG character/equipment screen:

```
title bar ............................ character name
[a] [b] [job menu]  caption                     [end]
[slot]  level / emblem + job title               [slot]
[col]   portrait (optional corner badge)          [col]
```

The two header slots sit either side of the job title (think main weapon and
job stone), and the left and right columns hold up to 6 slots each. Above them, a
gear-set row holds icon links, the job menu and a caption. Each slot shows a
compact item-card tooltip on hover or keyboard focus. Clicking it goes to a page
section, another page, or an external site. Changing the job (`?job=<id>`) swaps the slots, tooltips, and
portrait, and the host page can swap its own content too.

It imports nothing but React and zod, enforced by `eslint.config.mjs`. It
ships as ES modules with type declarations (no CommonJS build), so it needs a
bundler or Node 22.12+. It runs the home page of
[the-portfolio-site](https://github.com/AlexLe08/the-portfolio-site), where it
started.

```sh
npm install @solution-nine/wol-character-panel react zod
```

Try it at <https://alexle08.github.io/wol-character-panel/>: the playground
(below) on the example configs, as of the latest release.

## Entries

| Import | What it holds |
| --- | --- |
| `@solution-nine/wol-character-panel` | `parseConfig`, `loadConfig`, `findUnknownKeys`, `publicConfig`, `resolveJob`, `jobHref`, `resolveTab`, `tabHref`, `actionHref`, `withQuery` (sets or removes query parameters on an href, keeping the rest; `jobHref`, `tabHref` and `actionHref` are built on it), the config types, and the limits as plain values: `LIMITS` (max lengths and counts, grouped like the config), `ID_PATTERN` and `PARAM_NAME_PATTERN`. No React or CSS, so server code and plain Node can use it |
| `@solution-nine/wol-character-panel/react` | `EquipmentPanel`, `EquipmentPanelProps`, `EquipmentPanelParts`, `LinkRendererProps`. The component imports its own CSS |
| `@solution-nine/wol-character-panel/schema` | `characterPanelConfigSchema`, the whole config's zod schema. Its parts are internal |
| `@solution-nine/wol-character-panel/character-panel.css` | The styles, for hosts that want to control CSS order |
| `@solution-nine/wol-character-panel/character-panel.schema.json` | The JSON Schema other backends validate against |

`react` and `zod` are peer dependencies: the host provides them.

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
| `src/EquipmentPanel.tsx` | The panel (a Server Component): the section and the bar around `EquipmentBody` |
| `src/EquipmentBody.tsx` | The equipment pane's inside: the gear-set row, header and body (slots, tooltips, portrait). Private: no entry exports it |
| `src/GearSet.tsx` | The gear-set row and the links its actions make. Private |
| `src/icons.tsx` | The built-in drawings (`iconName`, the job menu's, the toolbar's) and the icon precedence. Private |
| `src/SlotHover.tsx` | The only client code: Escape dismisses a tooltip. Private: no entry exports it |
| `src/character-panel.css` | Styles and themes; everything themable is a `--cs-*` variable |
| `character-panel.schema.json` | Generated JSON Schema for editing a config file by hand |
| `examples/` | Sample configs (`full`, `minimal`, `edge-cases` with every field at its limit); tests check each one parses cleanly and renders |
| `playground/` | The local preview (`npm run dev`), and `/static`, the panel server-rendered with no script (`static.tsx`). Built for the demo site by `npm run build:demo`. Not published |
| `browser/` | Browser tests (`npm run test:browser`): Playwright and axe against the playground |
| `scripts/generate-schema.mjs` | Regenerates the JSON Schema (`npm run generate:schema`) |
| `scripts/strip-dts-css-imports.mjs` | The build's last step: blanks the CSS import in the emitted `.d.ts` files, which TypeScript 6+ would reject in a host |
| `scripts/smoke-pack.mjs` | Installs the packed tarball in a throwaway project and runs `scripts/smoke/` there (`npm run test:pack`) |
| `scripts/check.sh` | Runs every check CI runs, one line per step, full logs in `.logs/` |
| `scripts/fill-edge-cases.mjs` | Rewrites the window's fields in `examples/edge-cases.json` at the current `LIMITS` |
| `scripts/check-edge-cases.mjs` | Checks that `examples/edge-cases.json` reaches every window limit (exit 1 if not) |
| `scripts/new-worktree.sh` | A new branch from `origin/main` in its own worktree under `.claude/worktrees/`, set up by `scripts/setup-worktree.sh` (`npm ci`) |
| `scripts/cleanup-merged.sh` | After a merge: removes worktrees and local branches merged into `origin/main` whose remote branch is gone (dry run unless `--apply`) |
| `eslint.config.mjs` | Lint rules (React, hooks, jsx-a11y, TypeScript) and the import allowlist (`npm run lint`) |
| `tsconfig.json` | Compiler options for editors and `npm run typecheck` (tests, the playground, the browser tests and both test configs included) |
| `vitest.config.ts` | Which tests run (`src/**/*.test.{ts,tsx}`), and coverage: every source file in `src/` (not the tests or CSS), its thresholds, the report in `.logs/coverage/` |
| `playwright.config.ts` | The browser tests: Chromium, the playground started on port 5199 and the demo build on 5200, the report in `.logs/playwright-report/` |
| `tsconfig.build.json` | `npm run build`: one `.js` and `.d.ts` per source file in `dist/`, so `SlotHover.js` keeps its `"use client"` |
| `.github/workflows/ci.yml` | On every pull request: `check` (lint, type-check, tests with coverage thresholds, the schema up to date, build, demo build, pack, package lint and the tarball smoke test), `compat` (type-check, tests and the smoke test on Node 22.12, and with the oldest peers) and `browser` (the Playwright tests) |
| `.github/workflows/release.yml` | Publishes to npm when a `v*` tag is pushed (its actions pinned by commit SHA) |
| `.github/workflows/pages.yml` | Deploys the demo (the built playground) to GitHub Pages after each successful release, or by hand for a given tag (its actions pinned by commit SHA) |
| `.github/dependabot.yml` | Weekly update PRs for dev dependencies and the workflows' actions (not the peer ranges), each release a week old first |
| `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/` | The PR checklist with its semver line; bug and feature forms |
| `CHANGELOG.md` | What changed for hosts in each release |
| `CONTRIBUTING.md`, `SECURITY.md` | How to send a change; how to report a vulnerability privately |
| `.nvmrc` | Node 24 for development, as CI (the package supports 22.12+) |

## Config

A config is plain JSON. Add `"$schema"` pointing at
`character-panel.schema.json` to get autocomplete and validation in your editor.
The JSON Schema rejects unknown keys, so a typo like `subtitel` is an error
when writing a config, while `parseConfig` strips unknown keys when reading one
(`findUnknownKeys` lists them).

The schema's `$id` is
`https://cdn.jsdelivr.net/npm/@solution-nine/wol-character-panel@2/character-panel.schema.json`
(1.x published it as `@1/character-sheet.schema.json`).
`scripts/generate-schema.mjs` builds it from `name` and the major part of
`version` in `package.json`, so it names the contract, not a release:

- A compatible schema change (a new optional field, a looser limit) keeps
  `@2`.
- A breaking change (a new required field, a tighter limit, a removed key)
  bumps the major version in `package.json`, which changes the `$id` to `@3`.

```json
{
  "title": "Character profile",
  "defaultJobId": "healthcare",
  "slots": [
    { "id": "core", "label": "Core stack", "position": "header-start", "icon": "◆" },
    { "id": "skills", "label": "Skills", "position": "left", "icon": "Sk" }
  ],
  "jobs": [
    {
      "id": "healthcare",
      "name": "Healthcare",
      "title": "Developer in healthcare",
      "icon": "Hc",
      "level": { "label": "Lv.", "value": "4" },
      "portrait": { "src": "https://…/me.jpg", "alt": "…", "framing": "face" },
      "badge": { "label": "Projects", "value": "3" },
      "slots": {
        "skills": {
          "tooltip": {
            "title": "Skills",
            "tags": ["Most relevant first"],
            "stat": { "label": "Years", "value": "4" },
            "items": [{ "label": "Front end", "value": "React, TypeScript" }, "Accessibility"]
          },
          "action": { "kind": "anchor", "target": "skills" }
        }
      },
      "sections": { "skills": "Markdown the host page renders under #skills" }
    }
  ]
}
```

- **Slots** are the layout, and their labels are free text. `position` is one
  of `left` or `right` (6 per column fills it), or `header-start` or
  `header-end` (one each).
- **Empty slots:** a slot that a job doesn't fill renders as a dimmed empty
  square.
- **Square icons:** a slot's square shows its `icon` glyph, or a job can set an
  image per slot with `iconSrc`.
- **Actions** have one of these kinds:
  - `anchor`: a same-page `#id`.
  - `link`: a site path.
  - `external`: an http(s) URL, opening in the same tab unless `newTab` is set.
  - `param`: the current page (keeping `?job=`) with one query parameter
    set, e.g. `{ "kind": "param", "name": "stack", "value": "React", "target": "projects" }`
    links to `/?stack=React#projects`. `target` is optional. The host page
    reads the parameter; the panel doesn't. `name` can't be `job`, `tab` or
    `page`, which the panel uses, and one matching the host's `jobParam`
    renders tooltip-only. Links go through
    `renderLink` with `intent: "param"`. To mark the slot whose value the
    page is applying (a filter that's on), pass `isParamActive(name, value)`:
    the panel can't read the page's parameters or know how the host matches
    them. That slot gets `aria-current="true"` and a highlight.
  - `none`: tooltip only.
- **Status:** a job's `status` is `published` (the default when it's left
  out), `draft` (not ready yet) or `hidden` (taken off the site). Pass the
  config through `publicConfig()` before rendering it for visitors: it leaves
  out drafts and hidden jobs, so they aren't in the job menu and a `?job=`
  link to one falls back to the default job. Editors use the whole config.
  The default job must be published, and a config needs at least one
  published job: `parseConfig` reports both, falling back to the first
  published job or, with none, rejecting the config.
- **Sections** are data for the host page. The panel doesn't render them.
- **Tooltips** hold `tags`, `title`, `subtitle` (which defaults to the slot's
  label), one `stat` line, and `items`. Plain strings render as a list; label
  and value pairs render as a two-column table. There's also a `note`.
- **Portrait:** it fills the frame between the columns. `framing` picks the
  crop: `face` keeps the top, `full` centers. With no portrait, a placeholder
  silhouette is shown.

### Tabs, blocks and the gear-set row

These optional fields describe the rest of a character window: a name in the
bar, a row above the job header, and a content pane of tabs. `EquipmentPanel`
draws the name and the row; the tabs are for the window component, which is
in progress. A config without them stays valid, and `parseConfig`,
`publicConfig`, `resolveTab` and `tabHref` handle them already, so an editor
can start writing them.

```json
{
  "characterName": "Alex Le",
  "gearSet": {
    "label": "Résumé", "value": "v14 · Nov 2026",
    "jobMenu": { "label": "Change job", "iconName": "note" },
    "links": [
      { "label": "Contact", "iconName": "person", "action": { "kind": "anchor", "target": "contact" } },
      { "label": "Download", "iconName": "save", "position": "end", "action": { "kind": "link", "href": "/resume.pdf" } }
    ]
  },
  "tabs": [
    { "id": "attributes", "label": "Attributes", "iconName": "crest", "blocks": [
      { "type": "gauges", "id": "vitals", "rows": [{ "label": "Years", "value": "6", "fill": 100, "tone": "primary" }] }
    ] },
    { "id": "skills", "label": "Skills", "pages": [
      { "id": "build", "label": "Build", "blocks": [
        { "type": "levels", "groups": [{ "label": "Front end", "rows": [
          { "label": "React", "level": "4", "fill": 90, "action": { "kind": "job", "id": "frontend" } }
        ] }] }
      ] }
    ] }
  ],
  "jobs": [
    { "id": "healthcare", "…": "…",
      "gearSet": { "label": "Résumé", "value": "Healthcare" },
      "blocks": { "vitals": { "type": "gauges", "rows": [{ "label": "Years", "value": "3", "fill": 50 }] } } }
  ]
}
```

- **`characterName`:** text at the right of the bar.
- **Tabs** have an `id` (used as `?tab=<id>`), a `label`, and either `blocks`
  (an ordered list) or `pages` (sub-tabs, each with an `id` used as
  `?page=<id>`, a `label` and its own `blocks`), not both. Up to 6 tabs, 4
  pages per tab and 8 blocks per tab or page.
- **Blocks** have a `type`, an optional heading (`label`, icon) and an
  optional `id`, unique across all tabs, which a job can replace them by:
  - `gauges`: 1 to 4 `rows` of `label`, `value`, `secondary`, `fill` and
    `tone` (`primary` or `secondary`).
  - `stats`: `groups` of `rows` of `label`, `value` and `tone` (`default`,
    `muted` or `highlight`).
  - `fields`: `rows` of `label`, `value`, `overline`, `caption`, an icon, an
    `action`, and `detail`: a button that opens a window (`label` as its
    accessible name, an icon, a `title`, and `blocks`, whose `fields` rows
    can't have a `detail` of their own).
  - `levels`: `groups` of `rows` of `label`, `level` (up to 4 characters),
    `fill`, `tone` (`default` or `highlight`), an icon and an `action`.
  - `progress`: `groups` of `rows` of `label`, `fill`, `caption`, `value`, an
    icon and an `action`.
- **Groups** (in `stats`, `levels` and `progress`) have an optional `label`
  and icon, `column` (`start` or `end`: consecutive groups that set it form
  two columns) and `collapsible` (`open` or `closed`, which needs a `label`).
  Up to 8 groups per block and 12 rows per group or `fields` block.
- **`fill`** is a number from 0 to 100. Left out, a row has no bar (a gauge's
  defaults to 100).
- **Row tooltips:** rows of `gauges`, `stats`, `levels` and `progress` may
  have a `tooltip`, the same shape as a slot's.
- **Row actions** (`fields`, `levels` and `progress` rows, gear-set links)
  are the slot action kinds, plus `{ "kind": "job", "id": "<job id>" }`,
  which switches to that job. One naming a job the config doesn't have is
  drawn without a link.
- **Icons:** `icon` (up to 4 characters), `iconSrc` (an image) or
  `iconName`, one of the built-in drawings: `sword`, `shield`, `wand`,
  `cross`, `bow`, `star`, `heart`, `person`, `note`, `list`, `save`, `gear`,
  `hammer`, `leaf`, `crest`, `flag`. `iconSrc` wins over `icon`, which wins
  over `iconName`. Icons are decorative: the label names the thing.
- **`gearSet`:** a caption (`label`, `value`), `jobMenu` (the job menu
  button's `label`, default "Change job", and icon, default a note), and up
  to 3 `links`, each with a `label` (its accessible name), an icon, an
  `action` and `position`: up to 2 at the `start` (the default), before the
  job menu, and 1 at the `end`. The row is drawn whenever it has something
  to hold: a `gearSet`, more than one job (for the job menu) or a host's
  `gearSetEnd`, which takes the end link's place.
- **`hidden: true`** on a tab, page, block or `gearSet` keeps it in the
  config but out of the panel. `publicConfig()` leaves hidden parts out (and
  a tab or page with nothing left to show), so they aren't sent to visitors.
- **Per job:** `job.gearSet` replaces the config's `gearSet`, and
  `job.blocks` maps a block id to a whole block of the same `type`, shown
  instead of the shared one for that job. A replacement has no `id` or
  `hidden` of its own.
- **`parseConfig`** checks each tab, page and block on its own: a bad one is
  dropped and reported, and so is a tab or page left with no blocks. Past the
  limit, tabs, pages and blocks keep their first entries and report the
  rest. A `tabs` list left empty is left out. A bad `job.blocks` entry (one
  that doesn't parse, names no block, or has another type) or a bad
  `gearSet`, the config's or a job's, is dropped without dropping the job or
  the config. It also reports duplicate tab,
  page and block ids (the later one dropped), a tab with both `blocks` and
  `pages` (its pages used), a job action naming no job, a `collapsible`
  group without a `label`, and gear-set links past the start or end limit
  (kept, not drawn).
- **URLs:** `resolveTab(config, searchParams.tab, searchParams.page)` returns
  the tab and page to show (`page` is null for a tab of blocks), falling
  back to the first visible ones, or null with no tab to show. `tabHref(config,
  tabId, currentHref, { page })` links to a tab or page: the first visible tab
  and a tab's first page get no parameter, switching tab keeps `?job=` and
  drops `?page=`, and `jobHref` keeps `?tab=` and `?page=` when given the
  current URL as its base path. `tabParam` and `pageParam` options rename the
  parameters.

## Usage

```tsx
import { parseConfig, resolveJob } from "@solution-nine/wol-character-panel";
import { EquipmentPanel } from "@solution-nine/wol-character-panel/react";

const { config, errors } = parseConfig(json);   // or: const { config } = await loadConfig(sources, fallback)
const job = resolveJob(config, searchParams.job);

<EquipmentPanel
  config={config}
  job={job}
  theme="document"          // or "game"
  labels="narrow"           // slot names under squares: "narrow" (default) or "always"
  parts={{ toolbar: true }} // optional: which parts are drawn (below)
  gearSetEnd={<SaveButton />} // optional: your own control at the gear-set row's right end
  basePath="/"              // where the job links point
  renderLink={(p) => …}     // optional: your router's link (default <a>); p.intent says what it does:
                            // "job" (switch job), "tab" (switch tab or page, the window only),
                            // "param" (set a query parameter), "page" (another page of the site)
  renderPortrait={(p) => …} // optional: your image component (default <img>)
  isParamActive={(name, value) => …} // optional: true for the param value the page applies
/>
```

`loadConfig(sources, fallback)` tries each `{ name, load }` source in order,
such as an admin API, a CMS adapter, or a remote JSON file. It uses the first
one that yields a usable config. A source whose `load` resolves to `undefined`
has nothing yet (no save, an empty CMS entry) and is skipped without an issue;
a `load` that throws (unreachable, an HTTP error) is an issue. It never throws.
It resolves to `{ config, source, issues }`: `source` is the name of the source
used, or `null` when no source had a usable config and `config` is
`fallback`. `source === null` with issues means the page shows the fallback
because something failed, which a host can tell visitors about.

## Behaviour

- **Tooltips:**
  - CSS shows them on hover (on devices that can hover) and on keyboard focus,
    so they work before hydration and without JavaScript.
  - Escape hides them (WCAG 1.4.13).
  - On touch screens, a tap simply follows the slot's link.
- **Job menu:** an icon button in the gear-set row (its name from
  `gearSet.jobMenu.label`), opening a `<details>` list of job links. It needs
  no JavaScript, works with the back button, and makes every job shareable.
  It isn't drawn for a config with one job.
- **Layout:** below a 26rem container width, the portrait moves on top. The
  columns become 3-column grids with the slot names showing, since touch
  screens get no tooltip. This is a container query, so it follows the
  panel's width, not the viewport.

`parts` says which parts are drawn, `true` to draw one: `bar`,
`characterName`, `gearSet` and `jobMenu` default to `true`; `toolbar` (round
buttons under the portrait) and `sockets` (two dots on each filled slot)
default to `false`. `gearSet: false` removes the whole row, with the job menu
and `gearSetEnd`; `jobMenu: false` removes only that button. The toolbar and
sockets are visual only for now. They're hidden from assistive tech and
aren't focusable. When either one gets a real function, make it a real
control (`<button>`, with a label) instead.

A `gearSetEnd` control takes the row's square button look from the
`cs__gear-button` class; name it with visually hidden text (`cs-visually-hidden`)
or an `aria-label`.

## Theming

Override any `--cs-*` variable on `.cs`, or add a theme block like
`.cs[data-cs-theme="game"]`. The `document` theme reads the host's
`--paper`/`--ink`/`--signal`/… tokens when they exist and falls back to neutral
colours otherwise.

## Development

```sh
npm ci
npx playwright install chromium   # once, for the browser tests
scripts/check.sh    # lint, typecheck, test, schema up to date, build, demo build, pack, package checks, browser
```

### Tests

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
port 5200, and check its images and links take that base path.

### Package checks

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
still starts with `"use client"`. It needs the npm registry (or npm's cache)
for the peers.

CI runs these in `check` (Node 24, latest peers), and in `compat`, with the
tests, on Node 22.12 (the `engines` floor) and with the oldest peers the
ranges allow.

### Preview locally

```sh
npm run dev         # http://localhost:5173
```

The playground renders the panel straight from `src/` with hot reload, on any
config in `examples/`. Its controls (fixture, theme, labels, sockets, toolbar,
container width, dark host tokens, drafts) are query parameters, so every state
is a link, such as `/?fixture=edge-cases&theme=game&width=22`. Like a host, it
reads `?job=` and the param actions' parameters from the URL and passes
`isParamActive`; a `link` action shows where a host would go instead of
leaving the page. It renders on the client, while hosts render the panel on
the server; `/static?fixture=full&width=22` shows the server-rendered panel
with no script (fixture, theme, labels, width and `job` from the query).
Check a release candidate in a host too (below).

The demo site is this page built with Vite (`npm run build:demo`, into
`playground/dist/`), served from `/wol-character-panel/`: the panel's links
take that base path, and the examples' root-relative image paths
(`/portrait.svg`) are prefixed with it. `/static` is dev-server only, so the
demo doesn't have it. To look at the build locally:

```sh
npm run build:demo && npx vite preview playground --base /wol-character-panel/
```

`node scripts/preview.mjs` screenshots the panel for every example, in both
themes, wide and narrow (22rem), into `.logs/preview/`, and lists any console
error or warning (exit 1 if there is one). `--fixture=full` and
`--theme=game` narrow it down. It starts its own dev server on port 5198 and
needs Chromium (`npx playwright install chromium`).

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

## Releasing

Bump `version` in `package.json` (a major bump changes the schema's `$id`, so
regenerate it) and turn `CHANGELOG.md`'s Unreleased section into the new
version, merge, then tag the merge commit:

```sh
git tag v1.0.1 && git push origin v1.0.1
```

`.github/workflows/release.yml` checks the tag matches `package.json`, runs the
checks, and publishes with npm trusted publishing (no npm token; provenance
added by npm). Once it succeeds, `.github/workflows/pages.yml` builds the
demo site from the same commit and deploys it, so the demo never runs ahead
of npm.

GitHub Pages is set once in the repository's Settings → Pages: Source
"GitHub Actions". To redeploy a release, run the Demo workflow by hand with
its tag (from 1.0.4 on: older tags have no `build:demo`). Both ways run with
`main` as their ref, which the `github-pages` environment allows; if a run
is refused there, check Settings → Environments → `github-pages` allows
`main`.

The trusted publisher is set on npmjs.com under the package's Settings →
Trusted publishing → GitHub Actions: user `AlexLe08`, repository
`wol-character-panel`, workflow `release.yml` (filename only), no environment,
and `npm publish` ticked under Allowed actions (new configurations allow only
`npm stage publish` otherwise). Every field is case-sensitive, and npm checks
none of them until a publish. A new configuration expires unless a publish
through it succeeds within 2 days, so create it when a tagged release will
follow. Once a release has gone through it, set Settings → Publishing access
to "Require two-factor authentication and disallow tokens", which leaves
trusted publishing working.
