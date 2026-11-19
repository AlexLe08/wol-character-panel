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

GitHub has no API or `gh` command for attachments, so files go up through
a comment box in the Playwright MCP browser, which turns them into
`github.com/user-attachments/assets/…` URLs. The PR has to exist: push the
branch and open it (a draft is fine) first.

1. Open the PR in the Playwright MCP browser. If it's signed out, open
   `https://github.com/login?return_to=<PR path>` and ask the owner to sign
   in. Never type, read or store credentials.
2. Click the new comment's `role=button[name="Attach files"]`, then call
   `browser_file_upload` with the absolute paths. Files under the main
   checkout (worktrees included) upload directly; if the tool names other
   allowed roots, copy the files there and delete the copies after. Don't
   also catch the file chooser in `browser_run_code_unsafe`: that uploads
   every file twice (PR #44).
3. Read `#new_comment_field`'s value until it holds one URL per file
   (`browser_wait_for` doesn't see textarea values). Then clear it with
   `fill("")`. Never press Comment.
4. Write the body to `.logs/pr-media/body.md` (start from
   `gh pr view <n> --json body -q .body`) and fill its Screenshots
   section:
   - Screenshots in a before/after table, one row per theme or state:
     `<img width="…" alt="…" src="…">`, the width being the shot's, so a
     wide shot doesn't stretch the table. The alt text says what the image
     shows ("Before, game theme: the GitHub tooltip runs past the panel's
     right edge"), not "screenshot".
   - A video as its bare URL on a line of its own (GitHub shows a
     player), with a sentence above it on what it shows.
   - One line naming the query and viewport, so a reviewer can open the
     same state in `npm run dev` or the demo.
5. `gh pr edit <n> --body-file .logs/pr-media/body.md`. Then check the PR
   page shows the images and a `<video>`, and that
   `gh pr view <n> --json comments` has no new comment.

## Rules

- Never commit media, and don't use a gist (decision 0009).
- The repository is public, so uploads can be opened by anyone with the
  URL, even if the comment is never posted. The examples' made-up data is
  fine; nothing from a host's real config, the owner's machine or another
  site.
- Screenshots and videos show a change; they don't verify it. Hover,
  focus and layout behaviour is verified by `npm run test:browser`, and
  the PR by `scripts/check.sh`.
