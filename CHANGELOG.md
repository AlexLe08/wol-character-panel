# Changelog

What changed for hosts in each release: the entries, the config contract
(the JSON Schema and `LIMITS`), rendering, the CSS, and the README (it
ships, and shows on npm). Repository-only changes (tests, CI, tooling)
aren't listed. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semver](https://semver.org/) keyed to the config contract (see the README's
Versioning section).

A PR that changes what's published adds its line under Unreleased; the
`release:` PR turns Unreleased into the new version.

## [Unreleased]

### Fixed

- On touch screens, an open tooltip no longer catches taps: a tap on a
  slot or row it covers opens that one's tooltip and closes the first, in
  one tap. Before, the first tap only closed the open card. CSS only
  (`pointer-events: none` on `.cs-tip` under `(hover: none)`), so mouse
  hover is unchanged.

## [2.0.0-beta.4] - 2026-11-22

### Fixed

- On touch screens, a tap on a slot with no link (a `none` action, or a
  `param` one drawn without a link) now shows its tooltip, and a tap elsewhere hides it, as on a tooltip-only
  row. Before, its item card couldn't be seen on a phone at all. CSS only,
  so it still works without JavaScript; a tap on a linked slot still just
  follows the link.

## [2.0.0-beta.3] - 2026-11-22

### Changed

- README: trimmed to a host's quick start (entries, a minimal config,
  usage, behaviour in brief, theming, versioning). The full config
  reference and behaviour moved to `docs/config.md` and
  `docs/behaviour.md` on GitHub, linked from the README; the development
  notes, the repository's files and the release steps to
  `docs/development.md` and `docs/releasing.md`.
- README: says in one line that the panel recalls a game's character
  screen without copying it, and that the package isn't affiliated with
  the game's publisher.
- README: says at the top that it describes 2.0 (on npm's `next` tag
  until 2.0.0, while a bare install gets 1.0.4), installs `@next`, and
  gives a complete Next.js App Router `app/page.tsx`.
- README: screenshots of both themes at the top (the `adventurer`
  example in `game`, `portfolio` in `document`). The images aren't in the
  package; the README shows them from the repository.
- README: its opening says what the panel is for (a portfolio, a game
  character sheet, a persona card), what a job, a slot and a host are,
  and the accessibility its browser tests check (no JavaScript needed,
  keyboard, axe on WCAG 2.2 A/AA; Chromium only). The Config section
  gives the schema's jsDelivr URL for `"$schema"` (`@next` until 2.0.0).
  The development and releasing notes are linked from CONTRIBUTING, not
  the README.
- README: badges under the title for CI on `main`, the version on npm's
  `next` tag, the license, the Node versions `engines` allows, and the
  `/next/` demo. The images load from GitHub and shields.io.

## [2.0.0-beta.2] - 2026-11-21

### Changed (breaking)

- The job menu is a `<button>` and a `popover="auto"` list in place of a
  `<details>` and `<summary>`; the class names are unchanged, and the open
  state is `.cs__jobs-list:popover-open` rather than `.cs__jobs[open]`. A
  host styling the old elements or `[open]` needs to follow. The open list
  is drawn in the top layer, so a host's `overflow` or `z-index` around
  the panel no longer clips or covers it, and `.cs__gear` is no longer
  `position: relative` (for a host's absolutely positioned `gearSetEnd`).

### Fixed

- The open job menu could hide the slot keyboard focus moved on to (WCAG
  2.4.11): Tab leaves it open over the job header, and nothing but its
  own toggle closed it. It now closes when focus lands outside the
  menu. Escape closes it from anywhere, returning focus to the button when
  it was inside the list, and so does a click outside, both without
  JavaScript. It opens where it did, below the
  gear-set row; where CSS anchor positioning is missing, centred on the
  screen.

- In the narrow layout, the middle column's slot tooltips ran past the
  panel's right edge, and on a phone-sized viewport scrolled the page
  sideways (about 58px at 390px, 51px at 320px; WCAG 1.4.10). They are
  now centred on their slot; the outer columns' still open from their own
  edge.

## [2.0.0-beta.1] - 2026-11-19

### Added

- README: the newest beta has a demo of its own,
  <https://alexle08.github.io/wol-character-panel/next/>.
- `--cs-badge-bg`: the portrait badge's plate, the panel's colour by default.
- `LIMITS.badge` (`label`, `value`): a job's badge has limits of its own;
  `LIMITS.pair` still covers tooltip stats and items and the window's row
  labels and values.

### Changed (breaking)

- Tighter limits: a job's `badge` label 40 → 24 and value 80 → 24 (an
  at-limit badge covered 46% of the portrait at 22rem; now 16%, two
  lines). A job over either fails to parse and is dropped.

