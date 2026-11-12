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
    let left = false;
    // The playground's controls come first; this bound only stops a runaway.
    for (let i = 0; i < 100 && !left; i++) {
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
        left = entered;
        continue;
      }
      entered = true;
      seen.push(focused.name);
      expect(focused.outline, `${focused.name} has an outline`).not.toBe("none");
      expect(focused.width, `${focused.name} outline width`).toBeGreaterThanOrEqual(2);
    }
    // Tab walked through the whole panel and out, reaching every link, the
    // menu toggle, and every tooltip-only slot.
    expect(left, "Tab left the panel").toBe(true);
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

test("in a window, the slot layout follows the equipment pane, not the window", async ({ page }) => {
  // No component draws the window yet, so build its shape around the
  // panel: the root gets cs--window (its container renamed cs-window) and
  // the header and body go into a .cs__equipment wrapper (the cs container).
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/?fixture=full");
  await page.locator(".cs").evaluate((root: HTMLElement) => {
    root.classList.add("cs--window");
    root.style.maxWidth = "60rem";
    const pane = document.createElement("div");
    pane.className = "cs__equipment";
    pane.style.width = "22rem";
    pane.append(root.querySelector(".cs__header")!, root.querySelector(".cs__body")!);
    root.append(pane);
  });
  // A 60rem window with a 22rem pane: the pane's narrow layout.
  expect((await box(page, ".cs")).width).toBeGreaterThan(26 * 16);
  let portrait = await box(page, ".cs__portrait");
  let left = await box(page, ".cs__slots--left");
  expect(portrait.y + portrait.height).toBeLessThanOrEqual(left.y);

  // The pane at 30rem: the wide layout again.
  await page.locator(".cs__equipment").evaluate((pane: HTMLElement) => (pane.style.width = "30rem"));
  left = await box(page, ".cs__slots--left");
  portrait = await box(page, ".cs__portrait");
  expect(left.x + left.width).toBeLessThanOrEqual(portrait.x);
});

test("a cs--window root is not the cs container", async ({ page }) => {
  // At 22rem the root alone would get the narrow layout; renamed cs-window,
  // with no pane wrapper, the narrow rules don't apply.
  await page.goto("/?fixture=full&width=22");
  await page.locator(".cs").evaluate((root: HTMLElement) => root.classList.add("cs--window"));
  const left = await box(page, ".cs__slots--left");
  const portrait = await box(page, ".cs__portrait");
  expect(left.x + left.width).toBeLessThanOrEqual(portrait.x);
});

// One line: its height is under one and a half line heights. Needs a
// numeric line-height on the element (`normal` would give NaN and fail).
async function oneLine(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return el.getBoundingClientRect().height < lineHeight * 1.5;
  });
}

// At the limits (edge-cases), the long title wraps beside the job menu's
// toggle rather than squeezing it onto two lines.
for (const theme of ["document", "game"]) {
  for (const [layout, width] of [
    ["wide", ""],
    ["narrow", "&width=22"],
  ]) {
    test(`at the limits, "Change job" stays on one line (${theme}, ${layout})`, async ({ page }) => {
      await page.goto(`/?fixture=edge-cases&theme=${theme}${width}`);
      expect(await oneLine(page, ".cs__jobs-toggle"), "the toggle").toBe(true);
      expect(await page.locator(".cs").evaluate((el) => el.scrollWidth <= el.clientWidth), "no sideways overflow").toBe(
        true,
      );
    });
  }

  test(`a title with no break in it wraps before the toggle (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=full&theme=${theme}&width=22`);
    // The longest title the schema allows, as one word (a URL, a handle).
    const { textRight, toggleLeft } = await page.locator(".cs__bar").evaluate((bar) => {
      const title = bar.querySelector(".cs__bar-title")!;
      title.textContent = "x".repeat(60);
      const text = document.createRange();
      text.selectNodeContents(title);
      return {
        textRight: text.getBoundingClientRect().right,
        toggleLeft: bar.querySelector(".cs__jobs-toggle")!.getBoundingClientRect().left,
      };
    });
    expect(textRight).toBeLessThanOrEqual(toggleLeft);
    expect(await oneLine(page, ".cs__jobs-toggle"), "the toggle").toBe(true);
  });
}
