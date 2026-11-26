# 0012: Developed and tested on its own, not in a host

Status: Accepted · 2026-11-26

## Context

The package came out of the-portfolio-site
([0001](0001-own-package-and-repository.md)), which kept its place in the
workflow after the move: `CLAUDE.md` called it the package's main host,
a release candidate was to be checked there with a packed copy ("it
renders on the server with its own CSS around the panel"), and the
roadmap's last 2.0 steps were that check and the site's upgrade PR.
[0007](0007-next-demo-for-betas.md) had already taken betas out of the
site, and moved the check in a host to before 2.0.0.

By 2.0.0-beta.5 (#71) and the fixes after it (#72, #73), everything else
a release is checked with runs in this repository, with no host:

- the playground renders `src/` on the configs in `examples/`, and
  `/static` renders the panel on the server with no script;
- the browser tests (Playwright and axe, both themes, both layouts, and
  `/static` with JavaScript off) run against it;
- `npm run test:pack` installs the packed tarball in a fresh project and
  uses it through the `exports` map in plain Node, with and without React,
  server-rendering `/react`, at the newest and oldest peers in range;
- each beta is on npm's `next` and in the next demo (`/next/`), where
  betas were tried with Playwright scripts in Chromium (beta.1) and by
  hand on Android phones (beta.3 to beta.5).

On 2026-11-26, with the soak complete, the owner asked that 2.0.0 and
what follows be developed and tested on the package's own setup rather
than the site's, and that docs other than history stop referring to the
site. 0007's Why had already put it as testing and building "without any
particular project or site in mind".

The options:

- Keep the packed-copy check in the site before 2.0.0, as 0007 had it:
  the only check of the panel in a real framework with a host's CSS,
  but it ties each release to the site's install and build.
- Add a small host app here (Next.js, say) that installs the tarball:
  covers a real bundler and a host's CSS, but adds a framework to the dev
  dependencies and CI, new tooling under [0006](0006-tooling-freeze.md)
  with no bug to name yet.
- Check here only, with what already runs, and name what it doesn't
  cover.

## Decision

The package is developed and tested on its own: its examples, the
playground, its tests and the packed tarball. No check depends on a host,
and a release candidate, 2.0.0 included, is checked here rather than in
the site. Upgrading a host is that host's own work, in its own
repository. This supersedes the part of 0007 that moved a check in the
site to before 2.0.0.

**Why:** 

This component package should ideally be developed without influence from the portfolio site. This should help keep the focus on this component package as a "component for all" rather than one influenced by the state and specifications of the portfolio site or other hosts.

## Consequences

- A release needs nothing outside this repository but the registry and
  CI it already uses: no second checkout, no host's install or build, no
  change waiting on another project.
- The docs describe any host, not one. History (decision records, the
  CHANGELOG's past releases, the roadmap's Done entries, the character
  window plan) still names the site where it was part of what happened.
- Not covered by any check: the panel inside a real framework's bundler
  (a Next.js app's handling of the `"use client"` files, say), inside a
  host's own CSS (the playground's page is the only CSS around it), and
  a TypeScript host compiling against the `.d.ts` files (attw checks the
  types resolve, not that a host's `tsconfig` accepts them). A host that
  meets one of these reports it as a bug, and a check for it is added
  then ([0006](0006-tooling-freeze.md)).
- The site's own upgrade to 2.x, and its list of breaks to handle, live
  in its repository; the CHANGELOG's "Changed (breaking)" sections are
  what it works from.
- When to revisit: if a release breaks a host in a way none of these
  checks sees.
