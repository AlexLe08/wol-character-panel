// Run by scripts/smoke-pack.mjs inside a throwaway project that has the
// packed tarball and zod installed, but not React: "." and "/schema" must
// load without it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LIMITS, parseConfig } from "@solution-nine/wol-character-panel";
import pkg from "@solution-nine/wol-character-panel/package.json" with { type: "json" };
import { characterSheetConfigSchema } from "@solution-nine/wol-character-panel/schema";
import schema from "@solution-nine/wol-character-panel/character-sheet.schema.json" with { type: "json" };

// Without this, the "no React" half proves nothing.
assert.throws(() => import.meta.resolve("react"), "react should not be installed here");

const config = {
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
};

const parsed = parseConfig(config);
assert.deepEqual(parsed.errors, []);
assert.equal(parsed.config?.jobs[0].id, "developer");
assert.equal(typeof LIMITS, "object");
assert.equal(characterSheetConfigSchema.safeParse(config).success, true);

const major = pkg.version.split(".")[0];
assert.ok(schema.$id.endsWith(`${pkg.name}@${major}/character-sheet.schema.json`), schema.$id);

const css = readFileSync(new URL(import.meta.resolve("@solution-nine/wol-character-panel/character-sheet.css")), "utf8");
assert.match(css, /\.cs\b/);

// The panel's only client file must keep its directive in the published
// output (a bundler in the build would drop it). It isn't an entry, so it's
// read through the package's location rather than imported.
const slotHover = new URL("./SlotHover.js", import.meta.resolve("@solution-nine/wol-character-panel"));
assert.match(readFileSync(slotHover, "utf8"), /^"use client";/);

console.log(`data entries ok (${pkg.name}@${pkg.version}, zod ${(await import("zod/package.json", { with: { type: "json" } })).default.version})`);
