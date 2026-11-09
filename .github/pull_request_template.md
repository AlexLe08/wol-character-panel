<!-- What changes and why, in a few lines. -->

**Semver:** none / patch / minor / major
<!--
none: nothing published changes (tests, CI, repository docs).
patch: a fix, no new API. minor: something new and optional.
major: a host has to change something (a removed or renamed export or key,
a new required field, a tighter limit, changed behaviour). Say what breaks.
-->

## Checklist

- [ ] `scripts/check.sh` passes
- [ ] A host-visible change has its line under Unreleased in `CHANGELOG.md`
- [ ] README updated if entries, the config format, behaviour or theming changed
- [ ] `npm run generate:schema` run and committed if `src/schema.ts` changed

## Not verified

<!-- Anything you couldn't check, or "Nothing". -->
