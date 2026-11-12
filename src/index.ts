// The data side of the package: parsing, loading, job and tab links and the
// config's limits, with no React or CSS, so server code and plain Node
// scripts can import it. The component is in "/react", the zod schema in
// "/schema".
export {
  findUnknownKeys,
  loadConfig,
  parseConfig,
  type ConfigSource,
  type LoadIssue,
  type LoadResult,
  type ParseResult,
} from "./parse.ts";
export { ID_PATTERN, LIMITS, PARAM_NAME_PATTERN } from "./schema.ts";
export {
  actionHref,
  jobHref,
  publicConfig,
  resolveJob,
  resolveTab,
  tabHref,
  withQuery,
  type ResolvedTab,
  type TabHrefOptions,
} from "./resolve.ts";
export type {
  Block,
  BlockType,
  CharacterPanelConfig,
  Detail,
  FieldsBlock,
  GaugesBlock,
  GearSet,
  GearSetLink,
  IconName,
  Job,
  JobBlock,
  JobStatus,
  LevelsBlock,
  Portrait,
  ProgressBlock,
  RowAction,
  SlotAction,
  SlotContent,
  SlotDef,
  SlotPosition,
  StatsBlock,
  Tab,
  TabPage,
  Theme,
  Tooltip,
  TooltipItem,
} from "./types.ts";
