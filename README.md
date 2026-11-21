# Character panel (`@solution-nine/wol-character-panel`)

A panel modelled on an RPG character/equipment screen:

```
title bar ............................ character name
[a] [b] [job menu]  caption                     [end]
[slot]  level / emblem + job title               [slot]
[col]   portrait (optional corner badge)          [col]
```

The two header slots sit either side of the job title (think main weapon and
job stone), and the left and right columns hold up to 6 slots each. Above them, a
gear-set row holds icon links, the job menu and a caption. Each slot shows a
compact item-card tooltip on hover or keyboard focus. Clicking it goes to a page
section, another page, or an external site. Changing the job (`?job=<id>`) swaps the slots, tooltips, and
portrait, and the host page can swap its own content too.

`CharacterWindow` draws the whole character window around that panel: a tab
strip, and a content pane of the active tab's blocks (gauges, stats, fields)
beside the equipment pane.

Its only dependencies are React 19 and zod 4, which the host provides. It
ships as ES modules with type declarations (no CommonJS build), so it needs a
bundler or Node 22.12+. It runs the home page of
[the-portfolio-site](https://github.com/AlexLe08/the-portfolio-site), where it
started.

```sh
npm install @solution-nine/wol-character-panel react zod
```

Betas of the next major are on npm's `next` tag:
`npm install @solution-nine/wol-character-panel@next`.

Try it at <https://alexle08.github.io/wol-character-panel/>: the playground
(below) on the example configs, as of the latest release. The newest beta
is at <https://alexle08.github.io/wol-character-panel/next/> (the latest
release again when no beta is newer).

## Entries

| Import | What it holds |
| --- | --- |
| `@solution-nine/wol-character-panel` | `parseConfig`, `loadConfig`, `findUnknownKeys`, `publicConfig`, `resolveJob`, `jobHref`, `resolveTab`, `tabHref`, `actionHref`, `withQuery` (sets or removes query parameters on an href, keeping the rest; `jobHref`, `tabHref` and `actionHref` are built on it), the config types, and the limits as plain values: `LIMITS` (max lengths and counts, grouped like the config), `ID_PATTERN` and `PARAM_NAME_PATTERN`. No React or CSS, so server code and plain Node can use it |
| `@solution-nine/wol-character-panel/react` | `EquipmentPanel`, `EquipmentPanelProps`, `EquipmentPanelParts`, `CharacterWindow`, `CharacterWindowProps`, `CharacterWindowParts`, `LinkRendererProps`. The components import their own CSS |
| `@solution-nine/wol-character-panel/schema` | `characterPanelConfigSchema`, the whole config's zod schema. Its parts are internal |
| `@solution-nine/wol-character-panel/character-panel.css` | The styles, for hosts that want to control CSS order |
| `@solution-nine/wol-character-panel/character-panel.schema.json` | The JSON Schema other backends validate against |

`react` and `zod` are peer dependencies: the host provides them.

## Config

A config is plain JSON. This one is the smallest that renders: one slot
and one job.

```json
{
  "defaultJobId": "developer",
  "slots": [{ "id": "skills", "label": "Skills", "position": "left", "icon": "Sk" }],
  "jobs": [
    {
      "id": "developer",
      "name": "Developer",
      "title": "Developer",
      "level": { "label": "Lv.", "value": "1" },
      "slots": {
        "skills": {
          "tooltip": { "title": "Skills", "items": [{ "label": "Front end", "value": "React, TypeScript" }] },
          "action": { "kind": "anchor", "target": "skills" }
        }
      }
    }
  ]
}
```

- **Slots** are the layout: `left` and `right` columns of up to 6, and one
  `header-start` and one `header-end` beside the job title.
- **Jobs** fill the slots with a tooltip and an action (a same-page
  anchor, a site path, an external URL, a query parameter, or none), and
  set the title, level, portrait and badge. `?job=<id>` picks one.
- **Optional:** `characterName`, a `gearSet` row (icon links, the job menu
  and a caption) and `tabs` of blocks for `CharacterWindow`.

Add `"$schema"` pointing at `character-panel.schema.json` for autocomplete
and validation in your editor. The JSON Schema rejects unknown keys, while
`parseConfig` strips them (`findUnknownKeys` lists them). Jobs can be
`draft` or `hidden`: pass the config through `publicConfig()` before
rendering it for visitors.

