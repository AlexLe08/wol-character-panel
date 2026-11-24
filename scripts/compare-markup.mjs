// Checks that a refactor leaves the panel's server-rendered HTML unchanged:
// every example in examples/ is rendered by src/ and by the src/ of a base
// ref (origin/main by default), and the two must match.
//
//   node scripts/compare-markup.mjs [--base=<ref>]
//
// Each example is rendered as parsed and through publicConfig(), for each
// job, theme, isParamActive (true, false, absent) and parts value (none,
// {}, the decorative ones on, each part off, several off), as
// EquipmentPanel and as CharacterWindow on each tab and page. renderLink
// writes each link's intent into the HTML, so a change of intent shows.
// Attributes are sorted within each tag before comparing: React writes
// them in prop order, which a refactor may move without changing the HTML's
// meaning. Exit 0 when every render matches, 1 on a difference (the first
// is printed, up to 20 go to .logs/compare-markup/diffs.json), 2 on a
// usage or setup error.
//
// Not part of scripts/check.sh: a PR that changes the markup on purpose
// differs from its base by design. Run it on a refactor, and say in the PR
// how many renders were compared.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith("--base="));
if (args.some((arg) => arg !== baseArg)) {
  console.error("usage: node scripts/compare-markup.mjs [--base=<ref>]");
  process.exit(2);
}
const base = baseArg ? baseArg.slice("--base=".length) : "origin/main";

const out = ".logs/compare-markup";
const baseDir = `${out}/base`;
rmSync(out, { recursive: true, force: true });
mkdirSync(baseDir, { recursive: true });
try {
  const archive = execFileSync("git", ["archive", base, "src"], { maxBuffer: 64 * 1024 * 1024 });
  execFileSync("tar", ["-x", "-C", baseDir], { input: archive });
} catch {
  console.error(`compare-markup: can't read src/ at "${base}" (fetch it first?)`);
  process.exit(2);
}

// Vite compiles the TypeScript and JSX of both copies; React comes from
// node_modules for both, so the two render with the same React.
const server = await createServer({
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});
const load = async (root) => ({
  react: await server.ssrLoadModule(`/${root}/react-entry.ts`),
  data: await server.ssrLoadModule(`/${root}/index.ts`),
});
const current = await load("src");
const before = await load(`${baseDir}/src`);

const renderLink = ({ intent, ...props }) => createElement("a", { ...props, "data-intent": intent });
const PARAM_ACTIVE = [{ isParamActive: () => true }, { isParamActive: () => false }, {}];
const PARTS = [
  undefined,
  {},
  { toolbar: true, sockets: true },
  { bar: false },
  { characterName: false },
  { gearSet: false },
  { jobMenu: false },
  { tabs: false },
  { equipment: false },
  { bar: false, gearSet: false, tabs: false },
];

const sortAttributes = (html) =>
  html.replace(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>]+(?:="[^"]*")?)+)(\s*\/?)>/g, (_, name, attrs, end) => {
    const list = attrs.match(/[^\s=>]+(?:="[^"]*")?/g).sort();
    return `<${name} ${list.join(" ")}${end}>`;
  });

// Where two renders first part, with some context either side.
function firstDifference(a, b) {
  let at = 0;
  while (at < a.length && a[at] === b[at]) at += 1;
  const from = Math.max(0, at - 120);
  return { at, base: a.slice(from, at + 120), current: b.slice(from, at + 120) };
}

let renders = 0;
const diffs = [];
const examples = readdirSync("examples").filter((name) => name.endsWith(".json")).sort();
for (const file of examples) {
  const { config: parsed } = current.data.parseConfig(JSON.parse(readFileSync(`examples/${file}`, "utf8")));
  if (!parsed) {
    console.error(`compare-markup: examples/${file} doesn't parse`);
    process.exit(2);
  }
  for (const [variant, config] of [["parsed", parsed], ["public", current.data.publicConfig(parsed)]]) {
    const views = (config.tabs ?? []).flatMap((tab) =>
      tab.pages ? tab.pages.map((page) => ({ tab: tab.id, page: page.id })) : [{ tab: tab.id }],
    );
    for (const job of config.jobs) {
      for (const theme of ["document", "game"]) {
        for (const paramActive of PARAM_ACTIVE) {
          for (const parts of PARTS) {
            const props = { config, job, theme, renderLink, ...(parts && { parts }), ...paramActive };
            const cases = [["EquipmentPanel", props]];
            for (const view of views.length > 0 ? views : [{}]) cases.push(["CharacterWindow", { ...props, ...view }]);
            for (const [component, caseProps] of cases) {
              renders += 1;
              const a = sortAttributes(renderToStaticMarkup(createElement(before.react[component], caseProps)));
              const b = sortAttributes(renderToStaticMarkup(createElement(current.react[component], caseProps)));
              if (a === b) continue;
              diffs.push({
                example: file,
                config: variant,
                job: job.id,
                theme,
                component,
                tab: caseProps.tab,
                page: caseProps.page,
                parts: parts ?? null,
                isParamActive: "isParamActive" in paramActive ? String(paramActive.isParamActive()) : "absent",
                ...firstDifference(a, b),
              });
            }
          }
        }
      }
    }
  }
}
await server.close();

console.log(`compare-markup: ${renders} renders of ${examples.length} examples against ${base}, ${diffs.length} differ`);
if (diffs.length > 0) {
  writeFileSync(`${out}/diffs.json`, `${JSON.stringify(diffs.slice(0, 20), null, 2)}\n`);
  const { base: was, current: now, ...where } = diffs[0];
  console.log("first difference:", JSON.stringify(where));
  console.log(`  ${base}: …${was}…`);
  console.log(`  current: …${now}…`);
  console.log(`up to 20 in ${out}/diffs.json`);
  process.exit(1);
}
