// Writes character-sheet.schema.json from src/schema.ts, so a plain JSON
// config gets autocomplete and validation in editors. Run after changing
// schema.ts (CI fails while the committed file is out of date):
//   npm run generate:schema
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { characterSheetConfigSchema, tooltipSchema } from "../src/schema.ts";

// The $id is keyed by the major version: a compatible schema change keeps
// it, a breaking one (a major bump in package.json) changes it.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const major = pkg.version.split(".")[0];
const id = `https://cdn.jsdelivr.net/npm/${pkg.name}@${major}/character-sheet.schema.json`;

// io "input": output mode would make defaulted fields (status,
// portrait.framing) required, though a config may leave them out.
// Input mode leaves objects open, so the override closes every plain
// z.object: writers (editors, the backend's admin save) reject unknown
// keys like a typo'd `subtitel`, while zod still strips them on read. An
// object meant to stay open uses z.looseObject (it has a catchall, so it's
// skipped here). Records have def type "record", not "object", so they
// keep their additionalProperties schema.
//
// The shared pieces go under $defs by name. Their ids are added to zod's
// global registry here, in this script's own process, rather than with
// .meta({ id }) in schema.ts, which would add them in every host that
// imports the package. The global registry, not one of the script's own,
// because it also holds the .describe() texts. The pieces are found by
// walking the config's schema: schema.ts doesn't export them, because each
// exported schema's type is written out in full in the published .d.ts.
const config = characterSheetConfigSchema.shape;
const job = config.jobs.element;
const gearSet = config.gearSet.unwrap();
const tab = config.tabs.unwrap().element;
const block = tab.shape.pages.unwrap().element.shape.blocks.element;
const jobBlock = job.shape.blocks.unwrap().valueType;
// A discriminated union's options by their `type`.
const byType = (union) => Object.fromEntries(union.options.map((option) => [option.shape.type.value, option]));
const bodies = byType(jobBlock);
const detail = bodies.fields.shape.rows.element.shape.detail.unwrap();
const detailFields = byType(detail.shape.blocks.element).fields;
const groupsOf = (body) => body.shape.groups;
const rowOf = (groups) => groups.element.shape.rows.element;
const SHARED_SCHEMAS = {
  tooltip: tooltipSchema,
  rowAction: gearSet.shape.links.unwrap().element.shape.action,
  iconName: tab.shape.iconName.unwrap(),
  gaugeRow: bodies.gauges.shape.rows.element,
  statRow: rowOf(groupsOf(bodies.stats)),
  fieldRow: detailFields.shape.rows.element,
  levelRow: rowOf(groupsOf(bodies.levels)),
  progressRow: rowOf(groupsOf(bodies.progress)),
  statsGroups: groupsOf(bodies.stats),
  levelsGroups: groupsOf(bodies.levels),
  progressGroups: groupsOf(bodies.progress),
  gaugesBlock: bodies.gauges,
  statsBlock: bodies.stats,
  fieldsBlock: bodies.fields,
  detailFieldsBlock: detailFields,
  levelsBlock: bodies.levels,
  progressBlock: bodies.progress,
  detail,
  block,
  jobBlock,
  gearSet,
};
for (const [name, piece] of Object.entries(SHARED_SCHEMAS)) {
  z.globalRegistry.add(piece, { ...z.globalRegistry.get(piece), id: name });
}
const schema = z.toJSONSchema(characterSheetConfigSchema, {
  io: "input",
  override: ({ zodSchema, jsonSchema }) => {
    const def = zodSchema._zod.def;
    if (def.type === "object" && !def.catchall) jsonSchema.additionalProperties = false;
  },
});
const out = new URL("../character-sheet.schema.json", import.meta.url);
// Spelling out $schema keeps the order title, $schema, $id; the spread
// fills in the rest without moving those keys.
const doc = { title: "Character sheet config", $schema: schema.$schema, $id: id, ...schema };
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${out.pathname}`);