The [config reference](https://github.com/AlexLe08/wol-character-panel/blob/main/docs/config.md)
lists every field, its limits and what `parseConfig` does with a bad one.
The repository's
[`examples/`](https://github.com/AlexLe08/wol-character-panel/tree/main/examples)
are complete configs: `adventurer` (a game character screen), `portfolio`
(a résumé), `minimal` and `edge-cases` (every field at its limit).

## Usage

```tsx
import { parseConfig, resolveJob } from "@solution-nine/wol-character-panel";
import { EquipmentPanel } from "@solution-nine/wol-character-panel/react";

const { config, errors } = parseConfig(json);   // or: const { config } = await loadConfig(sources, fallback)
const job = resolveJob(config, searchParams.job);

<EquipmentPanel
  config={config}
  job={job}
  theme="document"          // or "game"
  labels="narrow"           // slot names under squares: "narrow" (default) or "always"
  parts={{ toolbar: true }} // optional: which parts are drawn (below)
  gearSetEnd={<SaveButton />} // optional: your own control at the gear-set row's right end
  basePath="/"              // where the job links point
  renderLink={(p) => …}     // optional: your router's link (default <a>); p.intent says what it does:
                            // "job" (switch job), "tab" (switch tab or page, the window only),
                            // "param" (set a query parameter), "page" (another page of the site)
  renderPortrait={(p) => …} // optional: your image component (default <img>)
  isParamActive={(name, value) => …} // optional: true for the param value the page applies
/>
```

The window takes every `EquipmentPanel` prop, plus the tab and page from the
URL:

```tsx
import { CharacterWindow } from "@solution-nine/wol-character-panel/react";

<CharacterWindow
  config={config}
  job={job}
  tab={searchParams.tab}    // the raw ?tab= value; unknown or missing: the first visible tab
  page={searchParams.page}  // the raw ?page= value, for a tab with pages
  tabParam="tab"            // optional: the parameters' names, as jobParam
  pageParam="page"
  hiddenTabs={["notes"]}    // optional: tab ids to leave out here
  parts={{ equipment: false }} // optional: also tabs and equipment (below)
  // …and theme, labels, basePath, jobParam, gearSetEnd, label,
  // renderLink, renderPortrait, isParamActive, as above
/>
```

Both are Server Components, with two small client files inside for
Escape and focus handling; they render in a plain client-side React app
too.

`loadConfig(sources, fallback)` tries each `{ name, load }` source in order,
such as an admin API, a CMS adapter, or a remote JSON file. It uses the first
one that yields a usable config. A source whose `load` resolves to `undefined`
has nothing yet (no save, an empty CMS entry) and is skipped without an issue;
a `load` that throws (unreachable, an HTTP error) is an issue. It never throws.
It resolves to `{ config, source, issues }`: `source` is the name of the source
used, or `null` when no source had a usable config and `config` is
`fallback`. `source === null` with issues means the page shows the fallback
because something failed, which a host can tell visitors about.

`parts` says which parts are drawn, `true` to draw one: `bar`,
`characterName`, `gearSet` and `jobMenu` default to `true`; `toolbar` (round
buttons under the portrait) and `sockets` (two dots on each filled slot)
default to `false`. `gearSet: false` removes the whole row, with the job menu
and `gearSetEnd`; `jobMenu: false` removes only that button. In
`CharacterWindow`, `tabs` (the strip and the content pane) and `equipment`
(the equipment pane) default to `true` as well. The toolbar and
sockets are visual only for now. They're hidden from assistive tech and
aren't focusable. When either one gets a real function, make it a real
control (`<button>`, with a label) instead.

A `gearSetEnd` control takes the row's square button look from the
`cs__gear-button` class; name it with visually hidden text (`cs-visually-hidden`)
or an `aria-label`.

## Behaviour

Tooltips show on hover and keyboard focus through CSS, and the job menu
and detail windows are popovers of links and buttons, so the panel works
before hydration and without JavaScript (with it, Escape also dismisses a
tooltip, and the job menu closes when focus leaves it). Tabs,
jobs and pages are links (`?tab=`, `?job=`, `?page=`), so every view has a
URL and the back button works. The layout is a container query: it
follows the panel's width, not the viewport's, and below 26rem the
portrait moves on top and slot names show. [Behaviour](https://github.com/AlexLe08/wol-character-panel/blob/main/docs/behaviour.md)
covers each part in full.

## Theming

Override any `--cs-*` variable on `.cs`, or add a theme block like
`.cs[data-cs-theme="game"]`. The `document` theme reads the host's
`--paper`/`--ink`/`--signal`/… tokens when they exist and falls back to neutral
colours otherwise.

The portrait's badge sits on a plate, `--cs-badge-bg` (the panel's colour by
default), so its text keeps its contrast over any portrait; keep it opaque.

The window adds `--cs-tab-bg` and `--cs-tab-active-bg` (tabs),
`--cs-bar-track` and `--cs-bar-fill` (bars), `--cs-gauge-primary` and
`--cs-gauge-secondary` (a gauge's two tones), `--cs-stat-highlight` (a
`highlight` stat) and `--cs-level-highlight` (a `highlight` level). In the
`document` theme they come from the existing colours; the `game` theme gives
them gradients and its own tones.

## Versioning

Semver, keyed to the config contract: a new optional field or a looser
limit is a minor or patch release; a new required field, a tighter limit
or a removed key or export is a major one, and moves the schema's `$id`
to the new major. [CHANGELOG.md](https://github.com/AlexLe08/wol-character-panel/blob/main/CHANGELOG.md)
lists what each release changed for hosts.

## More

- [Config reference](https://github.com/AlexLe08/wol-character-panel/blob/main/docs/config.md):
  every field, its limits and how bad ones are reported.
- [Behaviour](https://github.com/AlexLe08/wol-character-panel/blob/main/docs/behaviour.md):
  tooltips, menus, tabs, rows, detail windows and the layouts.
- [Development](https://github.com/AlexLe08/wol-character-panel/blob/main/docs/development.md):
  the checks, tests, playground and the repository's files.
- [Releasing](https://github.com/AlexLe08/wol-character-panel/blob/main/docs/releasing.md):
  how a version is published.
- [Contributing](https://github.com/AlexLe08/wol-character-panel/blob/main/CONTRIBUTING.md)
  and [security](https://github.com/AlexLe08/wol-character-panel/blob/main/SECURITY.md).

MIT licensed.
