# Config reference

Every field of the config, its limits and what `parseConfig` does with a
bad one. The [README](../README.md) has the quick start; the limits are
also exported as `LIMITS` (max lengths and counts, grouped like the
config), `ID_PATTERN` and `PARAM_NAME_PATTERN`.

## The schema

A config is plain JSON. Add `"$schema"` pointing at
`character-panel.schema.json` to get autocomplete and validation in your editor.
The JSON Schema rejects unknown keys, so a typo like `subtitel` is an error
when writing a config, while `parseConfig` strips unknown keys when reading one
(`findUnknownKeys` lists them).

The schema's `$id` is
`https://cdn.jsdelivr.net/npm/@solution-nine/wol-character-panel@2/character-panel.schema.json`
(1.x published it as `@1/character-sheet.schema.json`).
`scripts/generate-schema.mjs` builds it from `name` and the major part of
`version` in `package.json`, so it names the contract, not a release:

- A compatible schema change (a new optional field, a looser limit) keeps
  `@2`.
- A breaking change (a new required field, a tighter limit, a removed key)
  bumps the major version in `package.json`, which changes the `$id` to `@3`.

## Jobs, slots and tooltips

```json
{
  "title": "Character profile",
  "defaultJobId": "healthcare",
  "slots": [
    { "id": "core", "label": "Core stack", "position": "header-start", "icon": "◆" },
    { "id": "skills", "label": "Skills", "position": "left", "icon": "Sk" }
  ],
  "jobs": [
    {
      "id": "healthcare",
      "name": "Healthcare",
      "title": "Developer in healthcare",
      "icon": "Hc",
      "level": { "label": "Lv.", "value": "4" },
      "portrait": { "src": "https://…/me.jpg", "alt": "…", "framing": "face" },
      "badge": { "label": "Projects", "value": "3" },
      "slots": {
        "skills": {
          "tooltip": {
            "title": "Skills",
            "tags": ["Most relevant first"],
            "stat": { "label": "Years", "value": "4" },
            "items": [{ "label": "Front end", "value": "React, TypeScript" }, "Accessibility"]
          },
          "action": { "kind": "anchor", "target": "skills" }
        }
      },
      "sections": { "skills": "Markdown the host page renders under #skills" }
    }
  ]
}
```

- **Slots** are the layout, and their labels are free text. `position` is one
  of `left` or `right` (6 per column fills it), or `header-start` or
  `header-end` (one each).
- **Empty slots:** a slot that a job doesn't fill renders as a dimmed empty
  square.
- **Square icons:** a slot's square shows its `icon` glyph, or a job can set an
  image per slot with `iconSrc`.
- **Actions** have one of these kinds:
  - `anchor`: a same-page `#id`.
  - `link`: a site path.
  - `external`: an http(s) URL, opening in the same tab unless `newTab` is set.
  - `param`: the current page (keeping `?job=`) with one query parameter
    set, e.g. `{ "kind": "param", "name": "stack", "value": "React", "target": "projects" }`
    links to `/?stack=React#projects`. `target` is optional. The host page
    reads the parameter; the panel doesn't. `name` can't be `job`, `tab` or
    `page`, which the panel uses, and one matching the host's `jobParam`
    renders tooltip-only. Links go through
    `renderLink` with `intent: "param"`. To mark the slot whose value the
    page is applying (a filter that's on), pass `isParamActive(name, value)`:
    the panel can't read the page's parameters or know how the host matches
    them. That slot gets `aria-current="true"` and a highlight.
  - `none`: tooltip only.
- **Status:** a job's `status` is `published` (the default when it's left
  out), `draft` (not ready yet) or `hidden` (taken off the site). Pass the
  config through `publicConfig()` before rendering it for visitors: it leaves
  out drafts and hidden jobs, so they aren't in the job menu and a `?job=`
  link to one falls back to the default job. Editors use the whole config.
  The default job must be published, and a config needs at least one
  published job: `parseConfig` reports both, falling back to the first
  published job or, with none, rejecting the config.
- **Sections** are data for the host page. The panel doesn't render them.
- **Tooltips** hold `tags`, `title`, `subtitle` (which defaults to the slot's
  label), one `stat` line, and `items`. Plain strings render as a list; label
  and value pairs render as a two-column table. There's also a `note`.
- **Portrait:** it fills the frame between the columns. `framing` picks the
  crop: `face` keeps the top, `full` centers. With no portrait, a placeholder
  silhouette is shown.

## Tabs, blocks and the gear-set row

These optional fields describe the rest of a character window: a name in the
bar, a row above the job header, and a content pane of tabs. `EquipmentPanel`
draws the name and the row; `CharacterWindow` draws all three. A config
without these fields stays valid.

```json
{
  "characterName": "Alex Le",
  "gearSet": {
    "label": "Résumé", "value": "v14 · Nov 2026",
    "jobMenu": { "label": "Change job", "iconName": "note" },
    "links": [
      { "label": "Contact", "iconName": "person", "action": { "kind": "anchor", "target": "contact" } },
      { "label": "Download", "iconName": "save", "position": "end", "action": { "kind": "link", "href": "/resume.pdf" } }
    ]
  },
  "tabs": [
    { "id": "attributes", "label": "Attributes", "iconName": "crest", "blocks": [
      { "type": "gauges", "id": "vitals", "rows": [{ "label": "Years", "value": "6", "fill": 100, "tone": "primary" }] }
    ] },
    { "id": "skills", "label": "Skills", "pages": [
      { "id": "build", "label": "Build", "blocks": [
        { "type": "levels", "groups": [{ "label": "Front end", "rows": [
          { "label": "React", "level": "4", "fill": 90, "action": { "kind": "job", "id": "frontend" } }
        ] }] }
      ] }
    ] }
  ],
  "jobs": [
    { "id": "healthcare", "…": "…",
      "gearSet": { "label": "Résumé", "value": "Healthcare" },
      "blocks": { "vitals": { "type": "gauges", "rows": [{ "label": "Years", "value": "3", "fill": 50 }] } } }
  ]
}
```

