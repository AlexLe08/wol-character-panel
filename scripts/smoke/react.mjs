// Run by scripts/smoke-pack.mjs once react and react-dom are installed:
// server-renders "/react" from the packed tarball, loading every file the
// component needs from dist/.
import assert from "node:assert/strict";
import { register } from "node:module";

// "/react" imports its CSS, which a host's bundler handles; plain Node
// can't load a .css file, so this hook gives it an empty module instead.
const cssHook = `export async function load(url, context, next) {
  if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
  return next(url, context);
}`;
register(`data:text/javascript,${encodeURIComponent(cssHook)}`);

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { CharacterSheet } = await import("@solution-nine/wol-character-panel/react");
const { parseConfig, resolveJob } = await import("@solution-nine/wol-character-panel");

const { config } = parseConfig({
  defaultJobId: "developer",
  slots: [{ id: "skills", label: "Skills", position: "left" }],
  jobs: [
    {
      id: "developer",
      name: "Developer",
      title: "Developer",
      level: { label: "Lv.", value: "1" },
      slots: { skills: { tooltip: { title: "Skills" }, action: { kind: "none" } } },
    },
  ],
});
assert.ok(config);

const html = renderToStaticMarkup(createElement(CharacterSheet, { config, job: resolveJob(config, undefined) }));
assert.match(html, /class="cs\b/);
assert.match(html, /Developer/);

const react = await import("react/package.json", { with: { type: "json" } });
console.log(`react entry ok (react ${react.default.version})`);
