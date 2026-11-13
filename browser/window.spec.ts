import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pointerAway, tabTo, tooltipOf } from "./helpers.ts";

// CharacterWindow in the playground (view=window): tab and sub-tab links,
// row tooltips, focus rings, the two layouts, and axe on every tab.

const windowUrl = (query = "") => `/?view=window&fixture=full${query}`;

async function box(page: Page, selector: string) {
  const found = await page.locator(selector).first().boundingBox();
  expect(found, `${selector} is laid out`).not.toBeNull();
  return found!;
}

// A block row's focusable face (a row with a tooltip), named by its label.
const row = (page: Page, label: string) =>
  page.locator(".cs__content [role='group'][tabindex='0']").filter({ hasText: label });

test.describe("tabs", () => {
  test("a tab link shows its tab, and the strip marks it current", async ({ page }) => {
    await page.goto(windowUrl());
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    await expect(tabs.getByRole("link", { name: "Attributes" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".cs__content")).toContainText("Years");

    await tabs.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/[?&]tab=profile/);
    await expect(tabs.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    await expect(tabs.getByRole("link", { name: "Attributes" })).not.toHaveAttribute("aria-current", "page");
    await expect(page.locator(".cs__content")).toContainText("Remote");
    await expect(page.locator(".cs__content")).not.toContainText("Years");

    // Back to the first tab: its URL has no tab parameter.
    await tabs.getByRole("link", { name: "Attributes" }).click();
    await expect(page).not.toHaveURL(/[?&]tab=/);
  });

  test("sub-tabs switch the page, and switching tab drops it", async ({ page }) => {
    await page.goto(windowUrl("&tab=skills"));
    const pages = page.getByRole("navigation", { name: "Skills" });
    await expect(pages.getByRole("link", { name: "Build" })).toHaveAttribute("aria-current", "page");
    await pages.getByRole("link", { name: "Run" }).click();
    await expect(page).toHaveURL(/[?&]page=run/);
    await expect(pages.getByRole("link", { name: "Run" })).toHaveAttribute("aria-current", "page");
    // The tab's own link goes to its first page: current as the tab, not the page.
    const skills = page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Skills" });
    await expect(skills).toHaveAttribute("aria-current", "true");

    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/[?&]tab=profile/);
    await expect(page).not.toHaveURL(/[?&]page=/);
  });

  test("changing job keeps the tab and page, and changing tab keeps the job", async ({ page }) => {
    await page.goto(windowUrl("&tab=skills&page=run"));
    await page.locator(".cs__jobs-toggle").click();
    await page.getByRole("link", { name: /Healthcare/ }).click();
    await expect(page).toHaveURL(/[?&]job=healthcare/);
    await expect(page).toHaveURL(/[?&]tab=skills/);
    await expect(page).toHaveURL(/[?&]page=run/);

    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/[?&]job=healthcare/);
    await expect(page).toHaveURL(/[?&]tab=profile/);
  });

  test("a job's block replaces the shared one", async ({ page }) => {
    await page.goto(windowUrl());
    const vitals = page.locator(".cs-block--gauges");
    const before = await vitals.innerText();
    await page.goto(windowUrl("&job=healthcare"));
    expect(await vitals.innerText()).not.toBe(before);
  });
});

