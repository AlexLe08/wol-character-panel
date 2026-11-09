// Installs the packed tarball into a throwaway project and uses it the way a
// host does, through the `exports` map, in plain Node:
//   node scripts/smoke-pack.mjs                  # latest peers in range
//   node scripts/smoke-pack.mjs --oldest-peers   # lowest peers in range
// First with zod only (no React installed), running scripts/smoke/data.mjs:
// "." and "/schema" import, the JSON Schema and CSS resolve, and
// dist/SlotHover.js keeps "use client". Then with react and react-dom,
// running scripts/smoke/react.mjs, which server-renders "/react".
// Needs the npm registry (or npm's cache) for the peers.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const oldest = process.argv.includes("--oldest-peers");

// The lowest version a peer range allows; only the "^N[.N[.N]]" form the
// package uses, so a new range shape fails here instead of testing the
// wrong thing.
function lowest(range) {
  const match = /^\^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range);
  if (!match) throw new Error(`can't find the lowest version of peer range ${range}`);
  return `${match[1]}.${match[2] ?? 0}.${match[3] ?? 0}`;
}
const peer = (name) => {
  const range = pkg.peerDependencies[name];
  return `${name}@${oldest ? lowest(range) : range}`;
};
// react-dom isn't a peer (hosts bring their own renderer); match react.
const reactDom = peer("react").replace(/^react@/, "react-dom@");

const npm = (args, cwd) => execFileSync("npm", args, { cwd, stdio: "inherit" });
const run = (file, cwd) => execFileSync(process.execPath, [file], { cwd, stdio: "inherit" });
const install = ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"];

const dir = mkdtempSync(join(tmpdir(), "wol-smoke-"));
try {
  // prepack builds first.
  const [{ filename }] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", dir], {
      cwd: root,
      stdio: ["ignore", "pipe", "inherit"],
    }).toString(),
  );
  const consumer = join(dir, "consumer");
  mkdirSync(consumer);
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  for (const file of ["data.mjs", "react.mjs"]) {
    copyFileSync(new URL(`scripts/smoke/${file}`, root), join(consumer, file));
  }

  // --legacy-peer-deps: npm would otherwise add react, the other peer.
  console.log(`\n# ${filename} with ${peer("zod")}, no React (Node ${process.version})`);
  npm([...install, join(dir, filename), peer("zod")], consumer);
  run("data.mjs", consumer);

  console.log(`\n# adding ${peer("react")} and ${reactDom}`);
  npm([...install, peer("react"), reactDom], consumer);
  run("react.mjs", consumer);
  console.log("\nsmoke test passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
