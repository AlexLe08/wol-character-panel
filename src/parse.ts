import { z } from "zod";
import { characterSheetConfigSchema, LIMITS } from "./schema.ts";
import type { Block, BlockType, CharacterSheetConfig, GearSet, Job, JobBlock, Tab, TabPage } from "./types.ts";

export type ParseResult = {
  // null only when nothing usable is left: the top-level shape is wrong or
  // no job is valid. Otherwise invalid jobs are dropped and listed in errors.
  config: CharacterSheetConfig | null;
  errors: string[];
};

// The parts checked one at a time, reached through the whole config's
// schema: schema.ts doesn't export them, since each exported schema's type
// is written out in full in the emitted .d.ts (see types.ts).
const configShape = characterSheetConfigSchema.shape;
const jobSchema = configShape.jobs.element;
const jobBlockSchema = jobSchema.shape.blocks.unwrap().valueType;
const gearSetSchema = configShape.gearSet.unwrap();
const tabSchema = configShape.tabs.unwrap().element;
const tabPageSchema = tabSchema.shape.pages.unwrap().element;
const blockSchema = tabPageSchema.shape.blocks.element;

// Everything but the jobs, the tabs and the gear-set row is checked as a
// whole: without valid slots there is no panel to draw. Jobs are checked
// one at a time, so one bad entry (say, a typo in a CMS) costs that job and
// not the whole panel; tabs too, and inside a tab or page each block, and
// the gear-set row on its own. The loosened schemas below are only for
// that: the exported schema and the JSON Schema stay exact.
const shellSchema = characterSheetConfigSchema.extend({
  jobs: z.array(z.unknown()).min(1),
  gearSet: z.unknown().optional(),
  tabs: z.array(z.unknown()).optional(),
});
// A job with its blocks and gear-set row checked on their own, so a bad
// replacement or row costs that part and not the job.
const looseJobSchema = jobSchema.extend({
  blocks: z.record(z.string(), z.unknown()).optional(),
  gearSet: z.unknown().optional(),
});
// Counts are checked by withinLimit, so an over-limit list keeps its first
// entries instead of costing the tab or the config.
const looseTabSchema = tabSchema.extend({
  blocks: z.array(z.unknown()).optional(),
  pages: z.array(z.unknown()).optional(),
});
const loosePageSchema = tabPageSchema.extend({ blocks: z.array(z.unknown()) });

// What the checks after the jobs need: the errors so far, the jobs a job
// action may name, and the block ids seen so far with their types.
type Context = { errors: string[]; jobIds: Set<string>; blockTypes: Map<string, BlockType> };

function describe(error: z.ZodError, prefix: string): string[] {
  return error.issues.map((issue) => {
    const path = [prefix, ...issue.path.map(String)].filter(Boolean).join(".");
    return `${path || "(root)"}: ${issue.message}`;
  });
}

