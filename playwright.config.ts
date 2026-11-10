import { defineConfig, devices } from "@playwright/test";

// `npm run test:browser`: the browser tests in browser/, against the
// playground's dev server (`npm run dev`), which Playwright starts on its
// own port. They cover what the server-render tests in src/ can't: hover,
// keyboard focus, Escape, focus rings, the container query, and axe.
// CI runs them in the `browser` job (.github/workflows/ci.yml).
// The tsconfig has no Node types (src/ must not lean on them).
declare const process: { env: Record<string, string | undefined> };

const PORT = 5199;
const DEMO_PORT = 5200;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "browser",
  // Gitignored and lint-ignored, like the check logs; the report opens with
  // `npx playwright show-report .logs/playwright-report`.
  outputDir: ".logs/playwright-results",
  reporter: [[CI ? "github" : "list"], ["html", { outputFolder: ".logs/playwright-report", open: "never" }]],
  forbidOnly: CI,
  // No retries: a flaky browser test is a bug to fix, not to hide.
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Chromium only for now; Firefox and WebKit are one line each here and an
  // install step in CI.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Never reuse a server already on a port: it could be another worktree's,
  // serving another branch's src/. A busy port fails (--strictPort) instead.
  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
    },
    // The demo site as GitHub Pages serves it: built, under its base path
    // (browser/demo.spec.ts).
    {
      command: `npm run build:demo && vite preview playground --base /wol-character-panel/ --port ${DEMO_PORT} --strictPort`,
      url: `http://localhost:${DEMO_PORT}/wol-character-panel/`,
      reuseExistingServer: false,
    },
  ],
});
