/// <reference types="vite/client" />
import { renderToStaticMarkup } from "react-dom/server";
import { parseConfig, publicConfig, resolveJob } from "../src/index.ts";
import { CharacterWindow, EquipmentPanel } from "../src/react-entry.ts";
import panelCss from "../src/character-panel.css?raw";
import playgroundCss from "./playground.css?raw";

// /static: the panel rendered on the server, as a host serves it before
// hydration, with no script on the page. The browser tests use it to check
// what works without JavaScript (tooltips on hover and focus, the job
// menu, tab links, the narrow layout). vite.config.ts serves it in
// `npm run dev`.
//
// It reads view, fixture, theme, labels, width, job, tab and page from the
// query, like the main page; the other controls aren't needed here.

const examples = import.meta.glob<unknown>("../examples/*.json", { eager: true, import: "default" });
const fixtures = Object.fromEntries(
  Object.entries(examples).map(([path, raw]) => [path.replace(/^.*\/(.+)\.json$/, "$1"), raw]),
);

export function render(url: URL): string {
  const query = url.searchParams;
  const raw = fixtures[query.get("fixture") ?? "full"] ?? fixtures.full;
  const { config } = parseConfig(raw);
  let panel = "<p>This config has nothing to render.</p>";
  if (config) {
    const visible = publicConfig(config);
    // Job links keep the page's own query, as the main page's basePath does.
    const basePath = `/static${url.search}`;
    const props = {
      config: visible,
      job: resolveJob(visible, query.get("job") ?? undefined),
      basePath,
      theme: query.get("theme") === "game" ? "game" : "document",
      labels: query.get("labels") === "always" ? "always" : "narrow",
    } as const;
    panel = renderToStaticMarkup(
      query.get("view") === "window" ? (
        <CharacterWindow {...props} tab={query.get("tab") ?? undefined} page={query.get("page") ?? undefined} />
      ) : (
        <EquipmentPanel {...props} />
      ),
    );
  }
  const width = Number(query.get("width"));
  const stageStyle = width > 0 ? ` style="width:${width}rem"` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Character panel, server-rendered</title>
    <link rel="icon" href="data:," />
    <style>${playgroundCss}</style>
    <style>${panelCss}</style>
  </head>
  <body>
    <main class="pg"><div class="pg-stage"${stageStyle}>${panel}</div></main>
  </body>
</html>
`;
}
