# Behaviour

How the panel and the window behave in the browser: tooltips, menus, tabs,
rows, detail windows and the layouts. The
[README](../README.md) has the quick start, and
[config.md](config.md) the fields that drive it.

- **Tooltips:**
  - CSS shows them on hover (on devices that can hover) and on keyboard focus,
    so they work before hydration and without JavaScript.
  - Escape hides them (WCAG 1.4.13). An Escape that hides a tooltip is
    cancelled (`preventDefault`), so a detail window, or a host's own dialog
    around the panel, closes on the next Escape, not with the tooltip.
  - On touch screens, a tap on a slot with a link simply follows it, so a
    linked slot's tooltip can't be seen there (a known limit; the narrow
    layout shows its name). A tap on a slot with no link (a `none`
    action) shows its tooltip, and a tap elsewhere hides it, through CSS
    too, as a tooltip-only row's does.
- **Job menu:** an icon button in the gear-set row (its name from
  `gearSet.jobMenu.label`), opening a list of job links below the row. It
  uses the Popover API (`popover="auto"`), so it needs no JavaScript: the
  button opens and closes it, as do Escape and a click outside; Escape
  from inside the list returns focus to the button. Tab moves from the
  button into the list, and the list closes when focus lands outside the
  menu, so it never stays over the slot focus moved to (WCAG 2.4.11).
  That one needs JavaScript; without it, Escape closes the list from
  wherever focus is. It works with the back button and makes every job
  shareable.
  It isn't drawn for a config with one job. Where the browser lacks CSS
  anchor positioning, the list opens centred on the screen instead.
- **Layout:** below a 26rem container width, the portrait moves on top. The
  columns become 3-column grids with the slot names showing, since touch
  screens get no tooltip on a linked slot. This is a container query, so it follows the
  panel's width, not the viewport.

- **Tabs (`CharacterWindow`):** a navigation list of links (`?tab=<id>`),
  the current one `aria-current="page"`; a tab with pages gets a second list
  of sub-tab links (`?page=<id>`), named by its tab. The first visible tab
  and a tab's first page have no parameter, so each view has one URL. Only
  the active tab is in the HTML. With one visible tab (or page) there is no
  strip. Changing job keeps the tab and page; changing tab keeps the job and
  drops the page; a param action keeps all three, and one naming the
  window's own parameters (`tabParam`, `pageParam`, `jobParam`) is drawn
  without a link.
- **Rows:** a row with an action is a link through `renderLink`, named by
  its text (a `job` action has intent `"job"` and is `aria-current` on the
  current job). A row with a tooltip shows it as a slot does (hover,
  keyboard focus, Escape); without a link it is a focusable group named by
  its text. On a touch screen a tap shows a tooltip-only row's tooltip and a
  tap elsewhere hides it. Rows with neither a tooltip nor an action take no
  Tab stop. Bars are `role="meter"` (0 to 100) named by their row's label,
  and sit outside a row's link, so their number isn't read as part of its
  name. A gauge's or stat's label keeps at least 6rem; a longer value wraps
  under it, still right-aligned. Gauges are two per line, one per line in a
  pane narrower than 22rem. Levels line up down a group, at its widest
  level's width.
- **Groups:** a two-column run is two stacks, each with its own row
  heights; when the pane is narrower than 22rem they become one column, the
  `start` groups first (also their order for screen readers and the Tab
  key). A `collapsible` group is a `<details>` whose summary is its label.
- **Detail windows:** a `fields` row's `detail` is a small button at the
  row's right end that opens a window centred on the screen, with a title
  bar, a close button and its blocks. It uses the Popover API
  (`popover="auto"`, `role="dialog"`), so it needs no JavaScript: the button
  opens and closes it, as do Escape and a click outside, and focus goes
  back to the button. Tab from the button moves into the window. The close
  button is named "Close". Its body scrolls when it is taller than the
  screen. A row's tooltip inside it is drawn past the window's edges where
  the browser supports CSS anchor positioning and the viewport is at least
  45rem tall: below its row, above it, beside the window, or, with no room
  for those, near the top of the screen. Elsewhere it opens inside the
  window's scrolling body. In those viewports a window's two-column runs
  follow the content pane's width rather than the window's.
- **Window layout:** the content pane beside the 30rem equipment pane, up to
  58rem; below a 46rem container width the panes stack in DOM order (tab
  strip, content, equipment), and below 26rem the tab strip is two per row.
  In the `game` theme the tabs share the strip equally at every width, as
  many 9rem-or-wider columns as fit.
  The equipment pane's own layout follows its own width. With one pane (no
  tabs, or a part turned off) the window is as wide as the panel.
