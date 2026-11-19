<!-- What changes and why, in a few lines. -->

**Semver:** none / patch / minor / major
<!--
none: nothing published changes (tests, CI, repository docs).
patch: a fix, no new API. minor: something new and optional.
major: a host has to change something (a removed or renamed export or key,
a new required field, a tighter limit, changed behaviour). Say what breaks.
-->

## Screenshots

<!--
A visible change: before/after screenshots, and a short video if it moves
(hover, focus, menus, tabs), uploaded to GitHub, never committed (decision
0009). Drag them into this description, or reference them as
![alt](./after.png) and run `gh pr edit --attach ./after.png`;
scripts/pr-media.mjs, or the `pr-media` skill in Claude Code, can make
them. Otherwise "None: no visible change."
-->

## Checklist

- [ ] `scripts/check.sh` passes
- [ ] A host-visible change has its line under Unreleased in `CHANGELOG.md`
- [ ] README updated if entries, the config format, behaviour or theming changed
- [ ] `npm run generate:schema` run and committed if `src/schema.ts` changed

## Not verified

<!-- Anything you couldn't check, or "Nothing". -->
