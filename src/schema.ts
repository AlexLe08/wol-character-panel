import { z } from "zod";

// The one contract every content source produces: plain JSON data, no
// functions or React nodes, so a JSON file, an admin API, or a CMS adapter
// can all feed the same component. Types are inferred from these schemas
// (see types.ts), so the two can't drift apart.
//
// Imports nothing but zod, so plain Node (scripts/generate-schema.mjs) can
// run it: Node only resolves relative imports with a .ts extension, which
// the host's tsconfig doesn't allow, so LIMITS lives here too. Public: LIMITS
// and ID_PATTERN (from "."), characterPanelConfigSchema (from "/schema", see
// schema-entry.ts). The parts are internal.
//
// Unknown keys: these zod objects strip them, so a reader keeps a config
// with an extra key instead of dropping the job (or the whole config). The
// exported JSON Schema (generate-schema.mjs) closes every object instead, so
// writers (editors, the backend's admin save) reject them. The difference is
// intentional; keep these plain z.object, not strict.

// The hyphen is escaped so the pattern also works in an HTML pattern
// attribute, which browsers compile with the v flag, where a bare "-" in a
// class is a syntax error and the attribute is silently ignored.
export const ID_PATTERN = /^[a-z0-9][a-z0-9\-]*$/;

// A param action's query parameter name: lowercase, starts with a letter,
// and not "job", "tab" or "page", which the panel owns (see jobParam,
// tabParam, pageParam). Exported for a form's pattern attribute, like
// ID_PATTERN; the hyphen is escaped for the same reason.
export const PARAM_NAME_PATTERN = /^(?!(?:job|tab|page)$)[a-z][a-z0-9_\-]*$/;

// The config's limits as plain values, so a form, a CMS adapter or any
// other consumer can read them without zod. The checks below are built
// from these, so they can't drift from what parsing enforces. Grouped like
// the config: LIMITS.job.name is a job's `name`.
export const LIMITS = {
  // Every id: slots, jobs, tabs, pages, blocks, section and anchor targets.
  id: 40,
  config: { title: 60, characterName: 40, slots: 20, jobs: 20, tabs: 6 },
  // A slot's icon is also the limit for every other icon glyph (tabs,
  // headings, rows, gear-set links); slotContent.iconSrc for every image.
  // column: slots drawn per side column (left, right); parseConfig reports more.
  slot: { label: 40, icon: 4, column: 6 },
  job: { name: 40, title: 80, icon: 4, levelLabel: 16, levelValue: 40, section: 10_000 },
  portrait: { src: 500, alt: 300 },
  // A label/value pair: a job's badge, a tooltip's stat or item.
  pair: { label: 40, value: 80 },
  // tags and items are counts; item is a plain line item's length.
  tooltip: { title: 80, tag: 24, tags: 3, subtitle: 60, item: 80, items: 5, note: 120 },
  slotContent: { iconSrc: 500 },
  // A link's path or an external URL; a param action's query name and value.
  action: { href: 300, paramName: 40, paramValue: 80 },
  // A tab's label and counts; a tab's pages share the label and blocks limits.
  tab: { label: 24, pages: 4, blocks: 8 },
  // label: a block's or a group's heading. rows: per group, and a fields
  // block's rows; a gauges block has its own, smaller count.
  block: { label: 40, groups: 8, rows: 12, gaugeRows: 4 },
  // Row text beyond the label/value pair: a levels row's level; a caption,
  // an overline or a gauge's secondary line; and figure, the right-aligned
  // value of a gauges, stats or progress row (a fields row's value is a
  // pair's).
  row: { level: 4, caption: 60, figure: 24 },
  // links: in all; at most startLinks before the job menu, endLinks at the end.
  gearSet: { links: 3, startLinks: 2, endLinks: 1 },
  detail: { title: 60 },
} as const;

const id = z
  .string()
  .max(LIMITS.id)
  .regex(ID_PATTERN, "lowercase letters, digits, and hyphens; starts with a letter or digit");

const text = (max: number) => z.string().trim().min(1).max(max);

// Draft and hidden render the same (not at all, see publicConfig); the
// difference is for the editor: not live yet, or taken down.
export const JOB_STATUSES = ["published", "draft", "hidden"] as const;

export const SLOT_POSITIONS =["header-start", "left", "right", "header-end"] as const;

export const slotDefSchema = z.object({
  id: id.describe("Stable id; jobs fill slots by this id."),
  label: text(LIMITS.slot.label).describe('The slot\'s name, e.g. "Skills". Shown in its tooltip, and under the square on narrow screens.'),
  position: z
    .enum(SLOT_POSITIONS)
    .describe(
      "left/right: the columns beside the portrait (up to 6 each). header-start/header-end: one slot each, either side of the job name.",
    ),
  icon: text(LIMITS.slot.icon)
    .optional()
    .describe("Up to 4 characters drawn in the square. Defaults to the label's first two letters."),
});

