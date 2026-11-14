# 0003: Package name `@solution-nine/wol-character-panel`

Status: Accepted · 2026-11-08

## Context

Inside the site the package was `@alexle08/eorzean-character-sheet`
(site #75), scoped to the owner's npm user and private. Before publishing
it from its own repository ([0001](0001-own-package-and-repository.md)),
site #96 (here `04a089e`) renamed it to `@solution-nine/wol-character-panel`
in `packages/wol-character-panel/`. `solution-nine` is a free npm
organization owned by the npm user `alexle08`. The rename regenerated the
schema `$id`, which is built from the package name. The file names
(`character-sheet.css`, `character-sheet.schema.json`) and the
`CharacterSheet` export kept "character sheet" until 2.0.

## Decision

Publish as `@solution-nine/wol-character-panel`, under a free npm
organization rather than the owner's user scope, with no Square Enix trademark in the name.

**Why:**
As of writing this, this package is still without users so there is plenty of freedom to make "breaking" changes as needed for feature development before finding users.

The name change was to better reflect the scope and features of the project to account for more than just the equipment window view, as well as ensuring little to no conflicts with trademark.

## Consequences

- The name is in every import, the schema `$id` and the jsDelivr URL, so
  changing it now would be a new package, not a release.
- No trademark in names or published text is a standing rule in
  `CLAUDE.md`.
- Publishing is set up per package: a trusted publisher bound to this
  repository's `release.yml`.
- 2.0 finished the naming: `CharacterSheet` became `EquipmentPanel`, and
  the files became `character-panel.css` and
  `character-panel.schema.json`.