- **`characterName`:** text at the right of the bar.
- **Tabs** have an `id` (used as `?tab=<id>`), a `label`, and either `blocks`
  (an ordered list) or `pages` (sub-tabs, each with an `id` used as
  `?page=<id>`, a `label` and its own `blocks`), not both. Up to 6 tabs, 4
  pages per tab and 8 blocks per tab or page.
- **Blocks** have a `type`, an optional heading (`label`, icon) and an
  optional `id`, unique across all tabs, which a job can replace them by:
  - `gauges`: 1 to 4 `rows` of `label`, `value` (up to 24 characters),
    `secondary`, `fill` and `tone` (`primary` or `secondary`).
  - `stats`: `groups` of `rows` of `label`, `value` (up to 24 characters)
    and `tone` (`default`, `muted` or `highlight`).
  - `fields`: `rows` of `label`, `value`, `overline`, `caption`, an icon, an
    `action`, and `detail`: a button that opens a window (`label` as its
    accessible name, an icon, a `title`, and `blocks`, whose `fields` rows
    can't have a `detail` of their own).
  - `levels`: `groups` of `rows` of `label`, `level` (up to 4 characters),
    `fill`, `tone` (`default` or `highlight`), an icon and an `action`.
  - `progress`: `groups` of `rows` of `label`, `fill`, `caption`, `value`
    (up to 24 characters), an icon and an `action`.
- **Groups** (in `stats`, `levels` and `progress`) have an optional `label`
  and icon, `column` (`start` or `end`: consecutive groups that set it form
  two columns, the `start` ones stacked on the left and the `end` ones on the
  right) and `collapsible` (`open` or `closed`, which needs a `label`). Up to
  8 groups per block and 12 rows per group or `fields` block.
- **`fill`** is a number from 0 to 100. Left out, a row has no bar (a gauge's
  defaults to 100).
- **Row tooltips:** rows of `gauges`, `stats`, `levels` and `progress` may
  have a `tooltip`, the same shape as a slot's.
- **Row actions** (`fields`, `levels` and `progress` rows, gear-set links)
  are the slot action kinds, plus `{ "kind": "job", "id": "<job id>" }`,
  which switches to that job. One naming a job the config doesn't have is
  drawn without a link.
- **Icons:** `icon` (up to 4 characters), `iconSrc` (an image) or
  `iconName`, one of the built-in drawings: `sword`, `shield`, `wand`,
  `cross`, `bow`, `star`, `heart`, `person`, `note`, `list`, `save`, `gear`,
  `hammer`, `leaf`, `crest`, `flag`. `iconSrc` wins over `icon`, which wins
  over `iconName`. Icons are decorative: the label names the thing. On an
  icon-only button (a gear-set link, a detail button) prefer `iconName` or
  `iconSrc`: a text `icon` shows text that the button's name doesn't contain
  (WCAG 2.5.3).
- **`gearSet`:** a caption (`label`, `value`), `jobMenu` (the job menu
  button's `label`, default "Change job", and icon, default a note), and up
  to 3 `links`, each with a `label` (its accessible name), an icon, an
  `action` and `position`: up to 2 at the `start` (the default), before the
  job menu, and 1 at the `end`. The row is drawn whenever it has something
  to hold: a `gearSet`, more than one job (for the job menu) or a host's
  `gearSetEnd`, which takes the end link's place.
- **`hidden: true`** on a tab, page, block or `gearSet` keeps it in the
  config but out of the panel. `publicConfig()` leaves hidden parts out (and
  a tab or page with nothing left to show), so they aren't sent to visitors.
- **Per job:** `job.gearSet` replaces the config's `gearSet`, and
  `job.blocks` maps a block id to a whole block of the same `type`, shown
  instead of the shared one for that job. A replacement has no `id` or
  `hidden` of its own.
- **`parseConfig`** checks each tab, page and block on its own: a bad one is
  dropped and reported, and so is a tab or page left with no blocks. Past the
  limit, tabs, pages and blocks keep their first entries and report the
  rest. A `tabs` list left empty is left out. A bad `job.blocks` entry (one
  that doesn't parse, names no block, or has another type) or a bad
  `gearSet`, the config's or a job's, is dropped without dropping the job or
  the config. It also reports duplicate tab,
  page and block ids (the later one dropped), a tab with both `blocks` and
  `pages` (its pages used), a job action naming no job, a `collapsible`
  group without a `label`, and gear-set links past the start or end limit
  (kept, not drawn).
- **URLs:** `resolveTab(config, searchParams.tab, searchParams.page)` returns
  the tab and page to show (`page` is null for a tab of blocks), falling
  back to the first visible ones, or null with no tab to show. `tabHref(config,
  tabId, currentHref, { page })` links to a tab or page: the first visible tab
  and a tab's first page get no parameter, switching tab keeps `?job=` and
  drops `?page=`, and `jobHref` keeps `?tab=` and `?page=` when given the
  current URL as its base path. `tabParam` and `pageParam` options rename the
  parameters.
