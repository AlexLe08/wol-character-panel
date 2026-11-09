import { expect, test, type Page } from "@playwright/test";
import { slot } from "./helpers.ts";

// Focus rings on everything focusable, and the container query's two
// layouts.

for (const theme of ["document", "game"]) {
  test(`every focusable element in the panel shows a focus ring (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=full&theme=${theme}`);
    // Open the job menu so its links are in the tab order too, without
    // moving focus: the walk starts from the top of the page.
    await page.locator(".cs__jobs").evaluate((details: HTMLDetailsElement) => (details.open = true));
    const focusable = await page.locator(".cs").locator("a, summary, [tabindex='0']").count();

    const seen: string[] = [];
    let entered = false;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el?.closest(".cs")) return null;
        const style = getComputedStyle(el);
        return {
          name: `${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 30)}"`,
          outline: style.outlineStyle,
          width: parseFloat(style.outlineWidth),
        };
      });
      if (!focused) {
        if (entered) break; // left the panel
        continue;
      }
      entered = true;
      seen.push(focused.name);
      expect(focused.outline, `${focused.name} has an outline`).not.toBe("none");
      expect(focused.width, `${focused.name} outline width`).toBeGreaterThanOrEqual(2);
    }
    // Tab reached every link, the menu toggle, and every tooltip-only slot.
    expect(focusable).toBeGreaterThan(0);
    expect(seen).toHaveLength(focusable);
  });
}

async function box(page: Page, selector: string) {
  const found = await page.locator(selector).first().boundingBox();
  expect(found, `${selector} is laid out`).not.toBeNull();
  return found!;
}

test("wide: the portrait sits between the columns, slot names hidden", async ({ page }) => {
  await page.goto("/?fixture=full");
  const left = await box(page, ".cs__slots--left");
  const portrait = await box(page, ".cs__portrait");
  const right = await box(page, ".cs__slots--right");
  expect(left.x + left.width).toBeLessThanOrEqual(portrait.x);
  expect(portrait.x + portrait.width).toBeLessThanOrEqual(right.x);

  // Visually hidden, but still the link's accessible name.
  const label = page.locator(".cs__slots--left .cs-slot__label").first();
  expect((await label.boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(slot(page, "Skills")).toHaveAccessibleName("Skills");
});

test("narrow (below 26rem): portrait on top, slots in rows of three with names", async ({ page }) => {
  await page.goto("/?fixture=full&width=22");
  const portrait = await box(page, ".cs__portrait");
  const left = await box(page, ".cs__slots--left");
  expect(portrait.y + portrait.height).toBeLessThanOrEqual(left.y);

  const squares = page.locator(".cs__slots--left .cs-slot");
  const tops = await squares.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  expect(tops.slice(0, 3).every((top) => top === tops[0])).toBe(true);
  expect(tops[3]).toBeGreaterThan(tops[0]);

  const label = page.locator(".cs__slots--left .cs-slot__label").first();
  await expect(label).toBeVisible();
  expect((await label.boundingBox())!.width).toBeGreaterThan(1);
});

test("the layout follows the container, not the viewport", async ({ page }) => {
  // A wide viewport with a narrow container still gets the narrow layout.
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/?fixture=full&width=22");
  const portrait = await box(page, ".cs__portrait");
  const left = await box(page, ".cs__slots--left");
  expect(portrait.y + portrait.height).toBeLessThanOrEqual(left.y);
});