export const pairSchema = z.object({ label: text(LIMITS.pair.label), value: text(LIMITS.pair.value) });

export const tooltipSchema = z.object({
  title: text(LIMITS.tooltip.title),
  tags: z.array(text(LIMITS.tooltip.tag)).max(LIMITS.tooltip.tags).optional().describe("Short markers above the title."),
  subtitle: text(LIMITS.tooltip.subtitle).optional(),
  stat: pairSchema.optional().describe("One headline figure, on its own ruled line."),
  items: z
    .array(z.union([text(LIMITS.tooltip.item), pairSchema]))
    .max(LIMITS.tooltip.items)
    .optional()
    .describe("Listed in order, most relevant first. Label/value pairs render as a two-column table."),
  note: text(LIMITS.tooltip.note).optional(),
});

export const slotActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("anchor"),
    target: id.describe("Element id on the same page, without the #."),
  }),
  z.object({
    kind: z.literal("link"),
    href: z
      .string()
      .max(LIMITS.action.href)
      .regex(/^\/(?![/\\])/, "a path on this site, starting with a single /")
      .describe("A path on the same site."),
  }),
  z.object({
    kind: z.literal("external"),
    // The regex repeats the protocol rule because z.url's `protocol` option
    // doesn't carry over to the generated JSON Schema (it becomes only
    // "format": "uri"), and the backend validates against that schema.
    href: z
      .url({ protocol: /^https?$/ })
      .regex(/^https?:\/\//, "an http or https URL")
      .max(LIMITS.action.href),
    newTab: z.boolean().optional().describe("Open in a new tab. Off by default."),
  }),
  z.object({
    kind: z.literal("param"),
    name: z
      .string()
      .max(LIMITS.action.paramName)
      .regex(
        PARAM_NAME_PATTERN,
        'lowercase letters, digits, underscores, and hyphens; starts with a letter; not "job", "tab" or "page"',
      )
      .describe(
        'A query parameter to set on the current page (keeping ?job=), e.g. "stack". Not "job", "tab" or "page", which the panel uses.',
      ),
    value: text(LIMITS.action.paramValue).describe("The value to set it to."),
    target: id
      .optional()
      .describe("Element id on the same page to scroll to after, without the #."),
  }),
  z.object({ kind: z.literal("none") }),
]);

export const slotContentSchema = z.object({
  tooltip: tooltipSchema,
  action: slotActionSchema,
  iconSrc: z
    .string()
    .min(1)
    .max(LIMITS.slotContent.iconSrc)
    .optional()
    .describe("An image drawn in the square instead of the slot's glyph (decorative; the label names it)."),
});

export const portraitSchema = z.object({
  src: z.string().min(1).max(LIMITS.portrait.src).describe("Any image URL: Cloudinary, a CMS asset, or a local path."),
  alt: z.string().max(LIMITS.portrait.alt),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  framing: z
    .enum(["face", "full"])
    .default("face")
    .describe("Where the photo is cropped from when it fills the frame. face: kept near the top. full: centered."),
});

// The built-in drawings an `iconName` can name. Adding a name is a minor
// release; removing one is a major.
export const ICON_NAMES = [
  "sword",
  "shield",
  "wand",
  "cross",
  "bow",
  "star",
  "heart",
  "person",
  "note",
  "list",
  "save",
  "gear",
  "hammer",
  "leaf",
  "crest",
  "flag",
] as const;

const iconNameSchema = z.enum(ICON_NAMES);

// The three ways to give a tab, heading, row or link an icon, spread into
// each object that has one. Always decorative: the label names the thing.
const iconFields = {
  icon: text(LIMITS.slot.icon).optional().describe("Up to 4 characters drawn as the icon."),
  iconSrc: z
    .string()
    .min(1)
    .max(LIMITS.slotContent.iconSrc)
    .optional()
    .describe("An image drawn as the icon. Wins over icon and iconName."),
  iconName: iconNameSchema
    .optional()
    .describe("One of the package's built-in drawings. Used when neither iconSrc nor icon is set."),
};

const hidden = z.boolean().optional().describe("Kept in the config, never rendered; publicConfig() leaves it out.");

const fill = z
  .number()
  .min(0)
  .max(100)
  .optional()
  .describe("How full the row's bar is, 0 to 100. Left out, no bar is drawn.");

