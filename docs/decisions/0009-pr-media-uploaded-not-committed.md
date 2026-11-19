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
- A GitHub attachment (`github.com/user-attachments/assets/…`): shown
  inline in the body, no bytes in the repository. Limits: 10 MB for an
  image, and for a video on a free plan; `.mp4`, `.mov` and `.webm`. Two
  ways to upload one:
  - a comment box in a signed-in browser (the Playwright MCP one, as in
    #44), the comment never posted: clicks and a sign-in the session must
    ask the owner for;
  - `gh pr create` / `gh pr edit --attach <file>` (GitHub CLI v2.99.0,
    2026-09-01), with `gh`'s own sign-in: it uploads and rewrites the
    body's Markdown references to local files (`![alt](./after.png)`) to
    the uploaded URLs. Tried on #46: HTML `<img>` and bare paths aren't
    rewritten (the file is appended at the end instead).

## Decision

A PR with a visible change shows it in its body: before/after
screenshots, and a short video when the change is behaviour. They are
made with `scripts/pr-media.mjs` from a per-PR script in `.logs/`,
referenced from the body as local Markdown, and uploaded with
`gh pr create` / `gh pr edit --attach` (the `pr-media` skill). Media is
never committed. The PR template asks for it.

**Why:** 

Images/videos for this project are likely to only be used for testing/validation sources to help explain what is being changed and why. We don't want to bloat the repo with these files that can already be referenced by its relevant PR. This also reduces the use of playwright signing into a new browser each time just for uploads. If we find that the images need width to them then we can use playwright as before for adding those images.

## Consequences

- `main` stays free of images; a PR's media lives with the PR on GitHub.
- Uploading needs `gh` v2.99.0 or later, signed in as for any `gh pr`
  command; no browser. Every `--attach` run uploads again, so a body is
  edited with only the files it references.
- Body images are Markdown, so they can't be given a width; GitHub fits
  them to the table.
- In this public repository, an uploaded file can be opened by anyone
  with its URL, even after the body stops using it. Media shows example
  data only.
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
- Worth revisiting if `gh --attach` changes what it rewrites, or if the
  repository moves to a plan or host where the limits differ.
