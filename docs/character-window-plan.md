# Character window plan

Drafted 2026-11-11 with the owner (answers to three rounds of open
questions added 2026-11-12), from four screenshots of the reference
game's character window (not committed: they are the game's art). This is
the brief for the sessions that build it. Decisions marked **Decided** were
answered by the owner; **Proposed** ones are this plan's defaults, which an
implementing session follows unless the owner says otherwise; **Open**
ones need the owner's answer before the PR that touches them.

## Goal

Today the package renders the right-hand half of the reference window: the
job header, two slot columns and the portrait (`CharacterSheet`, renamed
`EquipmentPanel` by this work: see Breaking changes). This adds
the rest, as a second component that contains the first:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Title                                                 Character name │  bar
├──────────────────────────────────────────────────────────────────────┤
│ [ Tab one ▸] [ Tab two ] [ Tab three ] [ Tab four ]                  │  tab strip
├───────────────────────────────┬──────────────────────────────────────┤
│                               │ [a][b][J]  CAPTION            [d]    │  gear-set row ([J] = job menu)
│  content of the active tab    │            value                     │
│  (an ordered list of blocks)  │ [slot]  LEVEL / emblem + job  [slot] │  header   ┐ today's
│                               │ [col]   portrait              [col]  │  body     ┘ panel
└───────────────────────────────┴──────────────────────────────────────┘
        content pane                        equipment pane
```

The layout is the product: every piece of text, every icon and every number
comes from the config, as with the slots today.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Tab switching | **Decided.** Links: `?tab=<id>`, like `?job=`. No JavaScript, shareable, back button works, only the active tab is in the HTML. |
| 2 | Content model | **Decided.** Free tabs, each an ordered list of typed blocks. The reference window's four tabs are one arrangement of them. |
| 3 | Levels list (the reference's classes tab) | **Decided.** Its own free entries, unrelated to `jobs` by default. A row may carry an action: the slot action kinds, plus one that switches to a job of the panel. |
| 4 | Who toggles parts | **Decided.** Both: the config (a part without data, or marked `hidden`, isn't rendered) and props on the component (hide parts for one placement). Not visitors at runtime. |
| 5 | Per-job data | **Decided.** Tabs and blocks are defined once; a job may replace a block's content by block id, as jobs fill slots by slot id. |
| 6 | Extra parts | **Decided.** All four: sub-tabs inside a tab, collapsible groups, the gear-set row, the character name in the bar. No close button: a panel on a page has nothing to close. |
| 7 | API shape | **Decided.** A new `CharacterWindow` export from `/react`, on the same config with new optional fields. Today's `CharacterSheet` stays as the equipment-only component, renamed `EquipmentPanel` and given the gear-set row (decision 11); Breaking changes lists what else changes. |
| 8 | Values | **Decided.** Config only. A host with live numbers writes them into the config object before rendering; there is no `values` prop. |
| 9 | Release | **Decided.** A major: 2.0.0, schema `$id` `@2`. The job menu leaves the bar for every host, and the major is the occasion for the other breaks under Breaking changes. |
| 10 | Detail windows | **Decided.** A `fields` row may end in a small icon button that opens a window of more content (in the game: the list of titles, the list of ranks with the current one marked). Opened and closed by pressing the button, not by hover or focus, and larger than a slot tooltip. |
| 11 | Job menu | **Decided.** "Change job" becomes one of the gear-set row's buttons (the note-like third one), and the row is part of the equipment pane, so `EquipmentPanel` has it as well. |
| 12 | Gear-set end button | **Decided.** The game's is "save this set". Here it is a link from the config, or a host's own control (a real save button in an editor). |
| 13 | Row tooltips | **Decided.** Yes: rows can carry the slot tooltip. |
| 14 | Decorative parts | **Decided.** The round buttons under the portrait and the corner marks on slot squares stay decorative (`parts.toolbar`, `parts.sockets`). Later idea for the round buttons: toggling decorative overlays on the portrait. |
| 15 | Narrow order | **Decided.** Tab strip, content, then the equipment pane, which is also the DOM order. |
| 16 | Width | **Decided.** The site's home page has room for the full window (about 58rem). |
| 17 | Detail window placement | **Decided.** Centred on the screen, through the Popover API. |
| 18 | Save button | **Decided.** The package ships none. The importing codebase supplies the control and what it does (`gearSetEnd`). |
| 19 | Default icons | **Decided.** Every button and icon has a default that looks like, or close to, its counterpart in the reference window, and the config can override any of them. |

## What the screenshots show, and what each part becomes

Left pane, per tab of the reference:

- **Attributes.** Two gauges side by side (a label, a figure above a
  coloured bar, a second figure below). Then headed groups of
  label/value rows: one group full width, then two pairs of groups side by
  side. Some rows are primary (bright), some derived (dimmed), some
  highlighted (green). → blocks `gauges` and `stats`.
- **Profile.** Stacked fields, each a small heading with a rule, then a
  value line that may have an icon before it, a small line above or below
  it, and a small icon at the far right. → block `fields`.
- **Classes.** A two-way switch at the top (two pages of the same tab).
  Each page: headed groups in two columns; each row is an icon, a large
  level number (orange at the cap, white below it), a name, and a thin
  progress bar under the name. → sub-tabs (`pages`) and block `levels`.
- **Reputation.** A headed single figure with an icon; a headed section
  with one label/value line, then a disclosure (▸ plus a name) holding
  rows of icon, name, full-width bar, a rank caption under the bar's left
  end and a count under its right. → blocks `fields`, `stats`,
  and `progress` with a collapsible group.

Right pane, beyond what exists:

- **Gear-set row** above the job header: three small square icon buttons
  (the third, note-like one lists the gear sets), a two-line caption
  (small label, larger value), one more icon button at the far right
  (save). → `gearSet`: a caption, icon links, the job menu as the third
  button, and an end control.
- **Bar:** the character's name at the right. → `characterName`.
- Already covered by today's panel: header slots, level, emblem, job
  title, 6+6 slots, portrait, corner badge, the decorative toolbar under
  the portrait and the socket dots.

## Public API

### Component

```tsx
import { CharacterWindow } from "@solution-nine/wol-character-panel/react";

