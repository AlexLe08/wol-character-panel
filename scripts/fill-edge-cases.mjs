// Rewrites the window's fields in examples/edge-cases.json (characterName,
// gearSet, tabs, and the second job's gearSet and block replacements) so
// each is at its limit from LIMITS. Run after changing those limits, then
// check the result:
//   node scripts/fill-edge-cases.mjs && node scripts/check-edge-cases.mjs
// Keeps title, defaultJobId, slots and jobs as they are, and copies the
// first job's header-start-1 tooltip into rows, so the slot and tooltip
// limits are still filled by hand. Assumes the second job is the bare one
// that job actions name ("bare").
import { readFileSync, writeFileSync } from "node:fs";
import { LIMITS } from "../src/schema.ts";

const file = new URL("../examples/edge-cases.json", import.meta.url);
const current = JSON.parse(readFileSync(file, "utf8"));

const FILLER = " Long text that fills the field to its limit so overflow and wrapping show up";
// Exactly n characters, ending in "." so trimming can't shorten it.
const fill = (prefix, n) => {
  let s = prefix;
  while (s.length < n) s += FILLER;
  return `${s.slice(0, n - 1)}.`;
};
const glyph = "W".repeat(LIMITS.slot.icon);
const label = (prefix) => fill(prefix, LIMITS.pair.label);
const value = (prefix = "Value") => fill(prefix, LIMITS.pair.value);
const caption = (prefix) => fill(prefix, LIMITS.row.caption);

const tooltip = current.jobs[0].slots["header-start-1"].tooltip;
const icons = (i) => [{ icon: glyph }, { iconSrc: "/icon.svg" }, { iconName: "sword" }, {}][i % 4];
const actions = [
  { kind: "anchor", target: "limits" },
  { kind: "link", href: "/elsewhere" },
  { kind: "external", href: "https://example.com/", newTab: true },
  { kind: "param", name: "stack", value: "edge", target: "limits" },
  { kind: "job", id: "bare" },
  { kind: "none" },
];
const range = (n) => Array.from({ length: n }, (_, i) => i);

const gauges = (id, n = LIMITS.block.gaugeRows, withTooltip = n > 1) => ({
  type: "gauges",
  ...(id && { id }),
  label: label("Gauges"),
  icon: glyph,
  rows: range(n).map((i) => ({
    label: label(`Gauge ${i + 1}`),
    value: value(),
    secondary: caption("Secondary"),
    ...([{ fill: 0 }, { fill: 100 }, { fill: 33.3 }, {}][i % 4]),
    ...(i % 2 ? { tone: "secondary" } : { tone: "primary" }),
    ...(withTooltip && i === 0 && { tooltip }),
  })),
});

const statRows = (n) =>
  range(n).map((i) => ({
    label: label(`Stat ${i + 1}`),
    value: value(),
    tone: ["default", "muted", "highlight"][i % 3],
    ...(i === 0 && { tooltip }),
  }));

const stats = (id) => ({
  type: "stats",
  ...(id && { id }),
  label: label("Stats"),
  iconName: "shield",
  groups: range(LIMITS.block.groups).map((i) => ({
    label: label(`Group ${i + 1}`),
    ...icons(i),
    ...(i > 0 && { column: i % 2 ? "start" : "end" }),
    rows: statRows(i === 0 ? LIMITS.block.rows : 1),
  })),
});

const smallStats = { type: "stats", groups: [{ rows: [{ label: "Small", value: "1" }] }] };

const fieldRows = (withDetail) =>
  range(LIMITS.block.rows).map((i) => ({
    label: label(`Field ${i + 1}`),
    value: value(),
    overline: caption("Overline"),
    caption: caption("Caption"),
    ...icons(i),
    ...(i < actions.length && { action: actions[i] }),
    ...(withDetail && i === 0 && { detail }),
  }));

const levels = (id) => ({
  type: "levels",
  ...(id && { id }),
  label: label("Levels"),
  groups: [
    {
      label: label("Collapsible levels"),
      iconName: "star",
      collapsible: "closed",
      rows: range(LIMITS.block.rows).map((i) => ({
        label: label(`Level ${i + 1}`),
        level: "W".repeat(LIMITS.row.level),
        ...(i % 3 !== 2 && { fill: (i * 9) % 101 }),
        tone: i % 2 ? "default" : "highlight",
        ...icons(i),
        ...(i < actions.length && { action: actions[i] }),
        ...(i === 0 && { tooltip }),
      })),
    },
  ],
});

