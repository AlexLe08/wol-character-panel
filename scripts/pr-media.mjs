// Helpers for a PR's screenshots and videos of a visible change (the
// `pr-media` skill): the playground of this worktree ("after") and of
// another ref, origin/main by default ("before"), each on its own free
// port, so a running `npm run dev`, preview or browser test doesn't
// interfere. Files go to .logs/pr-media/, to be uploaded to the PR from
// there.
//
// A per-PR script imports only this file (it re-exports chromium), and
// lives in .logs/pr-media/ (gitignored, never committed):
//
//   import { chromium, startPlayground, open, shoot, recordingContext, step, saveVideo, frame }
//     from "../../scripts/pr-media.mjs";
//   const after = await startPlayground();
//   const before = await startPlayground({ ref: "origin/main" });
//   const browser = await chromium.launch();
//   try {
//     const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
//     for (const [side, server] of [["before", before], ["after", after]]) {
//       await open(page, server, "fixture=full&view=window&theme=game");
//       await page.getByRole("link", { name: "GitHub" }).hover();
//       await shoot(page.locator(".cs"), `tooltip-game-${side}`);
//     }
//     const context = await recordingContext(browser);
//     const video = await context.newPage();
//     await open(video, after, "fixture=full");
//     await step(video, "1. Hover a slot: its tooltip opens");
//     ...
//     const file = await saveVideo(video, context, "hover-demo");
//     await frame(browser, file, 2, "hover-demo-2s");   // a .webm can't be Read
//   } finally {
//     await browser.close();
//     await before.stop();
//     await after.stop();
//   }
//
// Assert each state before a shot or step(), so a broken flow fails
// instead of being recorded. Run it with `node .logs/pr-media/<name>.mjs`.
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export { chromium };

const root = fileURLToPath(new URL("..", import.meta.url));
export const out = `${root}.logs/pr-media`;
mkdirSync(out, { recursive: true });

// GitHub's limit for an image, and for a video in a repository on a free
// plan (docs: "Attaching files").
const UPLOAD_LIMIT = 10 * 1024 * 1024;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function run(command, args, options) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 1 << 30, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr}`);
  return result;
}

// `ref`'s tree, copied with git archive (no worktree to clean up), with its
// own `npm ci`, in .logs/pr-media/<ref>/. Its own install, not this one's
// node_modules, so a PR that changes dependencies still shows the before.
function checkout(ref) {
  const dir = `${out}/${ref.replace(/[^\w.-]+/g, "-")}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const archive = run("git", ["archive", "--format=tar", ref], { cwd: root, encoding: "buffer" });
  run("tar", ["-x", "-C", dir], { input: archive.stdout });
  run("npm", ["ci", "--loglevel=error", "--no-audit", "--no-fund"], { cwd: dir });
  return dir;
}

const servers = new Set();
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    for (const stop of servers) stop();
    process.exit(130);
  });
}

// The playground's dev server, on this worktree or on `ref` (fetch first
// for an up-to-date origin/main). Resolves to { url, label, stop }.
export async function startPlayground({ ref } = {}) {
  const cwd = ref ? checkout(ref) : root;
  const port = await freePort();
  const url = `http://localhost:${port}`;
  // Its own process group, so stopping it stops Vite under npm too.
  const server = spawn("npm", ["run", "dev", "--", "--port", String(port), "--strictPort"], {
    cwd,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let errors = "";
  server.stderr.on("data", (chunk) => (errors += chunk));
  const stop = () => {
    servers.delete(stop);
    try {
      process.kill(-server.pid);
    } catch {
      // Already gone.
    }
  };
  servers.add(stop);
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`the dev server exited:\n${errors}`);
    try {
      if ((await fetch(url)).ok) return { url, label: ref ?? "this branch", stop };
    } catch {
      // Not listening yet.
    }
    await sleep(500);
  }
  stop();
  throw new Error(`the dev server didn't answer on ${url} within 30s:\n${errors}`);
}

