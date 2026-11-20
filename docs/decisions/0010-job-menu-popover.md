# 0010: The job menu is a popover of links, not a `<details>`

Status: Accepted · 2026-11-19

## Context

The job menu was a `<details>` whose `<summary>` was the toggle and whose
list was absolutely positioned below the gear-set row, over the job
header (`CLAUDE.md`: "the job menu is a `<details>` of links"). Trying
2.0.0-beta.1 in `/next/` found that it ignored Escape and outside clicks
(roadmap, Next up item 1), where the detail windows close both ways.

Measured on `/next/` in Chromium (1280px and 390px wide, `full` and
`edge-cases`): Tab moves on from the last job link and leaves the list
open, and the next stops (`full`'s Core stack slot, `edge-cases`' first
header slot) are entirely under it. Only Shift+Tab back to the toggle
closed it. WCAG 2.2's Understanding 2.4.11 (Focus Not Obscured, AA) allows
user-opened content to persist only if the focused item can be revealed
without going back to that content, Escape being its example. 1.4.13 does
not apply: the list opens on activation, not hover or focus. The WAI-ARIA
APG's disclosure navigation example closes on Escape (required, focus back
to the button) and on focus leaving the menu; arrow keys are optional.

The options:

- A README sentence saying the menu doesn't close on Escape: no change,
  and 2.4.11 still fails.
- `popover="auto"` on the list with a `popoverTarget` button, as the
  detail windows are: Escape from anywhere, a click outside, focus back on
  Escape from inside, `aria-expanded` on the button, all from the browser
  with no script and with JavaScript off. The list moves to the top layer,
  so it is placed with CSS anchor positioning (Baseline since January
  2026) instead of `position: absolute`. It doesn't close on Tab-out.
- Client code on the `<details>` (Escape, focus-out, outside click): the
  APG's behaviour exactly, but a second `"use client"` file against the
  one-client-file rule, and no Escape before hydration or without
  JavaScript.
- The list in the flow, pushing the header down: nothing to obscure, but
  the panel's height jumps when it opens.

## Decision

The list is a `popover="auto"` `<ul>` toggled by a `<button
popoverTarget>`, anchored to the gear-set row where the `<details>` list
was. Without anchor positioning it keeps the popover's own place, centred
on the screen. A second client file, `JobMenuFocus.tsx`, closes the list
when focus moves on out of the menu, as the APG example does; the
one-client-file rule becomes "client files only add to behaviour that
already works without JavaScript".

**Why:** 

In the spirit of the inspiration of this web component, I chose the method that would preserve the visual structure the most, followed by ensuring accessibility standards are maintained. This option was simply the best of it all.

## Consequences

- 2.4.11 is met twice over: with JavaScript, the list never stays open
  over the slot focus moves to; without it (or before hydration), Escape
  closes the list from wherever focus is. The panel has one popup model,
  the detail windows'.
- Two client files instead of one. `JobMenuFocus` is a `<div>` with an
  `onBlur` that hides the open list when focus lands outside the menu;
  focus leaving the page (no next element) keeps it open, and a click
  outside is the popover's own light dismiss.
- The look is unchanged: in Chromium the open list's offset from the row,
  size, colours, border, radius and shadow match the `<details>` list in
  both themes, wide, at 22rem and at 18rem.
- A break for hosts that styled `<details>`, `<summary>` or
  `.cs__jobs[open]`; class names stay. Listed under 2.0.0's breaking
  changes.
- An Escape spent on a slot's tooltip is cancelled (as for the detail
  windows), so with a hovered slot's tooltip showing, the list closes on
  the second Escape.
- Opening a detail window closes the list, and the other way round (one
  `auto` popover closes another).
- Browsers without anchor positioning show the list centred, not below
  the row; worth revisiting only if a host reports one.
