---
name: preview
description: Screenshots the panel in the playground (each example, both themes, wide and narrow) and reports console errors and visual problems. Use after a change to rendering, CSS or examples, or when asked to show what the panel looks like.
argument-hint: "[--fixture=full,minimal] [--theme=document|game]"
allowed-tools: Bash(node scripts/preview.mjs*), Read
---

Show what the panel looks like on this branch.

1. Run `node scripts/preview.mjs $ARGUMENTS` from the worktree root. It
   starts its own dev server on port 5198, so a running `npm run dev` doesn't
   interfere; if the port is busy (another worktree previewing), say so and
   stop rather than killing the other process. If Chromium is missing, tell
   the user to run `npx playwright install chromium`.
2. Read every PNG it lists (`.logs/preview/<fixture>-<theme>-<layout>.png`).
3. Report, briefly:
   - Each line the script marked FAIL, with its messages verbatim (console
     errors and warnings, page errors, parseConfig reports).
   - What you see that looks wrong: overflow or clipping, text wrapping
     mid-word or onto extra lines, overlapping elements, unreadable
     contrast, a narrow shot that isn't in the narrow layout, the document
     theme showing gradients, rounded-and-shadowed cards or a new accent
     colour (CLAUDE.md's theme rules).
   - Problems already recorded in `docs/roadmap.md` (the `edge-cases`
     findings, the empty-slot glyph contrast) as known, not new.
   - If the task changed rendering, whether the shots show the intended
     change, and which combination shows it best.
4. Screenshots don't cover hover, focus, Escape or the no-JavaScript page;
   say so if the change touches those, and point to `npm run test:browser`.
   Never call the result verified on screenshots alone; `scripts/check.sh`
   is what verifies.
