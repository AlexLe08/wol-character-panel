import type { Block, CharacterPanelConfig, Job, SlotAction, Tab, TabPage } from "./types.ts";

// The config as visitors see it: only published jobs, so drafts and hidden
// jobs are left out of the job menu and a ?job= link to one falls back to
// the default like an unknown id, without saying the job exists.
// parseConfig() guarantees the default job is published. Also without
// anything marked hidden (tabs, pages, blocks, gear-set rows), a tab or
// page left with nothing to show, and a job's replacement for a block
// that's gone, so a host that sends the public config to the browser
// doesn't send hidden data. Editors use the whole config instead.
export function publicConfig(config: CharacterPanelConfig): CharacterPanelConfig {
  const { gearSet, tabs, ...rest } = config;
  const publicTabs = tabs?.flatMap(publicTab);
  const blockIds = new Set(publicTabs?.flatMap(tabBlocks).flatMap((block) => block.id ?? []));
  return {
    ...rest,
    ...(gearSet && !gearSet.hidden && { gearSet }),
    ...(publicTabs && publicTabs.length > 0 && { tabs: publicTabs }),
    jobs: config.jobs.filter((job) => job.status === "published").map((job) => publicJob(job, blockIds)),
  };
}

function publicTab(tab: Tab): Tab[] {
  if (tab.hidden) return [];
  if (tab.pages) {
    const pages = tab.pages.flatMap((page): TabPage[] => {
      const blocks = page.hidden ? [] : visibleBlocks(page.blocks);
      return blocks.length > 0 ? [{ ...page, blocks }] : [];
    });
    return pages.length > 0 ? [{ ...tab, pages }] : [];
  }
  const blocks = visibleBlocks(tab.blocks ?? []);
  return blocks.length > 0 ? [{ ...tab, blocks }] : [];
}

function publicJob(job: Job, blockIds: Set<string>): Job {
  const { gearSet, blocks, ...rest } = job;
  return {
    ...rest,
    ...(gearSet && !gearSet.hidden && { gearSet }),
    ...(blocks && { blocks: Object.fromEntries(Object.entries(blocks).filter(([id]) => blockIds.has(id))) }),
  };
}

const visibleBlocks = (blocks: Block[]) => blocks.filter((block) => !block.hidden);

// Every block of a tab, on any page.
const tabBlocks = (tab: Tab): Block[] => (tab.pages ? tab.pages.flatMap((page) => page.blocks) : (tab.blocks ?? []));

// A tab's pages that can be shown: not hidden, with a block that isn't.
// Pages win over blocks in a tab that has both, as parseConfig keeps them.
function visiblePages(tab: Tab): TabPage[] {
  return (tab.pages ?? []).filter((page) => !page.hidden && visibleBlocks(page.blocks).length > 0);
}

// The tabs that can be shown, in order: the first one is the default.
function visibleTabs(config: CharacterPanelConfig): Tab[] {
  return (config.tabs ?? []).filter(
    (tab) => !tab.hidden && (tab.pages ? visiblePages(tab).length > 0 : visibleBlocks(tab.blocks ?? []).length > 0),
  );
}

export type ResolvedTab = {
  tab: Tab;
  // The tab's page to show, or null for a tab of blocks.
  page: TabPage | null;
};

// The tab and page named in the URL, or the first visible ones: as with
// ?job=, an unknown or repeated value falls back instead of failing. Hidden
// tabs and pages are skipped even in a config that didn't go through
// publicConfig(). null when the config has no tab to show. For tabs a
// host leaves out in one place, pass a config without them, here and to
// tabHref, so both agree on which tab comes first.
export function resolveTab(
  config: CharacterPanelConfig,
  tabParam: string | string[] | undefined,
  pageParam?: string | string[],
): ResolvedTab | null {
  const tabs = visibleTabs(config);
  if (tabs.length === 0) return null;
  const tab = tabs.find((candidate) => candidate.id === first(tabParam)) ?? tabs[0];
  const pages = visiblePages(tab);
  if (pages.length === 0) return { tab, page: null };
  return { tab, page: pages.find((candidate) => candidate.id === first(pageParam)) ?? pages[0] };
}

const first = (param: string | string[] | undefined) => (Array.isArray(param) ? param[0] : param);

export type TabHrefOptions = {
  // A page of the tab. Left out, the link goes to the tab's first page.
  page?: string;
  // The query parameters' names, if the host renamed them.
  tabParam?: string;
  pageParam?: string;
};

