import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { slot, tabTo } from "./helpers.ts";

// axe-core on the panel only (not the playground's controls), against
// WCAG 2.2 A and AA, in every example, both themes, both layouts. A
// tooltip is display: none until shown, so axe checks one shown too, and
// the open job menu.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const found = (await new AxeBuilder({ page }).include(".cs").withTags(WCAG).analyze()).violations;
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
        expect(await violations(page)).toEqual([]);
      });
    }
  }
}

for (const theme of ["document", "game"]) {
  test(`no axe violations with a tooltip shown and the job menu open (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=full&theme=${theme}`);
    await page.locator(".cs__jobs-toggle").click();
    await tabTo(page, slot(page, "Skills"));
    expect(await violations(page)).toEqual([]);
  });
}

test("no axe violations on dark host tokens (document theme)", async ({ page }) => {
  await page.goto("/?fixture=full&tokens=dark");
  await page.locator(".cs__jobs-toggle").click();
  await tabTo(page, slot(page, "Skills"));
  expect(await violations(page)).toEqual([]);
});

// At full width an empty slot's glyph is the only visible text naming it,
// and it was once dimmed below 4.5:1 (--cs-rule-strong); the document-theme
// runs above cover it, this one names it.
for (const tokens of ["", "dark"]) {
  test(`empty slots' glyphs meet contrast (document${tokens ? ", dark host tokens" : ""})`, async ({ page }) => {
    await page.goto(`/?fixture=full${tokens ? `&tokens=${tokens}` : ""}`);
    const squares = page.locator(".cs .cs-slot--empty .cs-slot__square");
    expect(await squares.count()).toBeGreaterThan(0);
    const { violations: found } = await new AxeBuilder({ page })
      .include(".cs .cs-slot--empty .cs-slot__square")
      .withRules(["color-contrast"])
      .analyze();
    expect(found.map((v) => v.nodes.map((n) => n.target))).toEqual([]);
  });
}

// axe can't measure text over the game theme's gradient (it reports those
// squares incomplete, not passed), so pin the glyph to its label's colour,
// --cs-muted, which clears 4.5:1 in both themes.
for (const theme of ["document", "game"]) {
  test(`an empty slot's glyph has its label's colour (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=full&theme=${theme}`);
    const empty = page.locator(".cs .cs-slot--empty").first();
    const color = (selector: string) =>
      empty.locator(selector).evaluate((el) => getComputedStyle(el).color);
    expect(await color(".cs-slot__square")).toBe(await color(".cs-slot__label"));
  });
}
