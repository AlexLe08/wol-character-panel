import { expect, test, type Locator, type Page } from "@playwright/test";
import { pointerAway, slot, tabTo, tooltipOf } from "./helpers.ts";

// Focus rings on everything focusable, and the container query's two
// layouts.

for (const theme of ["document", "game"]) {
  test(`every focusable element in the panel shows a focus ring (${theme})`, async ({ page }) => {
    await page.goto(`/?view=equipment&fixture=full&theme=${theme}`);
    // Open the job menu so its links are in the tab order too, without
    // moving focus: the walk starts from the top of the page.
    await page.locator(".cs__jobs-list").evaluate((list: HTMLElement) => list.showPopover());
    const focusable = await page.locator(".cs").locator("a, button, [tabindex='0']").count();

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
  await page.goto("/?view=equipment&fixture=full");
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
  await page.goto("/?view=equipment&fixture=full&width=22");
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
  await page.goto("/?view=equipment&fixture=full&width=22");
  const portrait = await box(page, ".cs__portrait");
  const left = await box(page, ".cs__slots--left");
  expect(portrait.y + portrait.height).toBeLessThanOrEqual(left.y);
});

test("in a window, the slot layout follows the equipment pane, not the window", async ({ page }) => {
  // No component draws the window yet, so build its shape around the
  // panel: the root gets cs--window (its container renamed cs-window) and
  // the header and body go into a .cs__equipment wrapper (the cs container).
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/?view=equipment&fixture=full");
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
  await page.goto("/?view=equipment&fixture=full&width=22");
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
      await page.goto(`/?view=equipment&fixture=edge-cases&theme=${theme}${width}`);
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
    await page.goto(`/?view=equipment&fixture=edge-cases&theme=${theme}&width=22`);
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
  await page.goto("/?view=equipment&fixture=full");
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
    await page.goto(`/?view=equipment&fixture=edge-cases&theme=${theme}&width=18`);
    const { label, column } = await page.locator(".cs__job").evaluate((job) => {
      const text = document.createRange();
      text.selectNodeContents(job.querySelector(".cs__level-label")!);
      return { label: text.getBoundingClientRect().toJSON(), column: job.getBoundingClientRect().toJSON() };
    });
    expect(label.right).toBeLessThanOrEqual(column.right + 0.5);
    if (theme === "document") expect(await oneLine(page, ".cs__level-label")).toBe(true);
  });
}

// In the narrow layout every slot's tooltip stays inside the panel: the
// first column's opens from its left edge, the last column's from its
// right, the middle one's centred on it. On a phone-sized viewport the
// panel is the page's width, so one that spilled out scrolled the page.
for (const theme of ["document", "game"]) {
  for (const [name, url, viewport] of [
    ["22rem", "view=equipment&width=22", null],
    ["18rem", "view=equipment&width=18", null],
    ["390px viewport", "view=window", { width: 390, height: 844 }],
    ["320px viewport", "view=window", { width: 320, height: 800 }],
  ] as const) {
    test(`narrow: every slot's tooltip stays inside the panel (${theme}, ${name})`, async ({ page }) => {
      if (viewport) await page.setViewportSize(viewport);
      await page.goto(`/?${url}&fixture=full&theme=${theme}`);
      // In the window the panel is its equipment pane.
      const panel = await box(page, viewport ? ".cs__equipment" : ".cs");
      // The header's slots too; empty slots have no tooltip.
      const faces = page.locator(".cs-slot__face[aria-describedby]");
      expect(await faces.count()).toBeGreaterThan(3);
      for (const face of await faces.all()) {
        await pointerAway(page);
        await face.hover();
        const tip = await tooltipOf(face);
        await expect(tip).toBeVisible();
        const found = (await tip.boundingBox())!;
        const label = await face.locator(".cs-slot__label").textContent();
        expect(found.x, `${label}: left edge`).toBeGreaterThanOrEqual(panel.x);
        expect(found.x + found.width, `${label}: right edge`).toBeLessThanOrEqual(panel.x + panel.width);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${label}: the page doesn't scroll sideways`).toBeLessThanOrEqual(0);
      }
    });
  }
}

// The open job menu's list stays inside the panel, even at the limits on a
// narrow one, where it opens from a toggle two buttons into the row.
for (const theme of ["document", "game"]) {
  for (const width of ["", "22", "18"]) {
    test(`the open job menu stays inside the panel (${theme}, ${width || "wide"})`, async ({ page }) => {
      await page.goto(`/?view=equipment&fixture=edge-cases&theme=${theme}${width && `&width=${width}`}`);
      await page.locator(".cs__jobs-toggle").click();
      const list = await box(page, ".cs__jobs-list");
      const panel = await box(page, ".cs");
      expect(list.x).toBeGreaterThanOrEqual(panel.x);
      expect(list.x + list.width).toBeLessThanOrEqual(panel.x + panel.width);
    });
  }
}

