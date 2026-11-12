import { describe, expect, it } from "vitest";
import * as root from "./index.ts";
import * as react from "./react-entry.ts";
import * as schema from "./schema-entry.ts";

// The runtime names each entry in package.json's exports map gives hosts.
// Removing or renaming one breaks every host that imports it, so it needs a
// major release: a change here is a semver decision, not a snapshot to
// update. Adding one is a minor release. Exported types aren't listed (they
// vanish at runtime), so removing one isn't caught here.
const names = (entry: object) => Object.keys(entry).sort();

describe("public entries", () => {
  it('"." exports the data side only', () => {
    expect(names(root)).toMatchInlineSnapshot(`
      [
        "ID_PATTERN",
        "LIMITS",
        "PARAM_NAME_PATTERN",
        "actionHref",
        "findUnknownKeys",
        "jobHref",
        "loadConfig",
        "parseConfig",
        "publicConfig",
        "resolveJob",
        "resolveTab",
        "tabHref",
        "withQuery",
      ]
    `);
  });

  it('"/react" exports the component', () => {
    expect(names(react)).toMatchInlineSnapshot(`
      [
        "EquipmentPanel",
      ]
    `);
  });

  it('"/schema" exports the config schema only', () => {
    expect(names(schema)).toMatchInlineSnapshot(`
      [
        "characterPanelConfigSchema",
      ]
    `);
  });
});
