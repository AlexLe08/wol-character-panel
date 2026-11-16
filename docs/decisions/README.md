# Decision records

One short file per decision that shapes the package or how it's worked on,
numbered in order: what was decided, the context it was decided in, and
what follows from it. They record why things are the way they are, so a
later change can tell a deliberate choice from an accident.

- A new record copies [`0000-template.md`](0000-template.md) as the next
  number, and goes in the PR that acts on the decision (or its own, if
  nothing changes yet).
- A record isn't rewritten once accepted. To change a decision, write a
  new record and set the old one's status to `Superseded by NNNN`.
- The **Why** is the owner's. Claude drafts Context and Consequences from
  the history and leaves the Why as `TODO(Alex)`.

| Record | Decision | Status |
| --- | --- | --- |
| [0001](0001-own-package-and-repository.md) | The character sheet becomes its own package and repository, history kept | Accepted · 2026-11-08 |
| [0002](0002-closed-json-schema.md) | The JSON Schema rejects unknown keys; `parseConfig` strips them | Accepted · 2026-11-06 |
| [0003](0003-package-name.md) | The package is named `@solution-nine/wol-character-panel` | Accepted · 2026-11-08 |
| [0004](0004-2.0-betas-on-next.md) | 2.0 ships as `2.0.0-beta.N` on `next` first | Accepted · 2026-11-13 |
| [0005](0005-small-prs-squash-only.md) | Small PRs to `main`, squash-merged; `release/1.x` only if needed | Accepted · 2026-11-14 |
| [0006](0006-tooling-freeze.md) | New tooling only for a real bug or real friction | Accepted · 2026-11-14 |