// A link to a tab, or to one of its pages, from currentHref: the other
// parameters it has (?job=) are kept, and the page parameter is replaced
// or dropped, since a page belongs to its tab. The first visible tab and a
// tab's first page get no parameter, so each view has one URL, as the
// default job does.
export function tabHref(
  config: CharacterPanelConfig,
  tabId: string,
  currentHref = "/",
  { page, tabParam = "tab", pageParam = "page" }: TabHrefOptions = {},
): string {
  const tabs = visibleTabs(config);
  const tab = tabs.find((candidate) => candidate.id === tabId);
  const pages = tab ? visiblePages(tab) : [];
  return withQuery(currentHref, {
    [tabParam]: tabs[0]?.id === tabId ? null : tabId,
    [pageParam]: page === undefined || pages.length === 0 || page === pages[0].id ? null : page,
  });
}

// The blocks to draw for a job, in order: hidden ones left out, and each
// one the job replaces (job.blocks, by id) swapped for the job's, keeping
// the shared block's id. parseConfig drops a replacement of another type;
// one that slips through (a config not parsed) is ignored here too.
// Private for now: the window uses it; hosts get it only if they need it.
export function resolveBlocks(blocks: Block[], job: Job): Block[] {
  return visibleBlocks(blocks).map((block) => {
    // hasOwn: an id like "constructor" would otherwise find the prototype's.
    if (block.id === undefined || !job.blocks || !Object.hasOwn(job.blocks, block.id)) return block;
    const replacement = job.blocks[block.id];
    if (replacement.type !== block.type) return block;
    return { ...replacement, id: block.id } as Block;
  });
}

// The job named in the URL, or the default one. An unknown or repeated
// ?job= value falls back instead of failing, so an old shared link still
// opens the page.
export function resolveJob(config: CharacterPanelConfig, param: string | string[] | undefined): Job {
  const wanted = Array.isArray(param) ? param[0] : param;
  return (
    config.jobs.find((job) => job.id === wanted) ??
    config.jobs.find((job) => job.id === config.defaultJobId) ??
    config.jobs[0]
  );
}

// href with query parameters changed: each one set (replacing every copy
// of it with one, in the first one's place), or removed when its value is
// null (or undefined, for plain-JS callers); the parameters href already
// has are kept, in order. The
// result's hash is `hash` (without the #), or none: href's own hash is
// dropped, since it belonged to the page before. An empty query leaves no
// "?". The query href already has is re-encoded by URLSearchParams (a
// space becomes "+"). jobHref and param actions are built on it; a host
// can use it for its own links to the same pages.
export function withQuery(href: string, params: Record<string, string | null>, hash?: string): string {
  const withoutHash = href.split("#")[0];
  const queryAt = withoutHash.indexOf("?");
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const query = new URLSearchParams(queryAt === -1 ? "" : withoutHash.slice(queryAt + 1));
  for (const [name, value] of Object.entries(params)) {
    if (value == null) query.delete(name);
    else query.set(name, value);
  }
  const search = query.toString();
  return `${path}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

// The default job gets the bare path, so the page has one canonical URL. A
// query basePath already has is kept (its hash isn't).
export function jobHref(config: CharacterPanelConfig, jobId: string, basePath = "/", param = "job"): string {
  return withQuery(basePath, { [param]: jobId === config.defaultJobId ? null : jobId });
}

// currentHref is the page the panel is on, with its ?job= (from jobHref);
// only a param action uses it, setting its one parameter on that URL. The
// query currentHref already has is kept; from EquipmentPanel that's only
// ?job=, so another parameter in the browser's URL is replaced, not added to.
export function actionHref(action: SlotAction, currentHref = "/"): string | null {
  switch (action.kind) {
    case "anchor":
      return `#${action.target}`;
    case "link":
    case "external":
      return action.href;
    case "param":
      return withQuery(currentHref, { [action.name]: action.value }, action.target);
    case "none":
      return null;
  }
}

// Whether a slot's action is what the page is showing right now, so the
// panel can mark it. Only a param action can be: the host says which
// parameter values its page applies (isParamActive), since only it knows
// how it reads them (a case-insensitive filter, say). A param action
// naming one of the component's own parameters (ownParams: the job
// parameter, and the window's tab and page ones) renders tooltip-only, so
// it's never active.
export function isActionActive(
  action: SlotAction,
  isParamActive?: (name: string, value: string) => boolean,
  ownParams: string | readonly string[] = "job",
): boolean {
  if (action.kind !== "param" || [ownParams].flat().includes(action.name) || !isParamActive) return false;
  return isParamActive(action.name, action.value);
}