export function parseConfig(input: unknown): ParseResult {
  const shell = shellSchema.safeParse(input);
  if (!shell.success) return { config: null, errors: describe(shell.error, "") };

  const errors: string[] = [];
  const slotIds = new Set<string>();
  for (const slot of shell.data.slots) {
    if (slotIds.has(slot.id)) errors.push(`slots: duplicate id "${slot.id}"`);
    slotIds.add(slot.id);
  }
  for (const position of ["header-start", "header-end"] as const) {
    const extra = shell.data.slots.filter((slot) => slot.position === position).slice(1);
    for (const slot of extra) errors.push(`slots: "${slot.id}" is a second ${position} slot, not shown`);
  }

  // Each job with its index in the input, for the paths of later reports;
  // its blocks are checked once the tabs are.
  const looseJobs: { job: z.output<typeof looseJobSchema>; index: number }[] = [];
  // Ids of jobs dropped for their own problems, checked by defaultJobId below.
  const droppedIds = new Set<unknown>();
  shell.data.jobs.forEach((raw, index) => {
    const result = looseJobSchema.safeParse(raw);
    if (!result.success) {
      errors.push(...describe(result.error, `jobs.${index}`));
      if (isPlainObject(raw)) droppedIds.add(raw.id);
      return;
    }
    const job = result.data;
    if (looseJobs.some((other) => other.job.id === job.id)) {
      errors.push(`jobs.${index}: duplicate id "${job.id}", dropped`);
      return;
    }
    for (const slotId of Object.keys(job.slots)) {
      if (!slotIds.has(slotId)) errors.push(`jobs.${index}.slots: unknown slot "${slotId}", ignored`);
    }
    looseJobs.push({ job, index });
  });
  const jobs = looseJobs.map(({ job }) => job);

  if (jobs.length === 0) return { config: null, errors: [...errors, "jobs: no valid job"] };
  // Drafts and hidden jobs stay in the config, so an editor can work on
  // them, but publicConfig() leaves them out: with none published, the
  // public panel would have nothing to show.
  const published = jobs.filter((job) => job.status === "published");
  if (published.length === 0) return { config: null, errors: [...errors, "jobs: no published job"] };

  let { defaultJobId } = shell.data;
  const defaultJob = jobs.find((job) => job.id === defaultJobId);
  if (!defaultJob) {
    // A default job dropped above already has its own errors listed; a
    // second line for the same problem is only noise. The fallback stands.
    if (!droppedIds.has(defaultJobId)) {
      errors.push(`defaultJobId: no valid job "${defaultJobId}", using "${published[0].id}"`);
    }
    defaultJobId = published[0].id;
  } else if (defaultJob.status !== "published") {
    errors.push(`defaultJobId: "${defaultJobId}" is ${defaultJob.status}, not published, using "${published[0].id}"`);
    defaultJobId = published[0].id;
  }

  const context: Context = { errors, jobIds: new Set(jobs.map((job) => job.id)), blockTypes: new Map() };
  const { gearSet: rawGearSet, tabs: rawTabs, ...shared } = shell.data;
  // An empty list is left out rather than kept: the exact schema needs at
  // least one tab, so an editor could not save the parsed config back.
  let tabs: Tab[] = [];
  if (rawTabs?.length === 0) errors.push("tabs: empty, left out");
  else if (rawTabs) {
    tabs = parseTabs(rawTabs, context);
    if (tabs.length === 0) errors.push("tabs: no valid tab");
  }
  const finalJobs = looseJobs.map(({ job, index }) => finishJob(job, `jobs.${index}`, context));
  const gearSet = rawGearSet === undefined ? undefined : parseGearSet(rawGearSet, "gearSet", context);

  return {
    config: {
      ...shared,
      defaultJobId,
      ...(gearSet && { gearSet }),
      ...(tabs.length > 0 && { tabs }),
      jobs: finalJobs,
    },
    errors,
  };
}

// The first `limit` entries; each one past it is reported and dropped, so
// an over-long list costs its extras and not the list's owner.
function withinLimit(raws: unknown[], limit: number, path: string, context: Context): unknown[] {
  for (let index = limit; index < raws.length; index += 1) {
    context.errors.push(`${path}.${index}: over the limit of ${limit}, dropped`);
  }
  return raws.slice(0, limit);
}

function parseTabs(raws: unknown[], context: Context): Tab[] {
  const tabs: Tab[] = [];
  withinLimit(raws, LIMITS.config.tabs, "tabs", context).forEach((raw, index) => {
    const path = `tabs.${index}`;
    const result = looseTabSchema.safeParse(raw);
    if (!result.success) {
      context.errors.push(...describe(result.error, path));
      return;
    }
    const { blocks: rawBlocks, pages: rawPages, ...tab } = result.data;
    if (tabs.some((other) => other.id === tab.id)) {
      context.errors.push(`${path}: duplicate id "${tab.id}", dropped`);
      return;
    }
    if (rawPages) {
      if (rawBlocks) context.errors.push(`${path}: has both blocks and pages, blocks ignored`);
      const pages = parsePages(rawPages, `${path}.pages`, context);
      if (pages.length === 0) context.errors.push(`${path}: no pages, dropped`);
      else tabs.push({ ...tab, pages });
    } else {
      const blocks = rawBlocks ? parseBlocks(rawBlocks, `${path}.blocks`, context) : [];
      if (blocks.length === 0) context.errors.push(`${path}: no blocks, dropped`);
      else tabs.push({ ...tab, blocks });
    }
  });
  return tabs;
}

