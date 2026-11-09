import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { slot, tabTo } from "./helpers.ts";

// axe-core on the panel only (not the playground's controls), against
// WCAG 2.2 A and AA, in every example, both themes, both layouts. A
// tooltip is display: none until shown, so axe checks one shown too, and
// the open job menu.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// An empty slot's square is dimmed on purpose (its glyph is below 4.5:1 in
// the document theme). WCAG 1.4.3 exempts text in an inactive component:
// the slot has no action, isn't focusable, and the square is aria-hidden.
// Its name and "(empty)" are still checked.
const EXEMPT = ".cs-slot--empty .cs-slot__square";

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).include(".cs").exclude(EXEMPT).withTags(WCAG).analyze();
  // Rule id, help text and the offending elements, for a readable failure.
  const summary = violations.map((v) => ({ rule: v.id, help: v.help, nodes: v.nodes.map((n) => n.target) }));
  expect(summary).toEqual([]);
}

for (const fixture of ["full", "minimal", "edge-cases"]) {
  for (const theme of ["document", "game"]) {
    for (const width of ["", "22"]) {
      const layout = width ? "narrow" : "wide";
      test(`no axe violations: ${fixture}, ${theme}, ${layout}`, async ({ page }) => {
        await page.goto(`/?fixture=${fixture}&theme=${theme}&width=${width}`);
        await expect(page.locator(".cs")).toBeVisible();
        await expectNoViolations(page);
      });
    }
  }
}

for (const theme of ["document", "game"]) {
  test(`no axe violations with a tooltip shown and the job menu open (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=full&theme=${theme}`);
    await page.locator(".cs__jobs-toggle").click();
    await tabTo(page, slot(page, "Skills"));
    await expectNoViolations(page);
  });
}

test("no axe violations on dark host tokens (document theme)", async ({ page }) => {
  await page.goto("/?fixture=full&tokens=dark");
  await page.locator(".cs__jobs-toggle").click();
  await tabTo(page, slot(page, "Skills"));
  await expectNoViolations(page);
});