const rowLabel = text(LIMITS.pair.label);
const rowValue = text(LIMITS.pair.value);
const rowFigure = text(LIMITS.row.figure);
const caption = text(LIMITS.row.caption);

// A row's or gear-set link's action: a slot's kinds, or one that switches
// to a job of the panel, linking like the job menu does.
const rowActionSchema = z.discriminatedUnion("kind", [
  ...slotActionSchema.options,
  z.object({
    kind: z.literal("job"),
    id: id.describe("The job to switch to. One the config doesn't have renders the row without a link."),
  }),
]);

// The heading every block may have, drawn with a rule above the block.
const blockHeading = {
  label: text(LIMITS.block.label).optional().describe("A heading above the block."),
  ...iconFields,
};

// Groups of rows, for stats, levels and progress blocks.
const groupsOf = <Row extends z.ZodType>(row: Row) =>
  z
    .array(
      z.object({
        label: text(LIMITS.block.label).optional(),
        ...iconFields,
        column: z
          .enum(["start", "end"])
          .optional()
          .describe(
            "Consecutive groups that set it form two columns: start ones on the left, end ones on the right. Left out, the group spans the pane.",
          ),
        collapsible: z
          .enum(["open", "closed"])
          .optional()
          .describe("Draws the group as a disclosure, open or closed at first. Needs a label."),
        rows: z.array(row).min(1).max(LIMITS.block.rows),
      }),
    )
    .min(1)
    .max(LIMITS.block.groups);

const gaugeRow = z.object({
  label: rowLabel,
  value: rowFigure,
  secondary: caption.optional().describe("A small line under the bar."),
  fill: fill.describe("How full the bar is, 0 to 100. Defaults to 100."),
  tone: z.enum(["primary", "secondary"]).optional(),
  tooltip: tooltipSchema.optional(),
});

const gaugesBody = z.object({
  type: z.literal("gauges"),
  ...blockHeading,
  rows: z.array(gaugeRow).min(1).max(LIMITS.block.gaugeRows),
});

const statRow = z.object({
  label: rowLabel,
  value: rowFigure,
  tone: z.enum(["default", "muted", "highlight"]).optional(),
  tooltip: tooltipSchema.optional(),
});

const statsGroups = groupsOf(statRow);

const statsBody = z.object({
  type: z.literal("stats"),
  ...blockHeading,
  groups: statsGroups,
});

const fieldRow = z.object({
  label: rowLabel.describe("A small ruled heading above the value."),
  value: rowValue,
  overline: caption.optional().describe("A small line above the value."),
  caption: caption.optional().describe("A small line below the value."),
  ...iconFields,
  action: rowActionSchema.optional(),
});

const fieldsBodyOf = <Row extends z.ZodType>(row: Row) =>
  z.object({
    type: z.literal("fields"),
    ...blockHeading,
    rows: z.array(row).min(1).max(LIMITS.block.rows),
  });

const levelRow = z.object({
  label: rowLabel,
  level: text(LIMITS.row.level).describe('Short text drawn large, e.g. "90".'),
  fill,
  tone: z.enum(["default", "highlight"]).optional(),
  ...iconFields,
  action: rowActionSchema.optional(),
  tooltip: tooltipSchema.optional(),
});

const levelsGroups = groupsOf(levelRow);

const levelsBody = z.object({
  type: z.literal("levels"),
  ...blockHeading,
  groups: levelsGroups,
});

const progressRow = z.object({
  label: rowLabel,
  fill,
  caption: caption.optional().describe("Under the bar's left end."),
  value: rowFigure.optional().describe("Under the bar's right end."),
  ...iconFields,
  action: rowActionSchema.optional(),
  tooltip: tooltipSchema.optional(),
});

const progressGroups = groupsOf(progressRow);

const progressBody = z.object({
  type: z.literal("progress"),
  ...blockHeading,
  groups: progressGroups,
});

const detailFieldsBody = fieldsBodyOf(fieldRow);

// A detail window's blocks: any type, with no id (a job replaces the
// fields block that holds the window, not a block inside it), no hidden,
// and no detail on its fields rows, so windows don't nest.
const detailBlockSchema = z.discriminatedUnion("type", [
  gaugesBody,
  statsBody,
  detailFieldsBody,
  levelsBody,
  progressBody,
]);

const detailSchema = z.object({
  label: rowLabel.describe("The button's accessible name."),
  ...iconFields,
  title: text(LIMITS.detail.title).describe("The window's title."),
  blocks: z.array(detailBlockSchema).min(1).max(LIMITS.tab.blocks),
});

const fieldsBody = fieldsBodyOf(
  fieldRow.extend({
    detail: detailSchema.optional().describe("A button at the row's right end that opens a window of more blocks."),
  }),
);

