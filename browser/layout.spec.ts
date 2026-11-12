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

// At the limits (edge-cases), the gear-set row's buttons keep their square
// size beside a long caption, and nothing pushes the panel sideways. (In
// 1.x the job menu was a text toggle in the bar, which this replaced.)
for (const theme of ["document", "game"]) {
  for (const [layout, width] of [
    ["wide", ""],
    ["narrow", "&width=22"],
  ]) {
    test(`at the limits, the gear-set buttons stay square (${theme}, ${layout})`, async ({ page }) => {
      await page.goto(`/?fixture=edge-cases&theme=${theme}${width}`);
      const sizes = await page
        .locator(".cs__gear-button")
        .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON()));
      expect(sizes.length).toBeGreaterThan(1);
      for (const size of sizes) {
        expect(size.width).toBeCloseTo(32, 0);
        expect(size.height).toBeCloseTo(32, 0);
      }
      expect(await page.locator(".cs").evaluate((el) => el.scrollWidth <= el.clientWidth), "no sideways overflow").toBe(
        true,
      );
    });
  }

  test(`a title with no break in it wraps before the character name (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=edge-cases&theme=${theme}&width=22`);
    // The longest title the schema allows, as one word (a URL, a handle).
    const { textRight, nameLeft } = await page.locator(".cs__bar").evaluate((bar) => {
      const title = bar.querySelector(".cs__bar-title")!;
      title.textContent = "x".repeat(60);
      const text = document.createRange();
      text.selectNodeContents(title);
      return {
        textRight: text.getBoundingClientRect().right,
        nameLeft: bar.querySelector(".cs__bar-name")!.getBoundingClientRect().left,
      };
    });
    expect(textRight).toBeLessThanOrEqual(nameLeft);
  });
}

// The job menu sits in the gear-set row, above the job header, in both
// layouts; the bar has none.
test("the job menu is in the gear-set row, not the bar", async ({ page }) => {
  await page.goto("/?fixture=full");
  await expect(page.locator(".cs__bar .cs__jobs")).toHaveCount(0);
  const toggle = page.locator(".cs__gear .cs__jobs-toggle");
  await expect(toggle).toHaveAccessibleName("Change job");
  const menu = await box(page, ".cs__gear");
  const header = await box(page, ".cs__header");
  expect(menu.y + menu.height).toBeLessThanOrEqual(header.y);
});

// LIMITS.job.levelLabel was tightened for 2.0.0 to what fits at 18rem (a
// 320px phone less its gutters): one line in the document theme, and inside
// the job column, wrapping, in the game theme's wider capitals.
for (const theme of ["document", "game"]) {
  test(`at 18rem, a level label at the limit stays inside the job column (${theme})`, async ({ page }) => {
    await page.goto(`/?fixture=edge-cases&theme=${theme}&width=18`);
    const { label, column } = await page.locator(".cs__job").evaluate((job) => {
      const text = document.createRange();
      text.selectNodeContents(job.querySelector(".cs__level-label")!);
      return { label: text.getBoundingClientRect().toJSON(), column: job.getBoundingClientRect().toJSON() };
    });
    expect(label.right).toBeLessThanOrEqual(column.right + 0.5);
    if (theme === "document") expect(await oneLine(page, ".cs__level-label")).toBe(true);
  });
}

// The open job menu's list stays inside the panel, even at the limits on a
// narrow one, where it opens from a toggle two buttons into the row.
for (const theme of ["document", "game"]) {
  for (const width of ["", "22", "18"]) {
    test(`the open job menu stays inside the panel (${theme}, ${width || "wide"})`, async ({ page }) => {
      await page.goto(`/?fixture=edge-cases&theme=${theme}${width && `&width=${width}`}`);
      await page.locator(".cs__jobs-toggle").click();
      const list = await box(page, ".cs__jobs-list");
      const panel = await box(page, ".cs");
      expect(list.x).toBeGreaterThanOrEqual(panel.x);
      expect(list.x + list.width).toBeLessThanOrEqual(panel.x + panel.width);
    });
  }
}
