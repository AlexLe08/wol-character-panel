# 0009: PR screenshots and videos are uploaded to GitHub, not committed

Status: Accepted · 2026-11-19

## Context

PR #44 (the narrow tooltip fix) showed its change as a before/after table
of screenshots in the body. They were made by hand: `main`'s version of
the CSS checked out into the worktree, screenshotted, then restored, and
uploaded through a PR comment box in the Playwright MCP browser without
posting the comment. A gist was tried first and refused by the session's
auto-mode classifier. the-portfolio-site already records demo videos for
its PRs the same way, with a helper (`frontend/demo/stack.mjs`).
`scripts/preview.mjs` screenshots every example on the current branch, but
nothing captured a before or a video, and the PR template had no place
for either.

The options for where the files live:

- Committed to the branch: the squash merge carries them into `main` and
  its history for good, and the package's repository grows with every
  visual PR.
- A gist: a separate object to manage, and refused in auto mode (#44).
- A CI artifact: not shown inline, needs a GitHub sign-in to download, and
  expires (90 days at most).
- An upload through GitHub's comment box: shown inline in the body, no
  bytes in the repository. GitHub has no API for it, so it takes a signed-in
  browser. Limits: 10 MB for an image, and for a video on a free plan;
  `.mp4`, `.mov` and `.webm`.

## Decision

A PR with a visible change shows it in its body: before/after
screenshots, and a short video when the change is behaviour. They are
made with `scripts/pr-media.mjs` from a per-PR script in `.logs/`,
uploaded through a comment box in the Playwright MCP browser without
posting, and embedded by URL (the `pr-media` skill). Media is never
committed. The PR template asks for it.

**Why:** TODO(Alex)

## Consequences

- `main` stays free of images; a PR's media lives with the PR on GitHub.
- An upload needs the owner signed in to GitHub in the Playwright MCP
  browser. A session asks for that and never handles credentials.
- In this public repository, an uploaded file can be opened by anyone
  with its URL, posted or not. Media shows example data only.
- Videos are `.webm`: Playwright records only that, and an `.mp4` would
  need a separate ffmpeg. GitHub recommends H.264 for compatibility, so
  some browsers may not play them; the screenshots carry the before/after
  either way.
- The before is a `git archive` copy of `origin/main` with its own
  `npm ci`, so it costs one install per run, and works when a PR changes
  dependencies.
- Screenshots aren't verification: `scripts/check.sh` and the browser
  tests are. A PR with no visible change says so and skips media.
- New tooling under [0006](0006-tooling-freeze.md), for the friction of
  #44's hand-made before shots and upload.
- Worth revisiting if GitHub adds an API for attachments, or if the
  repository moves to a plan or host where the limits differ.