test.describe("row tooltips", () => {
  test("hover shows a row's tooltip, and leaving hides it", async ({ page }) => {
    await page.goto(windowUrl());
    const frontEnd = row(page, "Front end");
    const tip = await tooltipOf(frontEnd);
    await expect(tip).toBeHidden();
    await frontEnd.hover();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Component libraries");
    await pointerAway(page);
    await expect(tip).toBeHidden();
  });

  test("keyboard focus shows it, and Escape hides it without moving focus", async ({ page }) => {
    await page.goto(windowUrl());
    const frontEnd = row(page, "Front end");
    const tip = await tooltipOf(frontEnd);
    await tabTo(page, frontEnd);
    await expect(frontEnd).toHaveAccessibleName("Front end 92");
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await expect(frontEnd).toBeFocused();
  });

  test("Escape hides a hovered row's tooltip", async ({ page }) => {
    await page.goto(windowUrl());
    const frontEnd = row(page, "Front end");
    const tip = await tooltipOf(frontEnd);
    await frontEnd.hover();
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
  });

  test("rows without a tooltip take no Tab stop", async ({ page }) => {
    await page.goto(windowUrl());
    await expect(page.locator(".cs-stat__face", { hasText: "Back end" })).not.toHaveAttribute("tabindex");
  });

  test.describe("on a touch screen", () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 } });

    test("a tap shows a tooltip-only row's tooltip, and a tap elsewhere hides it", async ({ page }) => {
      await page.goto(windowUrl());
      expect(await page.evaluate(() => matchMedia("(hover: none)").matches)).toBe(true);
      const frontEnd = row(page, "Front end");
      const tip = await tooltipOf(frontEnd);
      await frontEnd.tap();
      await expect(tip).toBeVisible();
      await page.locator(".pg-header").tap();
      await expect(tip).toBeHidden();
    });
  });

  for (const width of ["", "22"]) {
    test(`a row's tooltip stays inside the window (${width ? "narrow" : "wide"})`, async ({ page }) => {
      await page.goto(windowUrl(width && `&width=${width}`));
      const frontEnd = row(page, "Front end");
      await frontEnd.hover();
      const tip = await box(page, ".cs__content .cs-tip >> visible=true");
      const root = await box(page, ".cs");
      expect(tip.x).toBeGreaterThanOrEqual(root.x);
      expect(tip.x + tip.width).toBeLessThanOrEqual(root.x + root.width);
    });
  }
});

test.describe("lists", () => {
  test("a level row's job action switches job, keeping the tab and page", async ({ page }) => {
    await page.goto(windowUrl("&tab=skills"));
    // Named by its text, in the order drawn, and the bar's number left out.
    const healthcare = page.getByRole("link", { name: "3 Healthcare work", exact: true });
    await expect(healthcare).not.toHaveAttribute("aria-current");
    await healthcare.click();
    await expect(page).toHaveURL(/[?&]job=healthcare/);
    await expect(page).toHaveURL(/[?&]tab=skills/);
    await expect(page.getByRole("link", { name: "3 Healthcare work", exact: true })).toHaveAttribute("aria-current", "true");
  });

  test("a level row's param action keeps the tab", async ({ page }) => {
    await page.goto(windowUrl("&tab=skills"));
    await page.getByRole("link", { name: "4 React", exact: true }).click();
    await expect(page).toHaveURL(/[?&]tab=skills/);
    await expect(page).toHaveURL(/[?&]stack=react/);
  });

  test("a linked row with a tooltip shows it on focus", async ({ page }) => {
    await page.goto(windowUrl("&tab=skills"));
    const healthcare = page.getByRole("link", { name: "3 Healthcare work", exact: true });
    const tip = await tooltipOf(healthcare);
    await tabTo(page, healthcare);
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Switches the panel to this job");
  });

  test("a run's stacks sit side by side, and stack in order when the pane is narrow", async ({ page }) => {
    await page.goto(windowUrl("&tab=skills"));
    let start = await box(page, ".cs-columns__stack--start");
    let end = await box(page, ".cs-columns__stack--end");
    expect(start.x + start.width).toBeLessThanOrEqual(end.x);
    expect(Math.abs(start.y - end.y)).toBeLessThan(1);

    await page.goto(windowUrl("&tab=skills&width=22"));
    start = await box(page, ".cs-columns__stack--start");
    end = await box(page, ".cs-columns__stack--end");
    expect(start.y + start.height).toBeLessThanOrEqual(end.y);
  });

  test("a collapsible group opens and closes by keyboard", async ({ page }) => {
    await page.goto(windowUrl("&tab=reputation"));
    const earlier = page.locator("summary", { hasText: "Earlier" });
    const row = page.locator(".cs-track", { hasText: "Study group" });
    await expect(row).toBeHidden();
    await tabTo(page, earlier);
    await page.keyboard.press("Enter");
    await expect(row).toBeVisible();
    await page.keyboard.press("Space");
    await expect(row).toBeHidden();
    // The open one starts open.
    await expect(page.locator(".cs-track", { hasText: "Docs fixes" })).toBeVisible();
  });
});

