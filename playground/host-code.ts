// The code a host would write for what the page shows, for the "Show
// config" disclosure under the panel: the imports, the config parsed as
// the README's Next.js page does it, and the component with the props the
// controls set. Props left at their defaults are left out, as a host
// would leave them, but for theme, which the reader is likely to change.
// Props that are this page's own wiring (basePath, renderLink,
// isParamActive) are left out too: the README's Usage covers them.

export type HostCodeOptions = {
  fixture: string;
  view: "window" | "equipment";
  theme: "document" | "game";
  labels: "narrow" | "always";
  sockets: boolean;
  toolbar: boolean;
  end: boolean;
  // Container width in rem, or "" for as wide as the page allows.
  width: string;
  darkTokens: boolean;
  drafts: boolean;
};

export function hostCode(options: HostCodeOptions): string {
  const component = options.view === "window" ? "CharacterWindow" : "EquipmentPanel";
  const parts = [options.sockets && "sockets: true", options.toolbar && "toolbar: true"].filter(Boolean);

  const props = [
    "config={config}",
    "job={resolveJob(config, searchParams.job)}",
    ...(options.view === "window" ? ["tab={searchParams.tab}", "page={searchParams.page}"] : []),
    `theme="${options.theme}"`,
    ...(options.labels === "always" ? ['labels="always"'] : []),
    ...(parts.length > 0 ? [`parts={{ ${parts.join(", ")} }}`] : []),
    ...(options.end ? ["gearSetEnd={<SaveButton />}"] : []),
  ];

  // The panel follows its container's width (a container query), so the
  // Width control is the host's wrapper.
  const indent = options.width ? "  " : "";
  const element = [`<${component}`, ...props.map((prop) => `  ${prop}`), "/>"].map((line) => indent + line);
  const jsx = options.width
    ? [`<div style={{ width: "${options.width}rem" }}>`, ...element, "</div>"]
    : element;

  return [
    'import { parseConfig, publicConfig, resolveJob } from "@solution-nine/wol-character-panel";',
    `import { ${component} } from "@solution-nine/wol-character-panel/react";`,
    "// The components import their own CSS; import it yourself only to place",
    "// it before your own styles.",
    'import "@solution-nine/wol-character-panel/character-panel.css";',
    `import json from "./${options.fixture}.json";`,
    "",
    "const parsed = parseConfig(json);",
    'if (!parsed.config) throw new Error(parsed.errors.join("\\n"));',
    options.drafts
      ? "const config = parsed.config; // the whole config, drafts and hidden jobs too, as an editor sees it"
      : "const config = publicConfig(parsed.config); // leaves out drafts and anything hidden",
    "",
    ...(options.darkTokens && options.theme === "document"
      ? ["// The document theme follows the page's --paper, --ink, --signal… tokens."]
      : []),
    ...jsx,
  ].join("\n");
}
