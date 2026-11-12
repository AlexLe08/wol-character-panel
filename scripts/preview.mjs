// Screenshots the playground in Chromium, for a look at a change without
// opening a browser (the `preview` skill runs it):
//   node scripts/preview.mjs                          # every example
//   node scripts/preview.mjs --fixture=full --theme=game --view=window
// Each example in examples/, in each view (equipment: EquipmentPanel;
// window: CharacterWindow), each theme, wide (as wide as the page allows)
// and narrow (22rem, below the 26rem container query): the component
// alone, to .logs/preview/<fixture>-<view>-<theme>-<layout>.png. The window
// gets one shot per tab, <fixture>-window-<tab>-<theme>-<layout>.png,
// following its own tab links. Prints one line
// per shot with any console error or warning, uncaught page error, or
// parseConfig report, and exits 1 if there was one.
// Starts its own dev server on port 5198 (the browser tests use 5199), so a
// busy port fails instead of screenshotting another worktree's server.
// Needs Chromium once: `npx playwright install chromium`.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = `${root}.logs/preview`;
const PORT = 5198;
const base = `http://localhost:${PORT}`;

// --name=a,b narrows a dimension; unknown names fail rather than shoot nothing.
function option(name, all) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return all;
  const picked = arg.slice(name.length + 3).split(",");
  const unknown = picked.filter((value) => !all.includes(value));
  if (unknown.length > 0) throw new Error(`unknown ${name}: ${unknown.join(", ")} (one of ${all.join(", ")})`);
  return picked;
}
const fixtures = option(
  "fixture",
  readdirSync(`${root}examples`)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length)),
);
const views = option("view", ["equipment", "window"]);
const themes = option("theme", ["document", "game"]);
const layouts = { wide: "", narrow: "22" };

// Something already answering on the port would pass the readiness check
// below before Vite's --strictPort fails, so refuse it up front.
const busy = await fetch(base).then(
  () => true,
  () => false,
);
if (busy) throw new Error(`port ${PORT} is busy (another preview, or a dev server left running)`);

// Its own process group, so stopping it stops Vite under npm too. That also
// keeps a terminal's Ctrl-C from reaching it, hence the signal handlers.
const server = spawn("npm", ["run", "dev", "--", "--port", String(PORT), "--strictPort"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", "ignore", "pipe"],
});
let serverErrors = "";
server.stderr.on("data", (chunk) => (serverErrors += chunk));
const stopServer = () => {
  try {
    process.kill(-server.pid);
  } catch {
    // Already gone.
  }
};
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    stopServer();
    process.exit(130);
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`the dev server exited:\n${serverErrors}`);
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(500);
  }
  throw new Error(`the dev server didn't answer on ${base} within 30s:\n${serverErrors}`);
}

let problems = 0;
const browser = await (async () => {
  try {
    await waitForServer();
    return await chromium.launch();
  } catch (error) {
    stopServer();
    throw error;
  }
})();
try {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let messages = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      messages.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => messages.push(`page error: ${error.message}`));

  // One shot of the page at `query`, named `name`, and its report line.
  async function shoot(name, query) {
    messages = [];
    await page.goto(`${base}/?${query}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const report = page.locator(".pg-report");
    if (await report.count()) messages.push(`parseConfig: ${(await report.innerText()).replace(/\s+/g, " ")}`);
    const file = `${out}/${name}.png`;
    const panel = page.locator(".cs");
    if (await panel.count()) await panel.first().screenshot({ path: file });
    else {
      messages.push("no panel rendered (.cs missing); full page shot instead");
      await page.screenshot({ path: file, fullPage: true });
    }
    problems += messages.length;
    console.log(`${messages.length ? "FAIL" : "ok  "}  .logs/preview/${name}.png  /?${query}`);
    for (const line of messages) console.log(`      ${line}`);
  }

  for (const fixture of fixtures) {
    for (const view of views) {
      for (const theme of themes) {
        for (const [layout, width] of Object.entries(layouts)) {
          const query = new URLSearchParams({ fixture, view, theme, ...(width && { width }) });
          if (view === "equipment") {
            await shoot(`${fixture}-${view}-${theme}-${layout}`, query);
            continue;
          }
          // The window's tabs, as its own links name them (none when it
          // has one tab or none): each is shot from its link's ?tab=.
          await page.goto(`${base}/?${query}`, { waitUntil: "networkidle" });
          const tabs = await page
            .locator(".cs__tab")
            .evaluateAll((links) => links.map((link) => new URL(link.href).searchParams.get("tab")));
          if (tabs.length === 0) await shoot(`${fixture}-${view}-${theme}-${layout}`, query);
          for (const [index, tab] of tabs.entries()) {
            const tabQuery = new URLSearchParams(query);
            if (tab) tabQuery.set("tab", tab);
            await shoot(`${fixture}-${view}-${tab ?? `tab${index + 1}`}-${theme}-${layout}`, tabQuery);
          }
        }
      }
    }
  }
} finally {
  await browser.close();
  stopServer();
}
process.exit(problems ? 1 : 0);