// A block as a job gives it in job.blocks: no id (the record's key is the
// id) and no hidden (whether it shows is the shared block's call).
const jobBlockSchema = z.discriminatedUnion("type", [
  gaugesBody,
  statsBody,
  fieldsBody,
  levelsBody,
  progressBody,
]);

const blockMeta = {
  id: id.optional().describe("Unique across all tabs. Only a block with an id can be replaced by a job."),
  hidden,
};

const blockSchema = z.discriminatedUnion("type", [
  gaugesBody.extend(blockMeta),
  statsBody.extend(blockMeta),
  fieldsBody.extend(blockMeta),
  levelsBody.extend(blockMeta),
  progressBody.extend(blockMeta),
]);

const blocks = z.array(blockSchema).min(1).max(LIMITS.tab.blocks);

const tabPageSchema = z.object({
  id: id.describe("Used in the URL: ?page=<id>. Unique within its tab."),
  label: text(LIMITS.tab.label),
  ...iconFields,
  hidden,
  blocks,
});

const tabSchema = z.object({
  id: id.describe("Used in the URL: ?tab=<id>."),
  label: text(LIMITS.tab.label),
  ...iconFields,
  hidden,
  blocks: blocks.optional().describe("The tab's content. A tab has blocks or pages, not both."),
  pages: z
    .array(tabPageSchema)
    .min(1)
    .max(LIMITS.tab.pages)
    .optional()
    .describe("Sub-tabs, each with its own blocks. A tab has blocks or pages, not both."),
});

const gearSetSchema = z.object({
  label: rowLabel.optional().describe("The caption's small line."),
  value: rowValue.optional().describe("The caption's larger line."),
  jobMenu: z
    .object({
      label: rowLabel.optional().describe('The job menu button\'s accessible name. Defaults to "Change job".'),
      ...iconFields,
    })
    .optional(),
  links: z
    .array(
      z.object({
        id: id.optional(),
        label: rowLabel.describe("The button's accessible name."),
        ...iconFields,
        position: z
          .enum(["start", "end"])
          .optional()
          .describe("start (the default): before the job menu, up to 2. end: at the row's right end, 1."),
        action: rowActionSchema,
      }),
    )
    .max(LIMITS.gearSet.links)
    .optional(),
  hidden,
});

const jobSchema = z.object({
  id: id.describe("Used in the URL: ?job=<id>."),
  name: text(LIMITS.job.name).describe('Short name for the job menu, e.g. "Healthcare".'),
  title: text(LIMITS.job.title).describe('The panel heading, e.g. "Developer in healthcare".'),
  status: z
    .enum(JOB_STATUSES)
    .default("published")
    .describe(
      "published: on the site. draft (not ready yet) and hidden (taken off the site) leave the job out of the public panel but keep it editable. The default job must be published.",
    ),
  icon: text(LIMITS.job.icon).optional().describe("Glyph in the job emblem beside the title. Defaults to the name's first two letters."),
  level: z.object({
    label: text(LIMITS.job.levelLabel).describe('e.g. "Lv." or "Experience".'),
    value: text(LIMITS.job.levelValue),
  }),
  portrait: portraitSchema.optional(),
  badge: pairSchema.optional().describe("A figure in the portrait's top corner."),
  slots: z
    .record(id, slotContentSchema)
    .describe("Content per slot id. A slot without an entry renders empty."),
  sections: z
    .record(id, z.string().max(LIMITS.job.section))
    .optional()
    .describe("Markdown per page section id. The host page renders these; the panel doesn't."),
  blocks: z
    .record(id, jobBlockSchema)
    .optional()
    .describe("Block id to a whole block of the same type, shown instead of that shared block for this job."),
  gearSet: gearSetSchema.optional().describe("Replaces the config's gearSet for this job."),
});

export const characterPanelConfigSchema = z.object({
  $schema: z.string().optional(),
  title: text(LIMITS.config.title).optional().describe("Text in the panel's top bar."),
  characterName: text(LIMITS.config.characterName).optional().describe("Text at the right of the top bar."),
  defaultJobId: id,
  gearSet: gearSetSchema
    .optional()
    .describe("The row above the job header: a caption, icon links and the job menu."),
  tabs: z
    .array(tabSchema)
    .min(1)
    .max(LIMITS.config.tabs)
    .optional()
    .describe("The content pane's tabs. Without them, only the equipment pane is drawn."),
  slots: z.array(slotDefSchema).min(1).max(LIMITS.config.slots),
  jobs: z.array(jobSchema).min(1).max(LIMITS.config.jobs),
});

