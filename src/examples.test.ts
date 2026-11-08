/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { findUnknownKeys, parseConfig } from "./parse.ts";

// The configs in examples/ feed the playground and show hosts what a config
// looks like, so each one must parse cleanly: no errors (nothing dropped or
// replaced by a fallback) and no unknown keys (no typo the panel would
// silently leave out). Vite's glob picks up every file, so a new example is
// checked without touching this test.
const examples = import.meta.glob<unknown>("../examples/*.json", { eager: true, import: "default" });

describe("examples", () => {
  it("finds the example configs", () => {
    expect(Object.keys(examples).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(examples))("%s parses without errors or unknown keys", (_, raw) => {
    const { config, errors } = parseConfig(raw);
    expect(errors).toEqual([]);
    expect(config).not.toBeNull();
    expect(findUnknownKeys(raw, config)).toEqual([]);
  });
});
