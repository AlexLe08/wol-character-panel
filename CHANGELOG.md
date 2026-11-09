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

### Fixed

- "Change job" stays on one line beside a long title; the title wraps
  instead (`.cs__jobs` no longer shrinks, `.cs__jobs-toggle` doesn't wrap),
  breaking inside a word with no break in it, such as a URL
  (`overflow-wrap: anywhere` on `.cs__bar-title`).

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

[Unreleased]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/AlexLe08/wol-character-panel/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/AlexLe08/wol-character-panel/tree/v1.0.1
[1.0.0]: https://www.npmjs.com/package/@solution-nine/wol-character-panel/v/1.0.0
