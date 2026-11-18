# 0007: Betas are tried in a next demo, not the site

Status: Accepted · 2026-11-18

## Context

[0004](0004-2.0-betas-on-next.md) had the site, the only host, move to
`@next` to try each beta, and said 2.0 would be seen "in the playground or
in the site, not on GitHub Pages": the Demo workflow (#20, #31) deployed
only stable tags, so `https://alexle08.github.io/wol-character-panel/`
showed 1.0.4.

2.0.0-beta.0 was released on 2026-11-18 (#34). The owner chose then to
leave the site on 1.x for now rather than upgrade it to try the beta, which
left a published beta with nowhere to be seen outside a local checkout.
That is the friction [0006](0006-tooling-freeze.md) asks a tooling change
to name; this one extends the existing Demo workflow and its browser test
rather than adding new tools.

A repository has one Pages site, and a deploy replaces all of it, so a beta
can't be deployed beside the stable demo on its own. Options: one workflow
building both demos into one deploy; a `gh-pages` branch a beta deploy
writes a folder into (a write token, a Settings change, and a branch that
accumulates state; the roadmap chose against a `gh-pages` branch for the
first demo); a second repository or another host (a cross-repository
token, or a service outside the free tiers CLAUDE.md names).

## Decision

Each Demo run builds two demos from npm's dist-tags into one Pages deploy:
`latest` at `/wol-character-panel/`, and `next` at
`/wol-character-panel/next/` (or `latest` again when no beta is newer).
Betas are tried there instead of in the site, which stays on 1.x for now.
The rest of 0004 stands: betas on `next`, and 2.0.0 once a beta has gone
about a week without an API change.

**Why:** TODO(Alex)

## Consequences

- Every beta is public at a stable URL as soon as it's on npm, without
  touching the site.
- The demo shows what npm has, as before: the versions come from npm's
  dist-tags, built from their release tags, so a failed release never
  reaches either demo. A manual run redeploys whatever npm serves now; it
  can no longer deploy an older tag.
- Every run builds two tags, beta or stable, so a deploy takes about twice
  as long, and a stable release redeploys the next demo too.
- Once a stable release catches up with the betas, `/next/` shows that
  stable version instead of going stale, whether or not the `next`
  dist-tag is removed.
- The next demo is the playground, not a host: the beta isn't tried
  server-rendered inside another site's CSS, which only the site (or a
  packed copy there) shows. That check moves to before 2.0.0, when the
  site upgrades.
- The next demo looks like the stable one; nothing on the page says it's a
  beta.
- When to revisit: when the site upgrades to 2.x, or if a beta needs
  checking in a real host before 2.0.0.
