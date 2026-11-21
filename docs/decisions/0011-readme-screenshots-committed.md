# 0011: The README's screenshots are committed, under `docs/media/`

Status: Accepted · 2026-11-21

## Context

The first-impressions review (2026-11-21, the roadmap's Next up) asked
for a screenshot of both themes at the top of the README, which npm also
shows. [0009](0009-pr-media-uploaded-not-committed.md) says media is never
committed, but it was written for a PR's before/after shots, which only
explain a change; it left the README open ("committing it is the
owner's call", in the roadmap).

The options for where a README image lives:

- Committed to the repository: versioned with the README it illustrates,
  reviewed in the PR's diff, replaced by a later commit. It adds its
  bytes to the history for good (the first two are about 200 KB).
- A GitHub attachment (`user-attachments/assets/…`), uploaded through a
  PR as 0009 does: no bytes in the repository, but the image isn't
  tied to a commit or reviewed in a diff, and a new one means another
  upload and a new URL.
- Shipped in the npm package: every install downloads it, for a page
  only npmjs.com and GitHub show.

npm shows the README alone, with no repository around it, so the README
already links `docs/` by absolute GitHub URL (#52).

## Decision

The README's screenshots are committed under `docs/media/`, which
`files` doesn't publish, and the README shows them by absolute
`raw.githubusercontent.com/…/main/docs/media/…` URL. PR media stays as
0009 says: uploaded, never committed.

**Why:** TODO(Alex)

## Consequences

- The npm tarball doesn't grow; the repository does, by each version of
  each image.
- The images come from `main`, so the npm page of an older release shows
  the current screenshots, and a new image 404s until its PR merges (in
  the PR and on the branch's README too).
- Each published README keeps its URLs, so a file in `docs/media/` is
  replaced under the same name, never renamed or removed, or every
  release's npm page that shows it breaks.
- They are `scripts/preview.mjs` shots (the window's first tab, wide):
  `adventurer` in `game`, `portfolio` in `document`. A change that alters
  how they look should take them again in the same PR.
- 0009 is superseded in part: its "never committed" now covers PR media
  only.
- Worth revisiting if the images grow (a GIF or video), or if relative
  image paths turn out to work on npm (not checked).