<CharacterWindow
  config={config}
  job={job}
  tab={searchParams.tab}        // raw ?tab= value; unknown or missing falls back to the first tab
  page={searchParams.page}      // raw ?page= value, for a tab with pages
  tabParam="tab"                // optional, like jobParam
  pageParam="page"
  parts={{ gearSet: false, toolbar: true }}  // optional: which parts are drawn
  hiddenTabs={["reputation"]}   // optional: tab ids to leave out here
  gearSetEnd={<SaveButton />}   // optional: the host's own control at the row's right end
  // …and every EquipmentPanel prop: basePath, jobParam, theme, labels,
  // label, renderLink, renderPortrait, isParamActive
/>
```

- `parts` is described under Breaking changes, 7. `tabs: false` removes
  the strip and the content pane (the window is then the equipment pane
  under the bar); `equipment: false` leaves only the content
  pane. With one visible tab the strip isn't drawn (as the job menu isn't
  with one job) and its content still is.
- `gearSetEnd` is a `ReactNode` the host owns (a client component of its
  own, say a save button in an editor). It takes the place of a config
  link with `position: "end"`. `EquipmentPanel` takes it too.
- A Server Component, with no new client code. `SlotHover.tsx` stays the
  only `"use client"` file; row tooltips reuse it unchanged.
- `LinkRendererProps["intent"]` gains `"tab"` (tab and page links), so a
  host can keep scroll position as it may for `"job"`. Only
  `CharacterWindow` emits it. A host `switch` over `intent` with no
  default would need a case: say so in the PR and the CHANGELOG.

### Entries

- `/react` must export two components, and entry files only re-export, so
  add `src/react-entry.ts` (like `schema-entry.ts`) re-exporting
  `EquipmentPanel`, `CharacterWindow` and the prop types, and point the
  `./react` export at it. `src/entries.test.ts` then snapshots
  `react-entry.ts`: in 2.0.0 its list gains `CharacterWindow` and has `EquipmentPanel` in
  place of `CharacterSheet` (a removal: part of the major).
- `.` gains `resolveTab(config, tabParam, pageParam?)` (the active tab and
  page, for a host that wants them for its own heading or metadata),
  `tabHref(...)`, and `resolveBlocks(config, job)` if it turns out useful
  to hosts (otherwise keep it private); new groups in `LIMITS`; new types.
- `/schema` still exports one thing, the whole config's schema, renamed
  `characterPanelConfigSchema`.

### URLs

- `tab` and `page` are the default parameter names. The first visible tab
  and a tab's first page get no parameter, so each view has one canonical
  URL (as the default job does).
- Switching job keeps `tab` and `page`. Switching tab keeps `job` and
  drops `page`. A slot's or row's `param` action keeps all three.
  Build them all on `withQuery`.
- A slot or row must not set the window's own parameters. From 2.0.0
  `PARAM_NAME_PATTERN` refuses `tab` and `page` as it refuses `job`
  (Breaking changes, 2), which covers the default names. For a host that
  renames them, the rule `jobParam` has today applies: a `param` action
  whose name equals `tabParam` or `pageParam` renders without a link.

## Config additions

All optional: a config needs none of them, and `CharacterWindow` then
draws the bar and the equipment pane. (A 1.x config still has to meet
2.0.0's tighter rules: Breaking changes 2, 4 and 5.) Names below are **Proposed**.

```jsonc
{
  "title": "Character",
  "characterName": "Alex Le",                       // bar, right
  "gearSet": {                                       // a job may set its own `gearSet`
    "label": "Résumé", "value": "v14 · Nov 2026",
    "jobMenu": { "label": "Change job", "icon": "≡" },   // optional: the built-in button's name and icon
    "links": [
      { "id": "pdf", "label": "Download PDF", "icon": "⭳", "action": { "kind": "link", "href": "/resume.pdf" } },
      { "id": "git", "label": "GitHub", "icon": "GH", "position": "end",
        "action": { "kind": "external", "href": "https://github.com/…", "newTab": true } }
    ]
  },
  "tabs": [
    {
      "id": "attributes", "label": "Attributes", "icon": "◆",
      "blocks": [
        { "type": "gauges", "id": "vitals", "rows": [
          { "label": "Years", "value": "6", "secondary": "since 2020", "fill": 100, "tone": "primary" },
          { "label": "Focus", "value": "80%", "fill": 80, "tone": "secondary" }
        ] },
        { "type": "stats", "id": "core", "groups": [
          { "label": "Attributes", "icon": "✦", "rows": [
            { "label": "Front end", "value": "4602", "tone": "highlight",
              "tooltip": { "title": "Front end", "note": "Component libraries, accessibility, performance." } },
            { "label": "Avg. review time", "value": "1.2 d", "tone": "muted" }
          ] },
          { "label": "Offensive", "column": "start", "rows": [ … ] },
          { "label": "Defensive", "column": "end", "rows": [ … ] }
        ] }
      ]
    },
    {
      "id": "skills", "label": "Skills",
      "pages": [                                     // a tab has `blocks` or `pages`, not both
        { "id": "build", "label": "Build", "icon": "⚒", "blocks": [
          { "type": "levels", "groups": [
            { "label": "Front end", "column": "start", "rows": [
              { "label": "React", "level": "7", "fill": 90, "tone": "highlight", "icon": "Re",
                "action": { "kind": "param", "name": "stack", "value": "React", "target": "projects" } },
              { "label": "Healthcare work", "level": "4", "action": { "kind": "job", "id": "healthcare" } }
            ] }
          ] }
        ] },
        { "id": "run", "label": "Run", "blocks": [ … ] }
      ]
    },
    {
      "id": "reputation", "label": "Reputation", "hidden": true,
      "blocks": [
        { "type": "fields", "rows": [
          { "label": "Recommendations", "value": "37", "icon": "♥" },
          { "label": "Title", "value": "Senior developer", "caption": "Since 2024",
            "detail": { "label": "All titles", "icon": "☰", "title": "Titles", "blocks": [
              { "type": "stats", "groups": [ { "rows": [
                { "label": "Senior developer", "value": "2024–", "tone": "highlight" },
                { "label": "Developer", "value": "2020–2024" }
              ] } ] }
            ] } }
        ] },
        { "type": "progress", "label": "Communities", "groups": [
          { "label": "Open source", "collapsible": "open", "rows": [
            { "label": "Project A", "fill": 100, "caption": "Maintainer", "value": "212 PRs", "icon": "A" }
          ] }
        ] }
      ]
    }
  ],
  "jobs": [
    { "id": "healthcare", "…": "…",
      "gearSet": { "label": "Résumé", "value": "Healthcare" },
      "blocks": { "vitals": { "type": "gauges", "rows": [ … ] } }   // replaces block "vitals" for this job
    }
  ]
}
```

### Shared pieces

- **Icons:** `icon` (a glyph of up to 4 characters) or `iconSrc` (an
  image), as slots have. Always decorative; the label names the thing.
- **`fill`:** a number from 0 to 100. Left out, the bar isn't drawn
  (except `gauges`, where it defaults to 100).
- **`hidden: true`** on a tab, a page, a block, or `gearSet`: kept in the
  config, never rendered. `publicConfig()` also strips them, so a host
  that ships the public config to the browser doesn't ship hidden data.
- **Block `id`:** optional; only a block with one can be replaced by a
  job. Ids are unique across all tabs (`parseConfig` reports duplicates).
- **Block `label` and `icon`:** an optional heading with a rule above the
  block.
- **Groups** (`stats`, `levels`, `progress`): `label?`, `icon?`, `rows`,
  and
  - `column: "start" | "end"`: consecutive groups that set it form a
    two-column run, the `start` ones stacked on the left and the `end`
    ones on the right (the reference's classes page is two such stacks of
    unequal length, which a row-flow grid can't reproduce). A group
    without it spans the pane and ends the run. When the pane is narrow
    the run becomes one column, in config order.
  - `collapsible: "open" | "closed"`: the group is a `<details>` with its
    label as the `<summary>` (no JavaScript). Needs a `label`; without
    one `parseConfig` reports it and the group renders plain.
- **Row actions** (`fields`, `levels`, `progress` rows, `gearSet` links):
  the slot action kinds (`anchor`, `link`, `external`, `param`, `none`)
  plus `{ "kind": "job", "id": "<job id>" }`, which links like the job
  menu does (intent `"job"`) and is `aria-current` on the current job. A
  `job` action naming no job in the config (unknown, or a draft after
  `publicConfig()`) renders the row without a link; `parseConfig` reports
  an unknown id.
- **Row tooltips:** a row of `gauges`, `stats`, `levels` or `progress` may
  carry `tooltip`, the same shape slots use (`tooltipSchema`, with the same
  limits as a slot's; `subtitle` defaults to the row's label). It shows on hover
  and keyboard focus through CSS and hides on Escape, exactly as a slot's
  does. A row with a tooltip and no link is focusable (a named group with
  `tabIndex={0}`, as a tooltip-only slot is); a row with neither takes no
  Tab stop.
- **Detail windows:** a `fields` row may carry `detail`: `label` (the
  button's accessible name), `icon?`/`iconSrc?`, `title`, and `blocks`
  (any block types, up to the per-tab block limit; a `detail` inside one
  is not allowed, so windows don't nest). It draws a small icon button at
  the row's right end. See Rendering.

### Blocks

| `type` | Shape | Renders as |
| --- | --- | --- |
| `gauges` | `rows` (1 to 4): `label`, `value`, `secondary?`, `fill?`, `tone?: "primary" \| "secondary"`, `tooltip?` | Two per line. Label left and `value` right, the bar under them, `secondary` under the bar, right-aligned. |
| `stats` | `groups` of `rows`: `label`, `value`, `tone?: "default" \| "muted" \| "highlight"`, `tooltip?` | A `<dl>` per group: label left, value right-aligned in tabular figures. |
| `fields` | `rows`: `label`, `value`, `overline?`, `caption?`, `icon?`/`iconSrc?`, `action?`, `detail?` | Per row: `label` as a small ruled heading; under it the icon, then `overline` (small, muted), `value`, `caption` (small, accent), and the `detail` button at the right end. With an action the value line is the link. |
| `levels` | `groups` of `rows`: `label`, `level` (short text), `fill?`, `tone?: "default" \| "highlight"`, `icon?`/`iconSrc?`, `action?`, `tooltip?` | Per row: icon square, large `level`, then `label` with a thin bar beneath it. `highlight` colours the level (the reference's level cap). |
| `progress` | `groups` of `rows`: `label`, `fill?`, `caption?`, `value?`, `icon?`/`iconSrc?`, `action?`, `tooltip?` | Per row: icon and `label`; a full-width bar; `caption` under its left end, `value` under its right. |

### Gear-set row

Part of the equipment pane, above the job header, in both components.

- Start group: the `links` without `position: "end"` (up to 2), then the
  job menu button. A third start link or a second end link is reported
  by `parseConfig` and not shown. Then the caption (`label` small, `value` larger). At
  the right end: `gearSetEnd` if the host passes it, else the link with
  `position: "end"`, else nothing.
- **Job menu:** today's `<details>` list of job links, with an icon as its
  toggle (accessible name from `jobMenu.label`, default "Change job"; the
  default glyph is the package's). It keeps the `cs__jobs*` class names.
  Not drawn with one job, or with `parts={{ jobMenu: false }}`.
- **When the row is drawn:** in both components, whenever there is
  anything to put in it (more than one job, a `gearSet`, or
  `gearSetEnd`). The bar never holds the job menu. For a 1.x host with
  several jobs this moves "Change job" from the bar into a new row above
  the job header, with an icon as its toggle: the break behind 2.0.0.
- The existing tests that expect the menu in the bar change with it.
  That is this decision carried out, not a test loosened to pass; the PR
  says so and lists each changed expectation.

### Default icons

- Every icon the package draws has a default close to the reference
  window's, and `icon` (a glyph) or `iconSrc` (an image) overrides it
  wherever a config can reach it.
- The defaults are the package's own drawings: small inline SVGs in a
  private `src/icons.tsx`, in `currentColor` so both themes colour them.
  They echo the reference's shapes (a note for the job menu, two arrows
  in a circle for the end control, a triangle in a circle for a
  collapsible group, a small page for a detail button, a pointer on the
  active tab) without copying its artwork, which isn't ours to ship.
- Fixed controls always have such a default: the job menu, the detail
  button, the detail window's close button, the collapsible marker, the
  active-tab marker, the toolbar's six buttons (replacing today's
  glyphs), and the end control's look, offered to hosts as a class
  (`cs__gear-button`) to put on their own button.
- Free content (tabs, block and group headings, rows, gear-set links,
  slots) can't have one fixed default, since the package doesn't know
  what a row means. Two parts:
  - `iconName`: an optional third way to set an icon, naming one of the
    built-in drawings. **Decided** starter set, from what the
    screenshots use: `sword`, `shield`, `wand`, `cross`, `bow`, `star`,
    `heart`, `person`, `note`, `list`, `save`, `gear`, `hammer`, `leaf`,
    `crest`, `flag`. Order of precedence: `iconSrc`, `icon`, `iconName`.
    Adding names later is a minor; removing one is a major.
  - With none of the three, a heading has no icon and a row's icon
    square shows the label's first two letters, as slots do now.
- `examples/full.json` uses `iconName` so the demo looks like the
  reference out of the box.

### Jobs

- `job.blocks`: a record of block id → a whole block, replacing the
  shared one for that job. It must have the same `type`. An unknown id or
  a different type is reported by `parseConfig` and ignored (the shared
  block shows). Replacement, not merging: predictable, and an editor
  shows exactly what will render.
- `job.gearSet`: replaces the config's for that job.
- A block that only some jobs should show isn't covered (a job can't hide
  a block). Add it only when a real config needs it.

### Limits

New groups in `LIMITS`, each written once and used by the schemas, as
now. Loosening a limit later is a minor and tightening one is a major, so
start snug: enough for the reference layout and a little more.
**Proposed:** tabs 6, pages per tab 4, blocks per tab or page 8, groups
per block 8, rows per group 12, gauge rows 4, `gearSet` links 3 (two at the start, one at the end), level
text 4, tab and page labels 24, row labels and values as `pair` (40/80),
captions and overlines 60. `examples/edge-cases.json` fills every one, and
the PR measures the result (as the tooltip was measured) before the limits
ship.

### Parsing

- `parseConfig` keeps one bad entry from costing the rest, as it does for
  jobs: tabs are checked one at a time, and inside a tab each block. A
  bad block is dropped and reported; a tab left with no blocks is dropped
  and reported. A bad `job.blocks` entry is dropped and reported without
  dropping the job (parse the job with its `blocks` loosened, then check
  each). The exported zod schema and the JSON Schema stay exact, as they
  are for jobs.
- Also reported: duplicate tab, page or block ids; a tab with both
  `blocks` and `pages`; the cases named above.
- New plain `z.object`s only, so the JSON Schema closes them and
  `parseConfig` strips unknown keys. Run `npm run generate:schema`.
- `findUnknownKeys` lines input up with output by index, so its existing
  caveat (use it on a parse without errors) now covers tabs and blocks.

## Breaking changes in 2.0.0

The major is needed for the first; the rest ride along because a major is
the only time they can. All seven are **Decided**. The owner is the
package's only consumer today, so the cost of breaking is one upgrade PR
in the site.

1. **The job menu moves** from the bar to the gear-set row
   (in `EquipmentPanel` too), and its toggle is an icon. Hosts that style or
   test `.cs__bar .cs__jobs` are affected.
2. **`PARAM_NAME_PATTERN` also refuses `tab` and `page`**, as it refuses
   `job`, so a slot can't clobber the window's own parameters. Because
   the pattern is part of the job's schema, a 1.x job with a slot action
   named `tab` or `page` fails to parse and `parseConfig` drops that
   whole job, as it does any invalid job, and reports it.
3. **`LinkRendererProps["intent"]` gains `"tab"`.**
4. **Limits the roadmap found too loose**, both measured and written up
   under Done ("The `edge-cases` findings") and accepted then:
   - the tooltip at its limits is about 985px tall against a 598px
     panel, left because a tighter limit is a major. Tighten
     `LIMITS.tooltip` (`items`, `item`, `note`,
     `subtitle`) until an at-limit card fits a height the PR measures;
     this matters more now that rows carry tooltips too.
   - `LIMITS.job.levelLabel` (20) breaks the header under about 20rem
     (`document`) or 22rem (`game`). The roadmap's other fix was moving
     the header slots on very small panels; a shorter limit is the
     simpler one now. Tighten it to what fits at the narrowest
     supported width.
   Check the site's saved config against the new numbers first, and name
   each old and new value in the CHANGELOG.
5. **Slot columns capped at 6** in `parseConfig` (a seventh `left` or
   `right` slot reported and not shown, as a second header slot is
   today). The layout was only ever drawn for 6, and beside a content
   pane a longer column stretches the window.

6. **`CharacterSheet` becomes `EquipmentPanel`**, now that it is one pane
   of a window, and the "character sheet" name goes everywhere a host
   can see it, so the package has one vocabulary:

   | 1.x | 2.0.0 |
   | --- | --- |
   | `CharacterSheet`, `CharacterSheetProps` | `EquipmentPanel`, `EquipmentPanelProps` |
   | `characterSheetConfigSchema` (`/schema`) | `characterPanelConfigSchema` |
   | type `CharacterSheetConfig` | `CharacterPanelConfig` |
   | `…/character-sheet.css` | `…/character-panel.css` |
   | `…/character-sheet.schema.json` (and its `$id`) | `…/character-panel.schema.json` |

   No aliases for the old names: the owner is the only consumer, and a
   clean major is simpler than a deprecation path. The source files
   follow (`src/EquipmentPanel.tsx`, `src/character-panel.css`), as do
   `scripts/generate-schema.mjs`, the `exports` map, `scripts/smoke/`,
   the README's title and tables, and CLAUDE.md. Grep for both old
   names rather than trusting this list; they are also hard-coded in
   `package.json` (`files`, the `build` copy step, `lint:package`,
   `keywords`), `scripts/strip-dts-css-imports.mjs`, `scripts/check.sh`,
   `tsconfig.build.json`, both workflows, `CONTRIBUTING.md`, the
   playground, each example's `$schema`, `.claude/agents/reviewer.md`
   and the `release-prep` skill. The default `label`
   prop ("Character sheet") becomes "Character panel". Unchanged: the
   package name, the `cs` class prefix and every `--cs-*` variable (a
   rename there would touch every rule and every host override for no
   gain), `LinkRendererProps`, and the data functions' names.
7. **One prop for what is shown.** `showSockets` and `showToolbar` become
   one `parts` object of booleans, which also covers the new parts,
   each with a stated default:

   | Key | Default | In |
   | --- | --- | --- |
   | `bar`, `characterName`, `jobMenu`, `gearSet` | `true` | both components |
   | `tabs`, `equipment` | `true` | `CharacterWindow` |
   | `toolbar`, `sockets` | `false` (decorative) | both components |

   `parts={{ toolbar: true, gearSet: false }}` reads the same way for
   every key, though two parts start off and the rest start on.
   `hiddenTabs` stays its own prop: it takes tab ids, not parts.
   `gearSet: false` removes the whole row, and with it the job menu and
   `gearSetEnd`; `jobMenu: false` removes only that button.

Considered and left out: raising the peer or Node floors. Nothing here
needs it.

## Rendering

### Markup and accessibility

- Root: `<section class="cs cs--window" data-cs-theme data-cs-labels aria-label>`,
  so the window takes the same `--cs-*` variables and theme blocks. New
  class names follow the existing BEM-ish scheme (`cs__tabs`, `cs__tab`,
  `cs__pane`, `cs-block`, `cs-block--stats`, `cs-gauge`, …) and are pinned
  by tests like the current ones, since hosts restyle them.
- The tab strip is navigation, not an ARIA tablist: a `<nav aria-label>`
  holding a list of links, the active one `aria-current="page"`. A
  tablist promises arrow-key behaviour that needs JavaScript. Sub-tabs
  are a second, nested `<nav>` with its own label.
- No heading elements, as in the current panel (they would land in the
  host page's outline at an unknown level). Block and group labels are
  `<p>`s that name their group through `aria-labelledby`.
- Bars: `role="meter"` with `aria-valuenow`, `aria-valuemin="0"`,
  `aria-valuemax="100"` and `aria-labelledby` its row's label. Fill
  against track needs 3:1 (WCAG 1.4.11) in both themes; tone is never the
  only signal (the value is always text). Check how axe treats `meter`
  first, and fall back to `role="img"` with an `aria-label` if needed.
- **Row tooltips** reuse `SlotHover` as it is. `SlotTooltip` is tied to
  slots today (it takes a slot and its content, draws the slot's icon
  and falls back to the slot's label), so it is generalised to take a
  tooltip, an icon and a fallback subtitle; `.cs-tip`'s placement is
  keyed to the slot columns, so rows get their own placement rules. They
  open below the row, inside the pane. Check on a touch screen that a
  tooltip-only row can be reached at all (slots sidestep this by showing
  their names); if it can't, the tooltip's text needs another way in at
  narrow widths before this ships.
- **Detail windows** use the HTML Popover API: the button is
  `<button type="button" popoverTarget={id}>` and the window is
  `<div popover="auto" role="dialog" id={id}>` holding a title bar, the blocks, and a close
  button (`popoverTargetAction="hide"`). The browser gives it everything
  asked for with no script of ours: press to open, press again or Escape
  or a click outside to close, the top layer (nothing clips it, no
  z-index), and focus returned to the button. It is centred in the
  viewport like a small window, about 24rem wide, scrolling inside if
  taller than the viewport. All of it is in the HTML, so it works on
  `/static` with JavaScript off. React 19.0 (the peer floor) passes the
  attributes through; browsers have had it since 2024 (Chrome 114,
  Safari 17, Firefox 125), and before that the content simply stays
  hidden. The `dialog` role lets `aria-labelledby` name it by its title (a bare
  `div` may not be named). React wants the camel-cased attribute names;
  the lowercase ones log a warning, which fails `scripts/preview.mjs`. If testing
  turns up a blocker, fall back to a `<details>` positioned like the job
  menu.
- Rows with an action are links through `renderLink` with the same
  handling slots have (new-tab text, `aria-current` for an active param).
  Rows with neither an action nor a tooltip are plain text and take no
  Tab stop.
- DOM order: bar, tab strip, content pane, equipment pane. The visual
  order never departs from it (WCAG 2.4.3), which settles the narrow
  layout below unless the owner chooses otherwise.

### Sharing the equipment pane

Move `CharacterSheet`'s header and body (and the private `SlotList`,
`Slot`, `SlotTooltip`, `Toolbar`, `PortraitPlaceholder`) into a private
`src/EquipmentBody.tsx`; the panel and `CharacterWindow` both render
it. In PR 1 the panel's HTML must not change by a byte: its render tests
pass untouched. (`EquipmentBody` is the private inside; `EquipmentPanel` is the public
component that wraps it in the section and the bar.)

### CSS

- The slot layout switches on `@container cs (max-width: 26rem)`, and
  `.cs` is that container. In the window the equipment pane must answer
  to its own width, so `.cs--window` names its container `cs-window` and
  the pane's wrapper (`.cs__equipment`) becomes the `cs` container. The
  existing rules then apply to the nearest `cs` container in both
  components without being rewritten. Confirm in the browser tests.
- Window width: the content pane about 26rem beside the 30rem equipment
  pane, so about 58rem at most. Below about 46rem of container width the
  panes stack (content, then equipment), and the tab strip wraps to two
  rows of two when it must.
- The content pane's height follows its content; the equipment pane keeps
  its own height and aligns to the top. No inner scrolling.
- New variables, each with a document-theme value built from existing
  tokens: `--cs-gauge-primary`, `--cs-gauge-secondary`, `--cs-bar-track`,
  `--cs-bar-fill`, `--cs-level-highlight`, `--cs-stat-highlight`,
  `--cs-tab-bg`, `--cs-tab-active-bg`.
  - `document`: no new colours. Both gauge tones and the highlights
    resolve to `--cs-accent` or `--cs-ink`; tabs are flat with a rule and
    an accent underline on the active one. No gradients, shadows or
    rounded cards.
  - `game` only: the bevelled tab buttons with the gold marker at the
    active tab's left, green and pink gauges, the orange level cap,
    gradients on bars and icon squares.
- Tooltips of the right slot column open leftward over the content pane;
  check they stay above it (stacking) and inside the window.
- The gear-set row and the detail window follow the theme rules: flat
  and ruled in `document`; in `game` the square bevelled icon buttons and
  a framed window with a title bar.

### Playground, tests, tooling

- Playground: a `view` control (`window` or `equipment`) plus `tab` and `page`
  read from the URL as a host would; `/static` gets the same. Links built
  from `BASE_URL`, as now.
- Examples: `full.json` gains all three top-level fields with every block
  type; `minimal.json` stays without them (the window with no tabs);
  `edge-cases.json` fills the limits. Every example still parses cleanly
  and renders in both components.
- Vitest: `parse` and `resolve` units for everything under Parsing and
  URLs; `src/CharacterWindow.test.tsx` server-rendered with targeted
  assertions; the entries snapshot. Coverage thresholds don't go down.
- Playwright: tab and page links with JavaScript off on `/static`,
  `aria-current`, focus rings on every new Tab stop in both themes,
  `<details>` by keyboard, row tooltips (hover, focus, Escape), detail
  windows (open and close by button, Escape, outside click, focus back
  on the button, and with JavaScript off), the job menu in the gear-set
  row in both components, and the row drawn for a config with several
  jobs and no `gearSet`, the side-by-side and stacked layouts following
  the container, the equipment pane's own narrow layout inside a wide
  window, axe on every example × theme × layout × tab.
- `scripts/preview.mjs`: a wider viewport and one shot per tab for the
  window view.
- README (Entries, Files, Config, Usage, Behaviour, Theming) and a
  CHANGELOG line in each host-visible PR.

## Work order

One PR and one session each, in a fresh worktree, `scripts/check.sh`
green, reviewed by the `reviewer` subagent before the PR opens.

1. **Extract the equipment pane.** `src/EquipmentBody.tsx`,
   `src/react-entry.ts`, the container rename groundwork in the CSS. No
   host-visible change, no CHANGELOG line; existing tests untouched
   except the import in `src/entries.test.ts`, which now reads the
   `/react` entry from `react-entry.ts` (its snapshot stays the same).
2. **Config and data.** Schemas, `LIMITS`, types, `parseConfig`,
   `publicConfig`, `resolveTab`, `tabHref`, block replacement, the
   generated JSON Schema, examples, unit tests, README Config section.
   Host-visible (new optional fields): CHANGELOG.
3. **The renames and the breaks.** Two commits' worth in one PR, in this
   order so the diff stays readable: first Breaking changes 6 as a pure
   rename (`git mv`, no behaviour change, the entries snapshot updated
   as the semver decision it records); then the gear-set row in the
   equipment pane (links, caption, job menu button, `gearSetEnd`),
   `src/icons.tsx` with the fixed controls' defaults and `iconName`,
   and Breaking changes 1 to 5 and 7 (3 as the widened type, though only
   PR 4's window emits `"tab"`; of 7, the keys both components share,
   with `tabs` and `equipment` arriving with the window). Every break
   in one PR, so the
   CHANGELOG's Unreleased section and the PR body list them once, and
   the PR says what breaks. From this merge on, `main` is 2.0.0 in the
   making: a 1.x patch, if one is ever needed, is cut from the `v1.0.4`
   tag on its own branch.
4. **The window.** `CharacterWindow` with the bar, tab strip, sub-tabs,
   both layouts, the window's `parts` and `hiddenTabs`, and the blocks `gauges`,
   `stats` and `fields` with row tooltips. Playground, `/static`, preview
   script, server-render and browser tests, README.
5. **Lists and detail windows.** `levels` and `progress`, two-column
   runs, collapsible groups, the `job` action, and `detail` on `fields`
   rows. Tests as above.
6. **Finish.** Game-theme polish against the screenshots, limits measured
   on `edge-cases`, the roadmap's Done entry. Then the owner runs
   `/release-prep` (2.0.0, which regenerates the schema so its `$id`
   reads `@2`) and tags.

After the release, in the site's own repository and session, an upgrade
PR that handles the break (the site depends on `^1`, so nothing reaches
it before then): bump to `^2`, `npm run generate:character-schema` (the
backend's copy must accept the new keys before the admin can save them),
check the saved config against the tightened limits, the 6-slot cap and
the reserved parameter names (a job that breaks one is dropped whole), restyle anything that assumed the menu in the bar, take the renames
(the component, the config type, the CSS and schema paths, the schema
export, `parts`
for `showSockets`/`showToolbar`), then
switch the home page to `CharacterWindow` and extend the admin editor,
which supplies its own save button.

## Open questions for the owner

None. Three rounds are answered and folded in above: decisions 1 to 19,
all seven breaking changes, and the sixteen `iconName` names. What stays
for the implementing sessions to settle by measuring, each reported in
its PR:

- the tightened tooltip and level-label limits (Breaking changes, 4) and
  the new limits (Limits), from `edge-cases` in the browser;
- whether a tooltip-only row can be reached on a touch screen (Markup and
  accessibility);
- how axe treats `role="meter"`, and the Popover API in the browser tests
  (same section), each with its fallback named there.

## Ideas for what the parts can hold

- **Gauges:** years of experience against a goal, availability this
  month, a current-project progress figure, anything a host computes
  (commits this year, uptime) and writes into the config before render.
- **Stats:** headline numbers by group: projects shipped, languages,
  years per discipline; `muted` rows for the derived ones.
- **Fields:** role and employer, location, pronouns, education,
  languages spoken, "member since"; an `action` to the matching page
  section.
- **Levels:** skills grouped by discipline, `level` as years or a
  self-rating, `fill` as progress to the next, `highlight` for the
  strongest; a `param` action that filters the page's projects by that
  skill (`?stack=React#projects`, which the site already reads), or a
  `job` action to switch persona.
- **Progress:** employers or clients with tenure, communities and
  open-source projects with a rank caption, certifications under way; a
  collapsible group per era or per kind.
- **Gear-set row:** résumé version as the caption; links to the PDF,
  GitHub, LinkedIn, contact.
