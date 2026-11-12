import { defineConfig } from "vitest/config";

// `npm test` runs these with coverage on (`vitest run --coverage`), so CI
// and scripts/check.sh fail when coverage drops below the thresholds;
// `npx vitest` watches without it. The playground has its own Vite config
// (playground/vite.config.ts) and isn't tested.
export default defineConfig({
  test: {
    // Only the package's own tests: not copies of them in .claude/worktrees/
    // or scratch files in .logs/.
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Every source file, including any no test imports yet.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}"],
      // Gitignored and lint-ignored, like the check logs; open
      // .logs/coverage/index.html for the line-by-line report.
      reportsDirectory: ".logs/coverage",
      reporter: ["text", "html"],
      // Just under the current numbers (raised 2026-11-12 with the window's
      // config). Raise them when coverage goes up; lowering one is a
      // decision for review. SlotHover.tsx is the gap: its handlers only run
      // in a browser.
      thresholds: { statements: 96, branches: 96, functions: 93, lines: 97 },
    },
  },
});
