# Releasing

How a release is published: for the maintainer. Versions follow semver
keyed to the config contract (see [config.md](config.md#the-schema)), and
[CHANGELOG.md](../CHANGELOG.md) lists what each one changed for hosts.

Bump `version` in `package.json` (a major bump changes the schema's `$id`, so
regenerate it) and turn `CHANGELOG.md`'s Unreleased section into the new
version, merge (PRs are squash-merged), then tag that commit on `main`:

```sh
git tag v1.0.1 && git push origin v1.0.1
```

A ruleset keeps pushed `v*` tags from being moved or deleted, so check the
commit before pushing the tag: a wrong one is fixed with the next version
(the next patch, or the next `beta.N`).

`.github/workflows/release.yml` checks the tag matches `package.json`, runs the
checks, and publishes with npm trusted publishing (no npm token; provenance
added by npm).

A prerelease version (one with a `-`, such as `2.0.0-beta.0`, tagged
`v2.0.0-beta.0`) is published to the `next` dist-tag instead of `latest`, so
a plain `npm install` keeps getting the last stable release. Check with
`npm view @solution-nine/wol-character-panel dist-tags`.

Once a release succeeds, beta or stable, `.github/workflows/pages.yml`
deploys two demos, built from the release tags of the versions npm's
dist-tags name, so neither runs ahead of npm: `latest` at
`/wol-character-panel/`, and `next` at `/wol-character-panel/next/` while it
is newer than `latest` (`latest` again otherwise, as after a stable release
that followed betas). A Pages deploy replaces the whole site, so each run
builds both.

GitHub Pages is set once in the repository's Settings → Pages: Source
"GitHub Actions". To redeploy, run the Demo workflow by hand: it builds what
npm's dist-tags name at the time. Both ways run with
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
