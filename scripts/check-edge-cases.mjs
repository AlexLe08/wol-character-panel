// Checks that examples/edge-cases.json fills each of the window's limits
// in LIMITS (tabs, pages, blocks, groups, rows, gear-set links, and the
// lengths of their labels, values and captions): prints one line per
// limit with the largest value found, and exits 1 if any falls short.
//   node scripts/check-edge-cases.mjs
// The slot, job and tooltip limits aren't checked here.
import { readFileSync } from "node:fs";
import { LIMITS } from "../src/schema.ts";

const c = JSON.parse(readFileSync(new URL("../examples/edge-cases.json", import.meta.url), "utf8"));
const max = {};
const see = (key, n) => (max[key] = Math.max(max[key] ?? 0, n));
const blocksOf = (tab) => (tab.pages ? tab.pages.flatMap((p) => p.blocks) : tab.blocks);

see("config.characterName", c.characterName.length);
see("config.tabs", c.tabs.length);
see("gearSet.links", c.gearSet.links.length);
see("pair.label (gearSet)", c.gearSet.label.length);
see("pair.value (gearSet)", c.gearSet.value.length);
for (const tab of c.tabs) {
  see("tab.label", tab.label.length);
  if (tab.pages) see("tab.pages", tab.pages.length);
  for (const page of tab.pages ?? []) {
    see("tab.label", page.label.length);
    see("tab.blocks", page.blocks.length);
  }
  if (tab.blocks) see("tab.blocks", tab.blocks.length);
  const visit = (block) => {
    if (block.label) see("block.label", block.label.length);
    if (block.type === "gauges") see("block.gaugeRows", block.rows.length);
    if (block.groups) see("block.groups", block.groups.length);
    const rows = block.rows && block.type !== "gauges" ? [block.rows] : (block.groups ?? []).map((g) => g.rows);
    for (const g of block.groups ?? []) if (g.label) see("block.label", g.label.length);
    for (const list of rows) see("block.rows", list.length);
    for (const row of [...(block.type === "gauges" ? block.rows : []), ...rows.flat()]) {
      see("pair.label", row.label.length);
      if (row.value) see("pair.value", row.value.length);
      for (const k of ["caption", "overline", "secondary"]) if (row[k]) see("row.caption", row[k].length);
      if (row.level) see("row.level", row.level.length);
      if (row.detail) {
        see("detail.title", row.detail.title.length);
        see("tab.blocks (detail)", row.detail.blocks.length);
        row.detail.blocks.forEach(visit);
      }
    }
  };
  blocksOf(tab).forEach(visit);
}
const limits = {
  "config.characterName": LIMITS.config.characterName,
  "config.tabs": LIMITS.config.tabs,
  "gearSet.links": LIMITS.gearSet.links,
  "tab.label": LIMITS.tab.label,
  "tab.pages": LIMITS.tab.pages,
  "tab.blocks": LIMITS.tab.blocks,
  "tab.blocks (detail)": LIMITS.tab.blocks,
  "block.label": LIMITS.block.label,
  "block.groups": LIMITS.block.groups,
  "block.rows": LIMITS.block.rows,
  "block.gaugeRows": LIMITS.block.gaugeRows,
  "pair.label": LIMITS.pair.label,
  "pair.value": LIMITS.pair.value,
  "pair.label (gearSet)": LIMITS.pair.label,
  "pair.value (gearSet)": LIMITS.pair.value,
  "row.caption": LIMITS.row.caption,
  "row.level": LIMITS.row.level,
  "detail.title": LIMITS.detail.title,
};
let ok = true;
for (const [key, limit] of Object.entries(limits)) {
  const hit = max[key] === limit;
  ok &&= hit;
  console.log(hit ? "at limit" : "UNDER   ", key, max[key], "/", limit);
}
process.exit(ok ? 0 : 1);
