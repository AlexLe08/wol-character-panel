import type { z } from "zod";
import type {
  characterPanelConfigSchema,
  ICON_NAMES,
  portraitSchema,
  slotActionSchema,
  slotContentSchema,
  slotDefSchema,
  tooltipSchema,
} from "./schema.ts";

// The parts of the config are reached from the whole config's type rather
// than from their own schemas, which schema.ts doesn't export: each
// exported schema's inferred type is written out in full in the emitted
// .d.ts, so exporting the nested ones repeated them many times over.
export type CharacterPanelConfig = z.output<typeof characterPanelConfigSchema>;
export type Job = CharacterPanelConfig["jobs"][number];
export type SlotDef = z.output<typeof slotDefSchema>;
export type SlotContent = z.output<typeof slotContentSchema>;
export type SlotAction = z.output<typeof slotActionSchema>;
export type Tooltip = z.output<typeof tooltipSchema>;
export type Portrait = z.output<typeof portraitSchema>;
export type Tab = NonNullable<CharacterPanelConfig["tabs"]>[number];
export type TabPage = NonNullable<Tab["pages"]>[number];
export type Block = TabPage["blocks"][number];
// A block as a job gives it in job.blocks: the same shapes, without id or hidden.
export type JobBlock = NonNullable<Job["blocks"]>[string];
export type GearSet = NonNullable<CharacterPanelConfig["gearSet"]>;

export type Theme = "document" | "game";
export type SlotPosition = SlotDef["position"];
export type JobStatus = Job["status"];
export type TooltipItem = NonNullable<Tooltip["items"]>[number];
export type IconName = (typeof ICON_NAMES)[number];
export type BlockType = Block["type"];
export type GaugesBlock = Extract<Block, { type: "gauges" }>;
export type StatsBlock = Extract<Block, { type: "stats" }>;
export type FieldsBlock = Extract<Block, { type: "fields" }>;
export type LevelsBlock = Extract<Block, { type: "levels" }>;
export type ProgressBlock = Extract<Block, { type: "progress" }>;
export type GearSetLink = NonNullable<GearSet["links"]>[number];
export type RowAction = GearSetLink["action"];
export type Detail = NonNullable<FieldsBlock["rows"][number]["detail"]>;