### Fixed

- The portrait badge's text failed contrast over a light portrait (on the
  playground's, down to 1.00:1 in `game` and 3.62:1 at best, needing 4.5:1),
  since it had no background of its own. It now sits on an opaque plate (`--cs-badge-bg`), flat in the
  `document` theme and framed in `game`.

## [2.0.0-beta.0] - 2026-11-18

### Added

- Config: optional `characterName`, `gearSet` (a caption, the job menu's
  label and icon, and up to 3 links) and `tabs` (blocks or pages of blocks:
  `gauges`, `stats`, `fields`, `levels`, `progress`, with groups, row
  tooltips, row actions including `{ "kind": "job" }`, and detail windows on
  `fields` rows), `iconName` (16 built-in drawings) beside `icon`/`iconSrc`,
  `hidden` on tabs, pages, blocks and `gearSet`, and per job `job.blocks`
  (replace a block by id) and `job.gearSet`. `EquipmentPanel` draws
  `characterName` and `gearSet` (see Changed); `CharacterWindow` draws the
  tabs. `LIMITS` gains `config.characterName`, `config.tabs`, `tab`,
  `block`, `row`, `gearSet` and `detail`; a `gauges`, `stats` or `progress`
  row's value is capped at 24 characters (`row.figure`), a `fields` row's
  at 80 (`pair.value`). The JSON Schema now defines its
  shared parts (the tooltip among them) once under `$defs`; what it accepts
  for existing fields is unchanged.
- `parseConfig` checks tabs, pages, blocks, `gearSet` and `job.blocks`
  entries one at a time, dropping and reporting a bad one (tabs, pages and
  blocks past their limit keep the first ones), and reports
  duplicate ids, a tab with both blocks and pages, job actions naming no
  job, collapsible groups without a label and gear-set links over the limit.
  `publicConfig` leaves out hidden tabs, pages, blocks and gear-set rows.
- `resolveTab` and `tabHref` (from `.`): the tab and page in the URL, and
  links to them (`?tab=`, `?page=`). New types for the config's new parts.
- The gear-set row, above the job header: up to two start links, the job
  menu, the `gearSet` caption, and at the right end the host's `gearSetEnd`
  prop or the config's end link. Drawn whenever it has something to hold.
  Hosts can give their own control the row's look with `cs__gear-button`.
- `config.characterName` at the right of the top bar.
- `CharacterWindow` (from `/react`, with `CharacterWindowProps` and
  `CharacterWindowParts`): the bar, a tab strip and sub-tabs as links
  (`?tab=`, `?page=`, `aria-current="page"`, `renderLink` intent `"tab"`),
  the active tab's blocks, and the equipment pane beside them, stacked below
  a 46rem container. Props `tab`, `page`, `tabParam`, `pageParam`,
  `hiddenTabs`, and `parts.tabs` and `parts.equipment`. Job links keep the
  tab and page; switching tab keeps the job. It draws every block type, with
  row tooltips (on touch screens a tap shows one) and row actions (a `job`
  action switches job, `aria-current` on its own); groups with `column` as
  two-column runs (one column, start groups first, in a narrow pane);
  `collapsible` groups as `<details>`; and a `fields` row's `detail` as a
  button opening a window centred on the screen, through the Popover API
  (no JavaScript needed; Escape and a click outside close it). New CSS
  variables: `--cs-tab-bg`, `--cs-tab-active-bg`, `--cs-bar-track`,
  `--cs-bar-fill`, `--cs-gauge-primary`, `--cs-gauge-secondary`,
  `--cs-stat-highlight` and `--cs-level-highlight`.
- `LIMITS.slot.column` (6) and the `EquipmentPanelParts` type.
- README: betas of a new major are published to npm's `next` tag
  (`npm install @solution-nine/wol-character-panel@next`).

### Changed (breaking)

- Escape over a shown slot or row tooltip hides it and is cancelled
  (`preventDefault`), so a detail window, or a host's own dialog around the
  panel, closes on the next Escape rather than with the tooltip. In 1.x one
  Escape over a hovered slot did both.

- Renamed, with no aliases: `CharacterSheet` → `EquipmentPanel`,
  `CharacterSheetProps` → `EquipmentPanelProps`, the type
  `CharacterSheetConfig` → `CharacterPanelConfig`,
  `characterSheetConfigSchema` (`/schema`) → `characterPanelConfigSchema`,
  `/character-sheet.css` → `/character-panel.css`, and
  `/character-sheet.schema.json` → `/character-panel.schema.json` (its
  `$id` too). The default `label` is "Character panel".