function parsePages(raws: unknown[], path: string, context: Context): TabPage[] {
  const pages: TabPage[] = [];
  withinLimit(raws, LIMITS.tab.pages, path, context).forEach((raw, index) => {
    const pagePath = `${path}.${index}`;
    const result = loosePageSchema.safeParse(raw);
    if (!result.success) {
      context.errors.push(...describe(result.error, pagePath));
      return;
    }
    const page = result.data;
    if (pages.some((other) => other.id === page.id)) {
      context.errors.push(`${pagePath}: duplicate id "${page.id}", dropped`);
      return;
    }
    const blocks = parseBlocks(page.blocks, `${pagePath}.blocks`, context);
    if (blocks.length === 0) context.errors.push(`${pagePath}: no blocks, dropped`);
    else pages.push({ ...page, blocks });
  });
  return pages;
}

// Block ids are unique across all tabs and pages, so a job's replacement
// names one block.
function parseBlocks(raws: unknown[], path: string, context: Context): Block[] {
  const blocks: Block[] = [];
  withinLimit(raws, LIMITS.tab.blocks, path, context).forEach((raw, index) => {
    const blockPath = `${path}.${index}`;
    const result = blockSchema.safeParse(raw);
    if (!result.success) {
      context.errors.push(...describe(result.error, blockPath));
      return;
    }
    const block = result.data;
    if (block.id !== undefined) {
      if (context.blockTypes.has(block.id)) {
        context.errors.push(`${blockPath}: duplicate block id "${block.id}", dropped`);
        return;
      }
      context.blockTypes.set(block.id, block.type);
    }
    checkContent(block, blockPath, context);
    blocks.push(block);
  });
  return blocks;
}

// A job's blocks, each checked on its own: one that doesn't parse, names
// no shared block, or has another type than the block it names is dropped
// and the job kept. Its gear-set row too: a bad one is dropped, the job kept.
function finishJob(loose: z.output<typeof looseJobSchema>, path: string, context: Context): Job {
  const { blocks: rawBlocks, gearSet: rawGearSet, ...rest } = loose;
  const gearSet = rawGearSet === undefined ? undefined : parseGearSet(rawGearSet, `${path}.gearSet`, context);
  const job: Job = { ...rest, ...(gearSet && { gearSet }) };
  if (rawBlocks === undefined) return job;
  const blocks: Record<string, JobBlock> = {};
  for (const [id, raw] of Object.entries(rawBlocks)) {
    const blockPath = `${path}.blocks.${id}`;
    const sharedType = context.blockTypes.get(id);
    if (sharedType === undefined) {
      context.errors.push(`${blockPath}: unknown block "${id}", ignored`);
      continue;
    }
    const result = jobBlockSchema.safeParse(raw);
    if (!result.success) {
      context.errors.push(...describe(result.error, blockPath));
      continue;
    }
    if (result.data.type !== sharedType) {
      context.errors.push(`${blockPath}: a ${result.data.type} block can't replace a ${sharedType} block, ignored`);
      continue;
    }
    checkContent(result.data, blockPath, context);
    blocks[id] = result.data;
  }
  return { ...job, blocks };
}

function parseGearSet(raw: unknown, path: string, context: Context): GearSet | undefined {
  const result = gearSetSchema.safeParse(raw);
  if (!result.success) {
    context.errors.push(...describe(result.error, path));
    return undefined;
  }
  checkGearSet(result.data, path, context);
  return result.data;
}

// Links past the start or end limit stay in the config (an editor shows
// them) but aren't drawn, as a second header slot isn't.
function checkGearSet(gearSet: GearSet, path: string, context: Context): void {
  const counts = { start: 0, end: 0 };
  gearSet.links?.forEach((link, index) => {
    const position = link.position ?? "start";
    const limit = position === "end" ? LIMITS.gearSet.endLinks : LIMITS.gearSet.startLinks;
    counts[position] += 1;
    if (counts[position] > limit) {
      context.errors.push(`${path}.links.${index}: ${position} link over the limit of ${limit}, not shown`);
    }
  });
  checkContent(gearSet, path, context);
}

