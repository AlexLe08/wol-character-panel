// Checks that a refactor leaves what a host gets unchanged: every example
// in examples/ goes through src/ and through the src/ of a base ref
// (origin/main by default), from the JSON to the HTML, and the two must
// match.
//
//   node scripts/compare-markup.mjs [--base=<ref>]
//
// Each side parses each example with its own parseConfig (config and
// errors) and its own publicConfig, and both results must match. Then each
// side renders its own configs: parsed and public, for each job, theme,
// isParamActive (true, false, absent) and parts value (none, {}, the
// decorative ones on, each part off, several off), as EquipmentPanel and as
// CharacterWindow on each tab and page. renderLink writes each link's
// intent into the HTML, so a change of intent shows. Attributes are sorted
// within each tag before comparing: React writes them in prop order, which
// a refactor may move without changing the HTML's meaning. Ids come from
// useId, so a component added or removed above the panel changes them, and
// that shows as a difference.
//
// Exit 0 when everything matches; 1 on a difference (the first is printed,
// up to 20 go to .logs/compare-markup/diffs.json); 2 on a usage or setup
// error, or when either side throws (a base without an entry or a
// component, say), so a crash never reads as a difference.
//
// Not part of scripts/check.sh: a PR that changes the markup on purpose
// differs from its base by design. Run it on a refactor, and say in the PR
// how many renders were compared.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

// Every path below is from the repository root, wherever this is run from.
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

function fail(message) {
  console.error(`compare-markup: ${message}`);
  process.exit(2);
}

const out = ".logs/compare-markup";
const baseDir = `${out}/base`;
rmSync(out, { recursive: true, force: true });
mkdirSync(baseDir, { recursive: true });
try {
  const archive = execFileSync("git", ["archive", base, "src"], {
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  execFileSync("tar", ["-x", "-C", baseDir], { input: archive });
} catch {
  fail(`can't read src/ at "${base}" (fetch it first?)`);
}

const renderLink = ({ intent, ...props }) => createElement("a", { ...props, "data-intent": intent });
const COMPONENTS = ["EquipmentPanel", "CharacterWindow"];
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

// JSON with each object's keys sorted, so a refactor that only reorders a
// config's keys (a spread moved, say) doesn't read as a difference.
const stableJson = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : item,
  );

// Where two strings first part, with some context either side.
function firstDifference(a, b) {
  let at = 0;
  while (at < a.length && a[at] === b[at]) at += 1;
  const from = Math.max(0, at - 120);
  return { at, base: a.slice(from, at + 120), current: b.slice(from, at + 120) };
}

// Runs one side's step, so a throw names its side and exits 2.
function run(side, step, fn) {
  try {
    return fn();
  } catch (error) {
    throw new Error(`${side} threw in ${step}: ${error instanceof Error ? error.message : error}`);
  }
}

let renders = 0;
const diffs = [];

function compare(sides, where) {
  const [a, b] = sides;
  if (a === b) return true;
  diffs.push({ ...where, ...firstDifference(a, b) });
  return false;
}

// One example: both sides parse it, then render each config they agree on.
function compareExample(file, sides) {
  const raw = JSON.parse(readFileSync(`examples/${file}`, "utf8"));
  const parsed = sides.map((side) => run(side.name, `parseConfig(${file})`, () => side.data.parseConfig(raw)));
  if (!compare(parsed.map((result) => stableJson(result)), { example: file, step: "parseConfig" })) return;
  if (!parsed[1].config) throw new Error(`examples/${file} doesn't parse: ${parsed[1].errors.join("; ")}`);
  const publics = sides.map((side, index) =>
    run(side.name, `publicConfig(${file})`, () => side.data.publicConfig(parsed[index].config)),
  );
  if (!compare(publics.map((config) => stableJson(config)), { example: file, step: "publicConfig" })) return;

  for (const [variant, configs] of [["parsed", parsed.map((result) => result.config)], ["public", publics]]) {
    // Both sides' configs are equal as JSON, so their jobs and tabs line up.
    const views = (configs[1].tabs ?? []).flatMap((tab) =>
      tab.pages ? tab.pages.map((page) => ({ tab: tab.id, page: page.id })) : [{ tab: tab.id }],
    );
    configs[1].jobs.forEach((job, jobIndex) => {
      for (const theme of ["document", "game"]) {
        for (const paramActive of PARAM_ACTIVE) {
          for (const parts of PARTS) {
            for (const component of COMPONENTS) {
              for (const view of component === "CharacterWindow" && views.length > 0 ? views : [{}]) {
                const html = sides.map((side, index) => {
                  const props = {
                    config: configs[index],
                    job: configs[index].jobs[jobIndex],
                    theme,
                    renderLink,
                    ...(parts && { parts }),
                    ...paramActive,
                    ...view,
                  };
                  return run(side.name, `${component} (${file}, ${job.id})`, () =>
                    sortAttributes(renderToStaticMarkup(createElement(side.react[component], props))),
                  );
                });
                renders += 1;
                compare(html, {
                  example: file,
                  step: "render",
                  config: variant,
                  job: job.id,
                  theme,
                  component,
                  tab: view.tab,
                  page: view.page,
                  parts: parts ?? null,
                  isParamActive: "isParamActive" in paramActive ? String(paramActive.isParamActive()) : "absent",
                });
              }
            }
          }
        }
      }
    });
  }
}

// Vite compiles the TypeScript and JSX of both copies; React comes from
// node_modules for both, so the two render with the same React.
let server;
let examples = [];
try {
  server = await createServer({
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  const load = async (name, root) => {
    const side = {
      name,
      react: await server.ssrLoadModule(`/${root}/react-entry.ts`),
      data: await server.ssrLoadModule(`/${root}/index.ts`),
    };
    for (const component of COMPONENTS) {
      if (typeof side.react[component] !== "function") throw new Error(`${name} has no ${component} in react-entry.ts`);
    }
    for (const fn of ["parseConfig", "publicConfig"]) {
      if (typeof side.data[fn] !== "function") throw new Error(`${name} has no ${fn} in index.ts`);
    }
    return side;
  };
  const sides = [await load(base, `${baseDir}/src`), await load("current", "src")];
  examples = readdirSync("examples").filter((name) => name.endsWith(".json")).sort();
  for (const file of examples) compareExample(file, sides);
} catch (error) {
  // A failed close mustn't turn the setup error into an exit 1.
  await server?.close().catch(() => {});
  fail(error instanceof Error ? error.message : String(error));
}
await server.close().catch(() => {});

// Differences by step: a parse or publicConfig difference skips that
// example's renders, so it lowers the render count too.
const bySteps = Object.entries(Object.groupBy(diffs, (diff) => diff.step))
  .map(([step, list]) => `${step} ${list.length}`)
  .join(", ");
console.log(
  `compare-markup: ${renders} renders of ${examples.length} examples against ${base}, ` +
    `${diffs.length} differ${diffs.length > 0 ? ` (${bySteps})` : ""}`,
);
if (diffs.length > 0) {
  writeFileSync(`${out}/diffs.json`, `${JSON.stringify(diffs.slice(0, 20), null, 2)}\n`);
  const { base: was, current: now, ...where } = diffs[0];
  console.log("first difference:", JSON.stringify(where));
  console.log(`  ${base}: …${was}…`);
  console.log(`  current: …${now}…`);
  console.log(`up to 20 in ${out}/diffs.json`);
  process.exit(1);
}