- The job menu moved from the top bar to the gear-set row, and its toggle
  is an icon (a note by default) named "Change job" (`gearSet.jobMenu`
  changes both). Its `cs__jobs*` class names stay; styles or tests that
  look for `.cs__bar .cs__jobs` or the toggle's text need updating.
- `showSockets` and `showToolbar` are replaced by
  `parts={{ sockets, toolbar }}`, which also takes `bar`, `characterName`,
  `gearSet` and `jobMenu` (those default to `true`). The toolbar's buttons
  are drawings instead of text glyphs.
- `PARAM_NAME_PATTERN` also refuses `tab` and `page`. A job with a param
  action named either fails to parse and is dropped, as any invalid job is.
- Tighter limits: `LIMITS.tooltip.items` 10 → 5, `tooltip.note` 240 → 120,
  `tooltip.subtitle` 120 → 60 (an at-limit tooltip was 985px tall; now
  699px), and `LIMITS.job.levelLabel` 20 → 16 (fits one line at 18rem).
  A job over any of them fails to parse and is dropped.
- A seventh `left` or `right` slot is reported by `parseConfig` and not
  drawn.
- `LinkRendererProps["intent"]` gains `"tab"`, emitted by
  `CharacterWindow`'s tab and sub-tab links; a host `switch` over `intent`
  without a default needs a case for it.

## [1.0.4] - 2026-11-10

### Changed

- README: links the demo site on GitHub Pages
  (<https://alexle08.github.io/wol-character-panel/>), the playground on the
  example configs, deployed from each release.

## [1.0.3] - 2026-11-10

### Changed

- README: dropped the note that the schema's `$id` URL only opens once the
  package is published; it resolves on jsDelivr.

### Fixed

- "Change job" stays on one line beside a long title; the title wraps
  instead (`.cs__jobs` no longer shrinks, `.cs__jobs-toggle` doesn't wrap),
  breaking inside a word with no break in it, such as a URL
  (`overflow-wrap: anywhere` on `.cs__bar-title`).
- An empty slot's glyph meets WCAG AA contrast (4.5:1) in both themes: it
  takes its label's colour, `--cs-muted`, instead of `--cs-rule-strong`
  (about 2.6:1 on the document theme's white, 2.5 to 2.8:1 in the game
  theme). At full width it's the only visible text naming the slot.

## [1.0.2] - 2026-11-09

### Fixed

- The emitted `CharacterSheet.d.ts` no longer imports
  `./character-sheet.css`. TypeScript 6 and later reported it as TS2882 in
  hosts with `skipLibCheck` off.

## [1.0.1] - 2026-11-08

First release published from GitHub Actions through npm trusted
publishing, with a provenance attestation. The code and the JSON Schema
are the same as 1.0.0.

### Changed

- README: how releases are made.

## [1.0.0] - 2026-11-08

First release, extracted from
[the-portfolio-site](https://github.com/AlexLe08/the-portfolio-site).

### Added

- `@solution-nine/wol-character-panel`: `parseConfig`, `loadConfig`,
  `findUnknownKeys`, `publicConfig`, `resolveJob`, `jobHref`,
  `actionHref`, `withQuery`, the config types, `LIMITS`, `ID_PATTERN` and
  `PARAM_NAME_PATTERN`.
- `@solution-nine/wol-character-panel/react`: `CharacterSheet` (with the
  `CharacterSheetProps` and `LinkRendererProps` types), with the
  `document` and `game` themes.
- `@solution-nine/wol-character-panel/schema`: `characterSheetConfigSchema`.
- `character-sheet.css` and `character-sheet.schema.json`, its `$id` on
  `@1`.

[Unreleased]: https://github.com/AlexLe08/wol-character-panel/compare/v2.0.0-beta.4...HEAD
[2.0.0-beta.4]: https://github.com/AlexLe08/wol-character-panel/compare/v2.0.0-beta.3...v2.0.0-beta.4
[2.0.0-beta.3]: https://github.com/AlexLe08/wol-character-panel/compare/v2.0.0-beta.2...v2.0.0-beta.3
[2.0.0-beta.2]: https://github.com/AlexLe08/wol-character-panel/compare/v2.0.0-beta.1...v2.0.0-beta.2
[2.0.0-beta.1]: https://github.com/AlexLe08/wol-character-panel/compare/v2.0.0-beta.0...v2.0.0-beta.1
[2.0.0-beta.0]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.4...v2.0.0-beta.0
[1.0.4]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/AlexLe08/wol-character-panel/tree/v1.0.1
[1.0.0]: https://www.npmjs.com/package/@solution-nine/wol-character-panel/v/1.0.0
