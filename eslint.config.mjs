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
const TEST_ALLOWED = [...ALLOWED, "vitest", "react-dom/server"];
const PLAYGROUND_ALLOWED = [
  ...ALLOWED,
  "react-dom/client",
  "react-dom/server",
  "vite",
  "@vitejs/plugin-react",
  String.raw`\.\./src/(?!.*\.\.).+`,
];
// The smoke test's consumers run inside a throwaway project with the packed
// tarball installed: the package by name, never ../src. react.mjs loads
// its imports with import() (after registering a CSS hook), which this rule
// doesn't see; they're listed for when they're static.
const SMOKE_ALLOWED = [
  "node:.+",
  String.raw`@solution-nine/wol-character-panel(/.+)?`,
  "react",
  "react-dom/server",
  String.raw`(react|zod)/package\.json`,
];
const BROWSER_TEST_ALLOWED = ["@playwright/test", "@axe-core/playwright", String.raw`\./(?!.*\.\.).+`];
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
    // The playground's screenshots (the `preview` skill) drive Chromium
    // through Playwright; the other scripts stay plain Node.
    files: ["scripts/preview.mjs"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: onlyAllowed(["node:.+", "@playwright/test"]),
              message: "The preview script imports only node: modules and @playwright/test.",
            },
          ],
        },
      ],
    },
  },
  {
    // scripts/smoke-pack.mjs copies these into a project that installs the
    // packed tarball, so they import the package the way a host does.
    files: ["scripts/smoke/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: onlyAllowed(SMOKE_ALLOWED),
              message: "Smoke test consumers import the package by name, its peers and node: modules.",
            },
          ],
        },
      ],
    },
  },
  {
    // The test runner's config.
    files: ["vitest.config.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: onlyAllowed(["vitest/config"]), message: "Only vitest/config." }] },
      ],
    },
  },
  {
    // The dev preview (`npm run dev`) runs under Vite, renders the panel
    // from ../src, and never ships.
    files: ["playground/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: onlyAllowed(PLAYGROUND_ALLOWED),
              message: "The playground may also import react-dom/client, react-dom/server, Vite and ../src/….",
            },
          ],
        },
      ],
    },
  },
  {
    // The browser tests (`npm run test:browser`) drive the playground in
    // Playwright: they reach the panel through the page, never ../src.
    files: ["browser/**", "playwright.config.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: onlyAllowed(BROWSER_TEST_ALLOWED),
              message: "Browser tests import only @playwright/test, @axe-core/playwright and each other.",
            },
          ],
        },
      ],
    },
  },
  {
    // Tests run under vitest and never ship; the render tests use
    // react-dom/server.
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { regex: onlyAllowed(TEST_ALLOWED), message: "Tests may also import vitest and react-dom/server." },
          ],
        },
      ],
    },
  },
]);
