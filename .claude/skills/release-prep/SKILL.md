---
name: release-prep
description: Prepares a release PR (release X.Y.Z) from what changed since the last tag. Proposes the semver bump and waits for the owner's OK, then bumps the version, rolls the CHANGELOG and opens the PR. Never tags or publishes.
argument-hint: "[X.Y.Z]"
disable-model-invocation: true
---

Prepare the `release: X.Y.Z` PR described in CLAUDE.md (Versioning and
releases) and `docs/releasing.md`. A version given as an
argument ($ARGUMENTS) is the owner's proposal: check it against the diff
like any other, and say so if it is the wrong size.

Never create or push a tag, and never run `npm publish`: the owner tags the
release PR's squash commit and `release.yml` publishes.

## 1. What changed since the last release

1. `git fetch origin --tags`, then the last release tag:
   `git describe --tags --abbrev=0 origin/main` (call it `vL`). For a
   stable release after betas, also read everything below from the last
   stable tag (`git describe --tags --abbrev=0 --exclude='*-*'
   origin/main`), so what breaks is listed against the previous major.
2. From `vL` to `origin/main`, read:
   - `git log --oneline vL..origin/main` and the merged PRs' semver lines.
   - `git diff vL origin/main -- src/entries.test.ts`: the runtime export
     names of each entry. A removed or renamed name is major; an added one
     is minor.
   - `git diff vL origin/main -- src/schema.ts character-panel.schema.json`:
     the config contract. A new required field, a tighter limit, a removed
     key or a stricter pattern is major; a new optional field or a looser
     limit is minor.
   - `git diff vL origin/main -- 'src/*.ts' 'src/*.tsx' ':!src/*.test.*'`
     for exported types and props (types vanish at runtime, so the snapshot
     above misses them) and for changed behaviour a host relies on.
   - `git diff vL origin/main -- src/character-panel.css`: class names and
     `--cs-*` variables are public (hosts restyle them).
   - `git diff vL origin/main -- package.json`: `exports`,
     `peerDependencies`, `engines`, `files`. A narrower peer or engines
     range is major.
   - The build's inputs: `git diff vL origin/main -- tsconfig.build.json
     scripts/strip-dts-css-imports.mjs` and `package.json`'s `build`
     script change what ships in `dist/` (1.0.2 was such a fix). Compare
     `npm pack --dry-run` file lists if unsure.
   - `README.md` ships and shows on npm: a correction to it is a patch.
     `docs/` doesn't ship, so changes there alone count as none;
     `docs/development.md` and `docs/releasing.md` are repository notes,
     like other tooling (the CHANGELOG doesn't list them).
   - The Unreleased section of `CHANGELOG.md`.
3. If nothing a host can see changed, say a release isn't needed and stop.

4. Prereleases: a new major ships as betas first (`X.0.0-beta.0`, then
   `X.0.0-beta.1` and so on; 2.0 as of 2026-11), which `release.yml`
   publishes to npm's `next` dist-tag while `latest` stays on the last
   stable. While `main` holds a major with no stable release yet, propose
   the next beta, whatever the size of the changes since the last one, and
   the stable `X.0.0` only when the owner says the API is settled. Give
   `npm version` the exact version: `npm version prerelease --preid beta`
   turns 1.0.4 into 1.0.5-beta.0, not 2.0.0-beta.0.

## 2. Propose, then wait

Report: the proposed version and why, each host-visible change with its
semver size and the commit or PR it came from, everything that breaks (for
a major), and host-visible changes missing from Unreleased. Then ask the
owner to confirm the version (AskUserQuestion) and do nothing else until
they do. Missing CHANGELOG lines are added in this PR, so list the wording
you'll use.

## 3. The release PR

1. `scripts/new-worktree.sh release/X.Y.Z`, then switch the session into
   the new worktree (EnterWorktree with its path).
2. `npm version X.Y.Z --no-git-tag-version` (`package.json` and
   `package-lock.json`, no commit, no tag).
3. A new major (its first beta included): `npm run generate:schema`, so
   the `$id` moves to `@<major>`; then update the README, `docs/config.md`
   and examples wherever they name the old major (`grep -rn "@<old major>"
   README.md docs/config.md examples/`). Leave the CHANGELOG's history
   and `package-lock.json` alone. The README's screenshots move with it
   (decision 0011): take them again into a new `docs/media/v<major>/`,
   compressed as that record says, point the README at that folder, and
   leave the old major's folder as it is, since its releases' npm pages
   still link it. (jsDelivr's `@<major>` range skips prereleases, so that URL
   resolves only once the stable release is out.) The stable release
   after betas also removes the README's version note (at its top) and
   the `@next` in its install line, and the sentence under Config that
   says to put `@next` in place of `@<major>` in the `$schema` URL, until
   the next major's betas. It also points the version badge under the
   title at `latest` (drop `/next` from its shields.io URL and "next tag"
   from its alt text) and the demo badge at the demo's root; the
   sentence on the next demo (`/next/`) stays,
   since that page falls back to the latest release.
4. `CHANGELOG.md`: the Unreleased entries become `## [X.Y.Z] - <today,
   YYYY-MM-DD>` under a new empty `## [Unreleased]`, with any missing lines
   from step 2 (a beta gets its own heading, such as `## [2.0.0-beta.1]`).
   At the bottom, `[Unreleased]` compares from `vX.Y.Z`, and a new
   `[X.Y.Z]` link compares `vL...vX.Y.Z`. The stable release after betas
   keeps their sections and opens its own with a line saying it includes
   them.
5. `scripts/check.sh` must pass. If it doesn't, stop and report; a
   release PR fixes nothing else.
6. One commit, `release: X.Y.Z`. `git push -u origin release/X.Y.Z`, then
   `gh pr create` titled `release: X.Y.Z`, the body following
   `.github/pull_request_template.md` (Semver line: the bump, and what
   breaks for a major; for a beta, "major (prerelease of X.0.0)" with the
   breaks against the last stable on the first beta, and the changes since
   the previous beta after that), with the new CHANGELOG section quoted.
7. Finish by giving the owner the next steps, with the version filled in:
   - after merging: `git fetch origin && git tag vX.Y.Z origin/main && git
     push origin vX.Y.Z`, checking first that `origin/main` is the release
     PR's squash commit, `release: X.Y.Z (#N)` (nothing merged after it);
   - watch the Release workflow, then confirm on npm that the version
     shows provenance, and that `npm view @solution-nine/wol-character-panel
     dist-tags` has it under `next` for a beta, `latest` otherwise;
   - watch the Demo workflow it triggers, then open the demo it updated:
     <https://alexle08.github.io/wol-character-panel/next/> for a beta (try
     the beta there, decision 0007), the root otherwise;
   - after a stable release, upgrade the site in its own repository and
     session (bump the dependency in `frontend/`, `npm run
     generate:character-schema`). Betas skip the site for now (decision
     0007);
   - after a stable release that followed betas, `next` still points at
     the last beta: the owner may run `npm dist-tag rm
     @solution-nine/wol-character-panel next`.
