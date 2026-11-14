# 0002: Closed JSON Schema, lenient parser

Status: Accepted · 2026-11-06

## Context

Until site #85 an unknown key in a config (a typo like `subtitel`) was
only warned about. The config is checked in two places: writers (the
site's admin editor, its backend's save, any editor using `$schema`)
validate against the exported JSON Schema, and the live page reads the
config through `parseConfig` (zod).

Site #85 (`9355659`, `4676354`) made the generator's override set
`additionalProperties: false` on every plain `z.object` in the exported
JSON Schema, while `src/schema.ts` stayed plain `z.object`. The
alternatives on record in the site's `docs/roadmap.md`: `.strict()` in
`schema.ts`, generating with `io: "output"`, and stripping unknown keys
before parsing. Site #86 and #87 followed: the backend names each unknown
key at its path, and the admin's save refuses them (`findUnknownKeys`).

## Decision

Strict on write, lenient on read. The JSON Schema rejects unknown keys;
`parseConfig` strips them and renders the rest. An object meant to stay
open uses `z.looseObject`.

**Why:** TODO(Alex)

## Consequences

- A typo is caught when the config is written, in the editor or on save,
  rather than silently ignored.
- A stored config with an unknown key still renders; the key is dropped.
  `findUnknownKeys` lets a host list what would be dropped.
- The two disagree on purpose, so the JSON Schema isn't a byte-for-byte
  translation of the zod schemas, and a test of one doesn't cover the
  other.
- Adding an optional field is still compatible for readers, but a config
  that uses it fails an older copy of the JSON Schema. A host upgrades
  its schema copy along with the package.
- `npm run generate:schema` has to run after any change to `schema.ts`
  (CI fails while the committed file is out of date).