// The list is a popover in the top layer, placed by anchor positioning
// where the <details> list was: below the gear-set row, from its left
// padding. Were the anchor lost, it would sit centred on the screen.
for (const theme of ["document", "game"]) {
  for (const width of ["", "18"]) {
    test(`the open job menu opens below the gear-set row, from its padding (${theme}, ${width || "wide"})`, async ({
      page,
    }) => {
      await page.goto(`/?view=equipment&fixture=full&theme=${theme}${width && `&width=${width}`}`);
      await page.locator(".cs__jobs-toggle").click();
      const list = await box(page, ".cs__jobs-list");
      const row = await box(page, ".cs__gear");
      expect(list.x - row.x).toBeCloseTo(12, 0);
      expect(list.y - (row.y + row.height)).toBeCloseTo(4.6, 0);
    });
  }
}

// A browser without anchor positioning skips the @supports block, so here
// it is taken out of the stylesheet: the list falls back to the popover's
// own place, centred on the screen (the panel's margin reset on ul must
// not pin it to the top-left corner).
test("without anchor positioning, the open job menu is centred on the screen", async ({ page }) => {
  await page.goto("/?view=equipment&fixture=full");
  const removed = await page.evaluate(() => {
    let count = 0;
    for (const sheet of document.styleSheets) {
      const rules = sheet.cssRules;
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (rule instanceof CSSSupportsRule && rule.conditionText.includes("anchor(bottom)")) {
          sheet.deleteRule(i);
          count++;
        }
      }
    }
    return count;
  });
  expect(removed, "the anchor positioning block was found").toBe(1);
  await page.locator(".cs__jobs-toggle").click();
  const list = await box(page, ".cs__jobs-list");
  const viewport = page.viewportSize()!;
  expect(Math.abs(list.x + list.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(list.y + list.height / 2 - viewport.height / 2)).toBeLessThan(2);
});

// Escape, a click outside and the toggle close the list (the Popover API,
// no script of ours). An open list covers the slots below it, and Tab
// moves on past it, so Escape has to work from wherever focus is: WCAG
// 2.4.11 asks that a focused item hidden by content the user opened can
// be revealed without going back to that content.
test.describe("the job menu closes", () => {
  const list = (page: Page) => page.locator(".cs__jobs-list");
  const toggle = (page: Page) => page.locator(".cs__jobs-toggle");

  // Whether any of the element's corners or its centre is under the list.
  const covered = (face: Locator) =>
    face.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const points = [
        [r.left + 2, r.top + 2],
        [r.right - 2, r.top + 2],
        [r.left + 2, r.bottom - 2],
        [r.right - 2, r.bottom - 2],
        [r.left + r.width / 2, r.top + r.height / 2],
      ];
      return points.some(([x, y]) => document.elementFromPoint(x, y)?.closest(".cs__jobs-list"));
    });

  test("on Escape with focus on a slot the list covers, after the slot's tooltip", async ({ page }) => {
    await page.goto("/?view=equipment&fixture=full");
    await toggle(page).focus();
    await page.keyboard.press("Enter");
    await expect(list(page)).toBeVisible();
    const stack = slot(page, "Core stack");
    await tabTo(page, stack);
    await expect(list(page), "Tab moves on and leaves the list open").toBeVisible();
    expect(await covered(stack), "the focused slot is under the list").toBe(true);

    // The first Escape is spent on the slot's own tooltip, as everywhere.
    const tip = await tooltipOf(stack);
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await expect(list(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(list(page)).toBeHidden();
    await expect(stack, "focus stays where it was").toBeFocused();
    expect(await covered(stack)).toBe(false);
  });

  test("on Escape inside it, focus going back to the toggle", async ({ page }) => {
    await page.goto("/?view=equipment&fixture=full");
    await toggle(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /Front end/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(list(page)).toBeHidden();
    await expect(toggle(page)).toBeFocused();
  });

  test("on a click outside it, or on the toggle", async ({ page }) => {
    await page.goto("/?view=equipment&fixture=full");
    await toggle(page).click();
    await expect(list(page)).toBeVisible();
    await page.locator(".cs__bar").click();
    await expect(list(page)).toBeHidden();

    await toggle(page).click();
    await expect(list(page)).toBeVisible();
    await toggle(page).click();
    await expect(list(page)).toBeHidden();
  });
});
