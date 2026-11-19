---
name: pr-media
description: Before/after screenshots and short videos of a visible change for its PR (the playground on this branch and on origin/main), uploaded to GitHub and embedded in the PR body. Use when a PR changes what the panel looks like or how it behaves in a browser (CSS, markup, examples, hover, focus, menus, tabs), or when asked for PR screenshots or a video.
argument-hint: "[PR number]"
---

Show a PR's visible change in its body, the way PR #44 did, with
`scripts/pr-media.mjs` (usage in its header) and decision 0009: media is
uploaded to GitHub, never committed.

## 1. Decide what to show

- No visible change (docs, CI, tests, data only): no media. The PR
  template's Screenshots section says "None: no visible change."
- Pick the smallest set that shows the change: the fixture, view, tab,
  theme, container width (`width=22`) and viewport where it happens, as a
  playground query. Both themes when the CSS touches both. The `preview`
  skill's shots help find the combination.
- Before/after screenshots for anything static. A new feature with no
  before shows after only.
- A video (a few seconds, `.webm`) only when the change is behaviour over
  time: hover and focus, Escape, the job menu, tab switching, a
  transition. Hover is the panel's main interaction and screenshots can
  show one open tooltip; a video shows several.

## 2. Capture

1. `git fetch origin main`, so the before is the current `main`.
2. Write `.logs/pr-media/<branch, / as ->.mjs` (gitignored) importing
   `../../scripts/pr-media.mjs`. `startPlayground()` serves this worktree;
   `startPlayground({ ref: "origin/main" })` serves a `git archive` copy
   with its own `npm ci`, so the two run side by side. Find slots as
   `browser/helpers.ts` does (`.cs .cs-slot__face` filtered by label).
3. Assert each state (the tooltip is visible, the tab is selected) before
   its `shoot()` or `step()`, so a broken flow fails instead of being
   recorded. Crop with `page.locator(".cs")` unless the page around the
   panel is the point (sideways scroll, a viewport-sized overflow).
4. Run `node .logs/pr-media/<name>.mjs`. Each file prints `ok` with its
   size, or `TOO BIG` over GitHub's 10 MB: shorten the video or shrink the
   viewport.
5. Read every PNG, and a `frame()` still of each video (a `.webm` can't be
   Read). Check that the shots show the change and nothing else broke. If
   they show a problem, that's a finding for the PR, not something to
   crop out.

## 3. Upload and embed

`gh` (v2.99.0 or later; `gh --version`) uploads with `--attach` on
`gh pr create` and `gh pr edit`, using its own sign-in, and rewrites each
local reference in the body to the file's
`github.com/user-attachments/assets/…` URL. Tried on PR #46: only
Markdown references are rewritten, in place, with their alt text kept;
an HTML `<img src="./…">` or a bare `./file` line stays broken and the
file is appended at the end of the body instead.

1. Write the body in `.logs/pr-media/body.md`, next to the media (paths in
   a `--body-file` are relative to its directory). For a PR already open,
   start from `gh pr view <n> --json body -q .body`. Fill its Screenshots
   section with local references, Markdown only:
   - Screenshots in a before/after table, one row per theme or state:
     `![alt](./name.png)`. GitHub fits them to the table. The alt text
     says what the image shows ("Before, game theme: the GitHub tooltip
     runs past the panel's right edge"), not "screenshot".
   - A video as `![what it shows](./name.webm)` on a line of its own: it
     becomes the bare URL, which GitHub shows as a player. A sentence
     above it says what it shows.
   - One line naming the query and viewport, so a reviewer can open the
     same state in `npm run dev` or the demo.
2. Pass the body and one `--attach` per referenced file (up to 50):
   `gh pr create … --body-file .logs/pr-media/body.md --attach .logs/pr-media/a.png …`,
   or `gh pr edit <n>` with the same flags. Every run uploads again, so
   attach only what the body references, once.
3. Check `gh pr view <n> --json body -q .body` has no `./` reference left
   and nothing appended at the end, and that the PR page shows the images
   and a `<video>`. A partial failure still updates the PR with what
   uploaded and exits non-zero: rerun with the failed files.

## Rules

- Never commit media, and don't use a gist (decision 0009).
- The repository is public, so uploads can be opened by anyone with the
  URL, even after the body stops using them. The examples' made-up data is
  fine; nothing from a host's real config, the owner's machine or another
  site.
- Screenshots and videos show a change; they don't verify it. Hover,
  focus and layout behaviour is verified by `npm run test:browser`, and
  the PR by `scripts/check.sh`.
