import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// The package's boundary: it imports nothing but react and zod, its only
// dependencies (both peers). A tsconfig can't enforce this (it would resolve
// anything installed in node_modules), so lint does.
const IMPORT_MESSAGE =
  "The character sheet package imports only react, zod and its own files (./…).";
// Each entry must match the whole specifier. "./" paths may not climb out
// with "..".
const ALLOWED = ["react", "react/.+", "zod", String.raw`\./(?!.*\.\.).+`];
const SCRIPT_ALLOWED = [...ALLOWED, "node:.+", String.raw`\.\./src/(?!.*\.\.).+`];
const TEST_ALLOWED = [...ALLOWED, "vitest"];
const onlyAllowed = (list) => `^(?!(${list.join("|")})$)`;

export default defineConfig([
  // The build's output, checked through its source; and scratch files
  // and logs (scripts/check.sh), which never ship or get committed.
  globalIgnores(["dist/", ".logs/"]),
  tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  { settings: { react: { version: "detect" } } },
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    // Everything but this file, which imports the lint tooling.
    ignores: ["eslint.config.mjs"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: onlyAllowed(ALLOWED), message: IMPORT_MESSAGE }] },
      ],
    },
  },
  {
    // The schema generator runs in plain Node and reads the source.
    files: ["scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: onlyAllowed(SCRIPT_ALLOWED),
              message: "Scripts may also import node: modules and ../src/….",
            },
          ],
        },
      ],
    },
  },
  {
    // Tests run under vitest and never ship.
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: onlyAllowed(TEST_ALLOWED), message: "Tests may also import vitest." }] },
      ],
    },
  },
]);