const progress = (id) => ({
  type: "progress",
  ...(id && { id }),
  label: label("Progress"),
  iconSrc: "/icon.svg",
  groups: [
    {
      label: label("Open progress"),
      collapsible: "open",
      rows: range(LIMITS.block.rows).map((i) => ({
        label: label(`Progress ${i + 1}`),
        ...(i % 3 !== 2 && { fill: (i * 9) % 101 }),
        caption: caption("Caption"),
        value: value(),
        ...icons(i),
        ...(i < actions.length && { action: actions[i] }),
        ...(i === 0 && { tooltip }),
      })),
    },
  ],
});

// A detail window with as many blocks as a tab may have, one of each type
// and then small ones.
const detail = {
  label: label("Detail"),
  icon: glyph,
  title: fill("Detail window title", LIMITS.detail.title),
  blocks: [
    gauges(undefined, 1),
    { type: "fields", rows: [{ label: "Field", value: "1", action: actions[4] }] },
    { type: "levels", groups: [{ rows: [{ label: "Level", level: "1", fill: 50 }] }] },
    { type: "progress", groups: [{ rows: [{ label: "Progress", fill: 50, caption: "Caption", value: "1" }] }] },
    ...range(LIMITS.tab.blocks - 4).map(() => smallStats),
  ],
};

const tabLabel = (prefix) => fill(prefix, LIMITS.tab.label);

const limitsTab = {
  id: "limits",
  label: tabLabel("Limits"),
  icon: glyph,
  blocks: [
    gauges("gauges"),
    stats("stats"),
    { type: "fields", id: "fields", label: label("Fields"), rows: fieldRows(true) },
    levels("levels"),
    progress("progress"),
    ...range(LIMITS.tab.blocks - 5).map((i) => ({ ...smallStats, id: `small-${i + 1}` })),
  ],
};

const pagesTab = {
  id: "pages",
  label: tabLabel("Pages"),
  iconName: "list",
  pages: range(LIMITS.tab.pages).map((i) => ({
    id: `page-${i + 1}`,
    label: tabLabel(`Page ${i + 1}`),
    ...icons(i),
    blocks: [{ ...smallStats, ...(i === 1 && { hidden: true }) }, gauges(undefined, 1)],
  })),
};

const tabs = [
  limitsTab,
  pagesTab,
  ...range(LIMITS.config.tabs - 3).map((i) => ({
    id: `tab-${i + 3}`,
    label: tabLabel(`Tab ${i + 3}`),
    ...icons(i + 1),
    blocks: [smallStats],
  })),
  { id: "hidden-tab", label: "Hidden tab", hidden: true, blocks: [smallStats] },
];

const gearSetLinks = [
  ...range(LIMITS.gearSet.startLinks).map((i) => ({
    id: `start-${i + 1}`,
    label: label(`Start link ${i + 1}`),
    ...icons(i),
    action: actions[i % 2 ? 4 : 0],
  })),
  ...range(LIMITS.gearSet.endLinks).map((i) => ({
    id: i ? `end-${i + 1}` : "end",
    label: label(i ? `End link ${i + 1}` : "End link"),
    iconName: "save",
    position: "end",
    action: actions[2],
  })),
];

const { $schema, title, defaultJobId, slots, jobs } = current;
const [limitsJob, bareJob, ...otherJobs] = jobs;
const out = {
  $schema,
  title,
  characterName: fill("Character name", LIMITS.config.characterName),
  defaultJobId,
  gearSet: {
    label: label("Gear set"),
    value: value("Gear set value"),
    jobMenu: { label: label("Job menu"), icon: glyph },
    links: gearSetLinks,
  },
  tabs,
  slots,
  jobs: [
    limitsJob,
    {
      ...bareJob,
      gearSet: { value: "A job's own gear set", links: [] },
      blocks: {
        gauges: gauges(undefined, 1),
        progress: { type: "progress", groups: [{ rows: [{ label: "Replaced for this job", fill: 100 }] }] },
      },
    },
    ...otherJobs,
  ],
};
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log("wrote examples/edge-cases.json");