// Opens the playground at `query` (its URL state, e.g. "fixture=full&
// theme=game&width=22") and waits for fonts, so a shot never catches a
// fallback face. Fails on a parseConfig report or a missing panel.
export async function open(page, server, query = "") {
  await page.goto(`${server.url}/?${query}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const report = page.locator(".pg-report");
  if (await report.count()) throw new Error(`parseConfig (${server.label}): ${await report.innerText()}`);
  if (!(await page.locator(".cs").count())) throw new Error(`no panel rendered (${server.label}) at /?${query}`);
}

function checkSize(file) {
  const { size } = statSync(file);
  const relative = file.slice(root.length);
  const mb = (size / 1024 / 1024).toFixed(1);
  if (size > UPLOAD_LIMIT) console.log(`TOO BIG  ${relative} (${mb} MB, GitHub takes 10 MB)`);
  else console.log(`ok  ${relative} (${mb} MB)`);
  return file;
}

// A PNG of a page or a locator (crop to the panel with page.locator(".cs")),
// to .logs/pr-media/<name>.png. Returns its path.
export async function shoot(target, name) {
  const file = `${out}/${name}.png`;
  await target.screenshot({ path: file });
  return checkSize(file);
}

// A browser context that records video. Videos show no cursor, so a dot
// follows the mouse (Playwright's moves are real mouse events); hover
// before a click so it shows where.
export async function recordingContext(browser, { viewport = { width: 1280, height: 720 }, ...options } = {}) {
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: `${out}/.video`, size: viewport },
    ...options,
  });
  await context.addInitScript(() => {
    addEventListener("mousemove", (event) => {
      let dot = document.getElementById("pr-media-cursor");
      if (!dot) {
        dot = document.createElement("div");
        dot.id = "pr-media-cursor";
        Object.assign(dot.style, {
          position: "fixed", zIndex: "10000", width: "18px", height: "18px", margin: "-9px 0 0 -9px",
          borderRadius: "50%", background: "rgba(220,40,40,0.55)", border: "2px solid #fff",
          pointerEvents: "none",
        });
        document.documentElement.appendChild(dot);
      }
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
    }, { capture: true, passive: true });
  });
  return context;
}

// A caption for the video and an "ok:" line in the terminal, so one run
// reads as a checklist in both. Call it after asserting the state.
export async function step(page, text) {
  console.log(`ok: ${text}`);
  await page.evaluate((text) => {
    let bar = document.getElementById("pr-media-caption");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "pr-media-caption";
      Object.assign(bar.style, {
        position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "9999", pointerEvents: "none",
        padding: "12px 24px", background: "rgba(20,22,26,0.88)", color: "#fff",
        font: "500 18px/1.4 system-ui, sans-serif", textAlign: "center",
      });
      document.body.appendChild(bar);
    }
    bar.textContent = text;
  }, text);
}

// Closes the context (which finishes the video) and moves the video to
// .logs/pr-media/<name>.webm. Returns its path.
export async function saveVideo(page, context, name) {
  const video = page.video();
  await context.close();
  if (!video) throw new Error("this page isn't recording: make it from recordingContext()");
  const file = `${out}/${name}.webm`;
  renameSync(await video.path(), file);
  return checkSize(file);
}

// A still of `video` (a saveVideo path) at `seconds`, to
// .logs/pr-media/<name>.png, for looking at a recording without a player.
export async function frame(browser, video, seconds, name) {
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(video).href);
    await page.evaluate(async (seconds) => {
      const player = document.querySelector("video");
      player.pause();
      player.controls = false;
      if (player.readyState < 2) await new Promise((r) => player.addEventListener("loadeddata", r, { once: true }));
      player.currentTime = seconds;
      await new Promise((r) => player.addEventListener("seeked", r, { once: true }));
    }, seconds);
    const file = `${out}/${name}.png`;
    await page.locator("video").screenshot({ path: file });
    return file;
  } finally {
    await page.close();
  }
}
