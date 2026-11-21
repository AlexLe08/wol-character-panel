# 0011: The README's screenshots are committed, under `docs/media/v<major>/`

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
  bytes to the history for good (the first two are about 200 KB as
  taken, about 50 KB compressed).
- A GitHub attachment (`user-attachments/assets/…`), uploaded through a
  PR as 0009 does: no bytes in the repository, but the image isn't
  tied to a commit or reviewed in a diff, and a new one means another
  upload and a new URL.
- Shipped in the npm package: every install downloads it, for a page
  only npmjs.com and GitHub show.

npm shows the README alone, with no repository around it, so the README
already links `docs/` by absolute GitHub URL (#52).

Linked from `main`, an image is what every published README shows, so a
release's npm page would show a later major's look, and a renamed or
deleted image would break the pages that link it. Pinning each README to
its release tag (`…/v2.0.0/docs/media/…`) would fix both, but the README
on GitHub would link a tag that doesn't exist yet from merge to tag, and
every release would rewrite the URLs.

## Decision

The README's screenshots are committed under `docs/media/v<major>/`
(`docs/media/v2/` for 2.x), which `files` doesn't publish, compressed to
palette PNGs, and the README shows them by absolute
`raw.githubusercontent.com/…/main/docs/media/v<major>/…` URL. A new
major takes its screenshots into a new folder and leaves the old one as
it is, as the schema's `$id` moves to `@<major>`. PR media stays as 0009
says: uploaded, never committed.

**Why:** 

For this case, I believe images should be included as a sample for users to take and reference with as a possible offline copy when otehr options fail to load URLs or such. 

## Consequences

- The npm tarball doesn't grow; the repository does, by each version of
  each image. Quantized to a palette (libimagequant, through `sharp` run
  from a scratch folder, not a dependency) they are about a quarter of
  `scripts/preview.mjs`'s PNGs (195 KB to 52 KB), with no visible
  banding in the game theme's gradients.
- Each major's npm pages keep that major's look: a 2.x page still shows
  `v2/` after 3.0. Within a major the images come from `main`, so an
  older 2.x release shows the newest 2.x screenshots.
- Each published README keeps its URLs, so a file in a `v<major>/`
  folder is replaced under the same name, never renamed or removed, or
  every release's npm page that shows it breaks. An old major's folder
  stays.
- A new image 404s until its PR merges (in the PR and on the branch's
  README too).
- They are `scripts/preview.mjs` shots (the window's first tab, wide):
  `adventurer` in `game`, `portfolio` in `document`. A change that alters
  how they look should take them again in the same PR, and compress them
  the same way.
- 0009 is superseded in part: its "never committed" now covers PR media
  only.
- Worth revisiting if the images grow (a GIF or video), or if relative
  image paths turn out to work on npm (not checked).