test.describe("detail windows", () => {
  const open = async (page: Page) => {
    await page.goto(windowUrl("&tab=profile"));
    const button = page.getByRole("button", { name: "All titles" });
    const dialog = page.getByRole("dialog", { name: "Titles" });
    await expect(dialog).toBeHidden();
    await button.click();
    await expect(dialog).toBeVisible();
    return { button, dialog };
  };

  test("the button opens it, centred in the viewport, and presses again to close", async ({ page }) => {
    const { button, dialog } = await open(page);
    await expect(dialog).toContainText("Developer");
    const found = await box(page, ".cs-detail");
    const viewport = page.viewportSize()!;
    expect(Math.abs(found.x + found.width / 2 - viewport.width / 2)).toBeLessThan(2);
    // The window may cover the button, so press it from the keyboard: it
    // still has focus from the click.
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
  });

  test("its close button and Escape close it, focus going back to the button", async ({ page }) => {
    const { button, dialog } = await open(page);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("a click outside closes it", async ({ page }) => {
    const { dialog } = await open(page);
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });

  test("Tab moves from the button into the window", async ({ page }) => {
    const { dialog } = await open(page);
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  });
});

test.describe("layout", () => {
  test("wide: the content pane beside the equipment pane, which keeps its wide layout", async ({ page }) => {
    await page.goto(windowUrl());
    const content = await box(page, ".cs__content");
    const equipment = await box(page, ".cs__equipment");
    expect(content.x + content.width).toBeLessThanOrEqual(equipment.x);
    expect(Math.abs(content.y - equipment.y)).toBeLessThan(1);
    expect(equipment.width).toBeCloseTo(30 * 16, 0);
    const left = await box(page, ".cs__slots--left");
    const portrait = await box(page, ".cs__portrait");
    expect(left.x + left.width).toBeLessThanOrEqual(portrait.x);
  });

  test("below 46rem the panes stack in DOM order; the equipment pane follows its own width", async ({ page }) => {
    await page.goto(windowUrl("&width=40"));
    const tabs = await box(page, ".cs__tabs");
    const content = await box(page, ".cs__content");
    const equipment = await box(page, ".cs__equipment");
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(content.y + 0.5);
    expect(content.y + content.height).toBeLessThanOrEqual(equipment.y + 0.5);
    // A 40rem window, but its 30rem pane is wide enough for the wide layout.
    let left = await box(page, ".cs__slots--left");
    let portrait = await box(page, ".cs__portrait");
    expect(left.x + left.width).toBeLessThanOrEqual(portrait.x);

    // At 22rem the pane gets the narrow layout too.
    await page.goto(windowUrl("&width=22"));
    portrait = await box(page, ".cs__portrait");
    left = await box(page, ".cs__slots--left");
    expect(portrait.y + portrait.height).toBeLessThanOrEqual(left.y);
  });

  test("the layout follows the container, not the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(windowUrl("&width=40"));
    const content = await box(page, ".cs__content");
    const equipment = await box(page, ".cs__equipment");
    expect(content.y + content.height).toBeLessThanOrEqual(equipment.y + 0.5);
  });

  test("with no tabs the window is the panel's width", async ({ page }) => {
    await page.goto("/?fixture=minimal");
    const panel = await box(page, ".cs");
    await page.goto("/?view=window&fixture=minimal");
    await expect(page.locator(".cs__content")).toHaveCount(0);
    expect((await box(page, ".cs")).width).toBe(panel.width);
  });

  test("nothing in the window overflows sideways at the limits", async ({ page }) => {
    for (const width of ["", "40", "22", "18"]) {
      await page.goto(`/?view=window&fixture=edge-cases${width && `&width=${width}`}`);
      for (const tab of await page.locator(".cs__tab").evaluateAll((links) => links.map((link) => link.getAttribute("href")!))) {
        await page.goto(tab);
        const overflow = await page.locator(".cs").evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow, `${tab}`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("stacked, a row's tooltip is drawn over the equipment pane below it", async ({ page }) => {
    // Each pane is a stacking context; the hovered one must come forward.
    await page.goto(windowUrl("&width=40"));
    // End the content pane right after the row, so its card runs down into
    // the equipment pane.
    await page.locator(".cs__content").evaluate((pane) => {
      for (const group of [...pane.querySelectorAll(".cs-group")].slice(1)) group.remove();
      pane.querySelector(".cs-block--gauges")?.remove();
    });
    const frontEnd = row(page, "Front end");
    await frontEnd.hover();
    const tip = await tooltipOf(frontEnd);
    await expect(tip).toBeVisible();
    const tipBox = (await tip.boundingBox())!;
    const equipment = await box(page, ".cs__equipment");
    expect(tipBox.y + tipBox.height).toBeGreaterThan(equipment.y + 8);
    const point = [tipBox.x + tipBox.width / 2, (equipment.y + tipBox.y + tipBox.height) / 2];
    expect(await tip.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), point)).toBe(true);
  });
});

for (const [theme, tab] of [
  ["document", "profile"],
  ["game", "profile"],
  ["document", "skills"],
  ["game", "reputation"],
]) {
  test(`every focusable element in the window shows a focus ring (${theme}, ${tab})`, async ({ page }) => {
    await page.goto(windowUrl(`&theme=${theme}&tab=${tab}`));
    await page.locator(".cs__jobs").evaluate((details: HTMLDetailsElement) => (details.open = true));
    // Visible ones only: a closed detail window's controls take no Tab stop.
    const focusable = await page.locator(".cs").locator("a, summary, button, [tabindex='0'] >> visible=true").count();
    const seen: string[] = [];
    let entered = false;
    let left = false;
    for (let i = 0; i < 120 && !left; i++) {
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
    expect(left, "Tab left the window").toBe(true);
    expect(seen).toHaveLength(focusable);
    // The tab strip and the tab's own controls are among them.
    expect(seen.some((name) => name.includes("Attributes"))).toBe(true);
    const own = { profile: "All titles", skills: "Healthcare work", reputation: "Earlier" }[tab];
    expect(seen.some((name) => name.includes(own!)), own).toBe(true);
  });
}

// axe on the window only, WCAG 2.2 A/AA, every tab of every example, in
// both themes and both layouts, plus once with a row tooltip shown.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const found = (await new AxeBuilder({ page }).include(".cs").withTags(WCAG).analyze()).violations;
  return found.map((v) => ({ rule: v.id, help: v.help, nodes: v.nodes.map((n) => n.target) }));
}

for (const fixture of ["full", "minimal", "edge-cases"]) {
  for (const theme of ["document", "game"]) {
    for (const width of ["", "22"]) {
      test(`no axe violations on any tab: ${fixture}, ${theme}, ${width ? "narrow" : "wide"}`, async ({ page }) => {
        await page.goto(`/?view=window&fixture=${fixture}&theme=${theme}${width && `&width=${width}`}`);
        await expect(page.locator(".cs")).toBeVisible();
        const tabs = await page.locator(".cs__tab").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
        for (const href of tabs.length > 0 ? tabs : [page.url()]) {
          await page.goto(href);
          expect(await violations(page), href).toEqual([]);
        }
      });
    }
  }

}

for (const theme of ["document", "game"]) {
  test(`no axe violations with a row tooltip shown (${theme})`, async ({ page }) => {
    await page.goto(windowUrl(`&theme=${theme}`));
    await tabTo(page, row(page, "Front end"));
    expect(await violations(page)).toEqual([]);
  });

  test(`no axe violations with a detail window open (${theme})`, async ({ page }) => {
    await page.goto(windowUrl(`&theme=${theme}&tab=profile`));
    await page.getByRole("button", { name: "All titles" }).click();
    await expect(page.getByRole("dialog", { name: "Titles" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}
