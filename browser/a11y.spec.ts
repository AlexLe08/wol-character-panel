import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { slot, tabTo } from "./helpers.ts";

// axe-core on the panel only (not the playground's controls), against
// WCAG 2.2 A and AA, in every example, both themes, both layouts. A
// tooltip is display: none until shown, so axe checks one shown too, and
// the open job menu.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Known failure, pending the owner's call: in the document theme an empty
// slot's glyph (--cs-rule-strong) is below 4.5:1, and at full width it's
// the only visible text naming the slot. Only color-contrast, only on those
// squares, only in that theme, is set aside here; the test at the bottom
// expects it to fail, and starts passing (so failing) once it's fixed.
const EMPTY_SQUARE = ".cs-slot--empty .cs-slot__square";

async function violations(page: Page, theme: string, { skipKnown = true } = {}) {
  const panel = () => new AxeBuilder({ page }).include(".cs").withTags(WCAG);
  const empty = await page.locator(`.cs ${EMPTY_SQUARE}`).count();
  let found;
  if (theme === "document" && skipKnown && empty > 0) {
    // Everything but the empty squares, then those with every rule but contrast.
    const rest = await panel().exclude(EMPTY_SQUARE).analyze();
    const squares = await new AxeBuilder({ page })
      .include(`.cs ${EMPTY_SQUARE}`)
      .withTags(WCAG)
      .disableRules(["color-contrast"])
      .analyze();
    found = [...rest.violations, ...squares.violations];
  } else {
    found = (await panel().analyze()).violations;
  }
  // Rule id, help text and the offending elements, for a readable failure.
  return found.map((v) => ({ rule: v.id, help: v.help, nodes: v.nodes.map((n) => n.target) }));
}

for (const fixture of ["full", "minimal", "edge-cases"]) {
  for (const theme of ["document", "game"]) {
    for (const width of ["", "22"]) {
      const layout = width ? "narrow" : "wide";
      test(`no axe violations: ${fixture}, ${theme}, ${layout}`, async ({ page }) => {
        await page.goto(`/?fixture=${fixture}&theme=${theme}&width=${width}`);
        await expect(page.locator(".cs")).toBeVisible();
        expect(await violations(page, theme)).toEqual([]);
      });
    }
  }
}

for (const theme of ["document", "game"]) {
  test(`no axe violations with a tooltip shown and the job menu open (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=full&theme=${theme}`);
    await page.locator(".cs__jobs-toggle").click();
    await tabTo(page, slot(page, "Skills"));
    expect(await violations(page, theme)).toEqual([]);
  });
}

test("no axe violations on dark host tokens (document theme)", async ({ page }) => {
  await page.goto("/?fixture=full&tokens=dark");
  await page.locator(".cs__jobs-toggle").click();
  await tabTo(page, slot(page, "Skills"));
  expect(await violations(page, "document")).toEqual([]);
});

test("empty slots' glyphs meet contrast in the document theme", async ({ page }) => {
  test.fail(true, "Known: --cs-rule-strong glyphs are below 4.5:1; see EMPTY_SQUARE above");
  await page.goto("/?fixture=full");
  expect(await violations(page, "document", { skipKnown: false })).toEqual([]);
});
