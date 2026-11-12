# Changelog

What changed for hosts in each release: the entries, the config contract
(the JSON Schema and `LIMITS`), rendering, the CSS, and the README (it
ships, and shows on npm). Repository-only changes (tests, CI, tooling)
aren't listed. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semver](https://semver.org/) keyed to the config contract (see the README's
Config section).

A PR that changes what's published adds its line under Unreleased; the
`release:` PR turns Unreleased into the new version.

## [Unreleased]

### Added

- Config: optional `characterName`, `gearSet` (a caption, the job menu's
  label and icon, and up to 3 links) and `tabs` (blocks or pages of blocks:
  `gauges`, `stats`, `fields`, `levels`, `progress`, with groups, row
  tooltips, row actions including `{ "kind": "job" }`, and detail windows on
  `fields` rows), `iconName` (16 built-in drawings) beside `icon`/`iconSrc`,
  `hidden` on tabs, pages, blocks and `gearSet`, and per job `job.blocks`
  (replace a block by id) and `job.gearSet`. `CharacterSheet` doesn't draw
  them yet. `LIMITS` gains `config.characterName`, `config.tabs`, `tab`,
  `block`, `row`, `gearSet` and `detail`. The JSON Schema now defines its
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

[Unreleased]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.4...HEAD
[1.0.4]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/AlexLe08/wol-character-panel/tree/v1.0.1
[1.0.0]: https://www.npmjs.com/package/@solution-nine/wol-character-panel/v/1.0.0