// Problems inside parsed content that leave it in the config: a job
// action naming no job of the config (drawn without a link), and a
// collapsible group without a label (drawn as a plain group). Walks the
// whole value: only actions have `kind`, and only groups `collapsible`.
function checkContent(value: unknown, path: string, context: Context): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkContent(item, join(path, index), context));
    return;
  }
  if (!isPlainObject(value)) return;
  if (value.kind === "job" && typeof value.id === "string" && !context.jobIds.has(value.id)) {
    context.errors.push(`${path}: unknown job "${value.id}", drawn without a link`);
  }
  if (value.collapsible !== undefined && value.label === undefined) {
    context.errors.push(`${path}: collapsible without a label, drawn plain`);
  }
  for (const [key, item] of Object.entries(value)) checkContent(item, join(path, key), context);
}

// Keys in the raw input that parsing dropped, as dotted paths
// ("jobs.0.slots.skills.tooltip.subtitel"). z.object strips keys it doesn't
// know, so a key missing from the parsed copy is one the schema doesn't
// have: usually a typo of an optional field, which the panel then leaves
// out. Pass the config of a parseConfig() call without errors, so its jobs,
// tabs, pages and blocks line up with the input's by index.
export function findUnknownKeys(raw: unknown, parsed: unknown): string[] {
  return unknownKeysAt(raw, parsed, "");
}

// The recursion, with the path so far. Internal, so a caller can't pass a
// prefix by accident.
function unknownKeysAt(raw: unknown, parsed: unknown, path: string): string[] {
  if (Array.isArray(raw) && Array.isArray(parsed)) {
    return raw.flatMap((item, index) => unknownKeysAt(item, parsed[index], join(path, index)));
  }
  if (!isPlainObject(raw) || !isPlainObject(parsed)) return [];
  return Object.entries(raw).flatMap(([key, value]) =>
    // hasOwn, not `in`: a stray "constructor" key would otherwise match
    // the prototype and pass unreported.
    Object.hasOwn(parsed, key) ? unknownKeysAt(value, parsed[key], join(path, key)) : [join(path, key)],
  );
}

function join(path: string, key: string | number): string {
  return path ? `${path}.${key}` : String(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A content source: anything that can produce raw config data. Adapters for
// an API, a CMS, or a remote JSON file implement this; the component never
// knows which one it got. Resolving to undefined means the source has
// nothing yet (no save, an empty CMS entry): not a problem to report, so
// loadConfig moves on to the next source quietly. Throwing means it failed
// (unreachable, an HTTP error), which becomes an issue.
export type ConfigSource = {
  name: string;
  load: () => Promise<unknown>;
};

export type LoadIssue = { source: string; errors: string[]; error?: unknown };

export type LoadResult = {
  config: CharacterSheetConfig;
  // The name of the source used, or null for `fallback`.
  source: string | null;
  // Every problem met on the way, including in a source that was still
  // used (a dropped job). With source null, a non-empty list means the
  // fallback is showing because something failed, not because no source
  // had anything yet.
  issues: LoadIssue[];
};

// Tries each source in order and uses the first one that yields a usable
// config, falling back to `fallback` (normally a bundled JSON file). Never
// throws: the host decides what to do with the issues (logging, Sentry, a
// notice that the page shows the fallback).
export async function loadConfig(
  sources: ConfigSource[],
  fallback: CharacterSheetConfig,
): Promise<LoadResult> {
  const issues: LoadIssue[] = [];
  for (const source of sources) {
    try {
      const raw = await source.load();
      if (raw === undefined) continue;
      const { config, errors } = parseConfig(raw);
      if (errors.length > 0) issues.push({ source: source.name, errors });
      if (config) return { config, source: source.name, issues };
    } catch (error) {
      issues.push({ source: source.name, errors: [String(error)], error });
    }
  }
  return { config: fallback, source: null, issues };
}
