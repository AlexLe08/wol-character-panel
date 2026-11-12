import type { z } from "zod";
import type {
  blockSchema,
  characterSheetConfigSchema,
  detailSchema,
  gearSetSchema,
  ICON_NAMES,
  jobBlockSchema,
  jobSchema,
  portraitSchema,
  rowActionSchema,
  slotActionSchema,
  slotContentSchema,
  slotDefSchema,
  tabPageSchema,
  tabSchema,
  tooltipSchema,
} from "./schema.ts";

export type CharacterSheetConfig = z.output<typeof characterSheetConfigSchema>;
export type Job = z.output<typeof jobSchema>;
export type SlotDef = z.output<typeof slotDefSchema>;
export type SlotContent = z.output<typeof slotContentSchema>;
export type SlotAction = z.output<typeof slotActionSchema>;
export type Tooltip = z.output<typeof tooltipSchema>;
export type Portrait = z.output<typeof portraitSchema>;
export type Tab = z.output<typeof tabSchema>;
export type TabPage = z.output<typeof tabPageSchema>;
export type Block = z.output<typeof blockSchema>;
// A block as a job gives it in job.blocks: the same shapes, without id or hidden.
export type JobBlock = z.output<typeof jobBlockSchema>;
export type RowAction = z.output<typeof rowActionSchema>;
export type GearSet = z.output<typeof gearSetSchema>;
export type Detail = z.output<typeof detailSchema>;

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
