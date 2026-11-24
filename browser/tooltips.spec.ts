import { expect, test, type Page } from "@playwright/test";
import { pointerAway, slot, tabTo, tooltipOf } from "./helpers.ts";

// Tooltips show on hover and keyboard focus (CSS), and Escape hides them
// without moving focus or the pointer (SlotHover.tsx, WCAG 1.4.13).

test.beforeEach(async ({ page }) => {
  await page.goto("/?view=equipment&fixture=portfolio&theme=document");
});

test("hover shows a slot's tooltip, and leaving hides it", async ({ page }) => {
  const skills = slot(page, "Skills");
  const tip = await tooltipOf(skills);
  await expect(tip).toBeHidden();

  await skills.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Most relevant first");

  await pointerAway(page);
  await expect(tip).toBeHidden();
});

test("the tooltip stays while the pointer moves onto it (hoverable)", async ({ page }) => {
  const skills = slot(page, "Skills");
  const tip = await tooltipOf(skills);
  await skills.hover();
  await expect(tip).toBeVisible();

  // Across the gap between the square and the tooltip, in small steps.
  const box = (await tip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await expect(tip).toBeVisible();
});

test("keyboard focus shows a slot's tooltip, and moving on shows the next", async ({ page }) => {
  const skills = slot(page, "Skills");
  const projects = slot(page, "Projects");
  await tabTo(page, skills);
  await expect(await tooltipOf(skills)).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(projects).toBeFocused();
  await expect(await tooltipOf(skills)).toBeHidden();
  await expect(await tooltipOf(projects)).toBeVisible();
});

test("a tooltip-only slot is focusable and shows its tooltip", async ({ page }) => {
  // "Current focus" has a `none` action: a focusable group, not a link.
  const focus = slot(page, "Current focus");
  await expect(focus).toHaveAttribute("role", "group");
  await tabTo(page, focus);
  await expect(await tooltipOf(focus)).toBeVisible();
});

test("Escape hides a focused slot's tooltip and keeps focus there", async ({ page }) => {
  const skills = slot(page, "Skills");
  const tip = await tooltipOf(skills);
  await tabTo(page, skills);
  await expect(tip).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
  await expect(skills).toBeFocused();

  // Dismissal lasts until focus moves on; coming back shows it again.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(skills).toBeFocused();
  await expect(tip).toBeVisible();
});

test("Escape hides a hovered slot's tooltip without moving the pointer", async ({ page }) => {
  const skills = slot(page, "Skills");
  const tip = await tooltipOf(skills);
  await skills.hover();
  await expect(tip).toBeVisible();

  // Focus is elsewhere (the page body), so the document listener hears it.
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();

  // Dismissal lasts until the pointer leaves; hovering again shows it.
  await pointerAway(page);
  await skills.hover();
  await expect(tip).toBeVisible();
});

// LIMITS.tooltip was tightened for 2.0.0 until a card at every limit (the
// edge-cases fixture's first left slot) fit a 1280x800 laptop's viewport,
// about 720px; it was 985px before.
for (const theme of ["document", "game"]) {
  test(`a tooltip at the limits is at most 720px tall (${theme})`, async ({ page }) => {
    await page.goto(`/?view=equipment&fixture=edge-cases&theme=${theme}`);
    const face = page.locator(".cs__slots--left .cs-slot__face").first();
    await face.hover();
    const tip = await tooltipOf(face);
    await expect(tip).toBeVisible();
    expect((await tip.boundingBox())!.height).toBeLessThanOrEqual(720);
  });
}

// Touch screens have no hover, and a tap focuses without :focus-visible:
// a slot with no link (a `none` action) shows its card while it has any
// focus, so a tap opens it and a tap elsewhere closes it. A linked slot's
// tap just follows the link.
test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 } });

  test("a tap shows a tooltip-only slot's card, and a tap elsewhere hides it", async ({ page }) => {
    await page.goto("/?view=equipment&fixture=adventurer&theme=game");
    expect(await page.evaluate(() => matchMedia("(hover: none)").matches)).toBe(true);
    const mainHand = slot(page, "Main Hand");
    await expect(mainHand).toHaveAttribute("role", "group");
    const tip = await tooltipOf(mainHand);
    await expect(tip).toBeHidden();
    await mainHand.tap();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Lanternfall Sword");
    await page.locator(".pg-header").tap();
    await expect(tip).toBeHidden();
  });

  test("a tap on a linked slot follows its link without showing its card", async ({ page }) => {
    const skills = slot(page, "Skills");
    const tip = await tooltipOf(skills);
    await skills.tap();
    await expect(page).toHaveURL(/#skills$/);
    await expect(tip).toBeHidden();
  });

  test("on a phone, every slot's card opened by a tap stays inside the panel", async ({ page }) => {
    await page.goto("/?view=window&fixture=adventurer&theme=game");
    const panel = (await page.locator(".cs__equipment").boundingBox())!;
    // Every tooltip-only face (a link would navigate), the gear-set row's
    // Job Crystal too.
    const faces = page.locator('.cs-slot__face[tabindex="0"]');
    expect(await faces.count()).toBeGreaterThan(10);
    for (const face of await faces.all()) {
      const label = await face.locator(".cs-slot__label").textContent();
      await face.tap();
      const tip = await tooltipOf(face);
      await expect(tip, `${label}: shown`).toBeVisible();
      const found = (await tip.boundingBox())!;
      expect(found.x, `${label}: left edge`).toBeGreaterThanOrEqual(panel.x);
      expect(found.x + found.width, `${label}: right edge`).toBeLessThanOrEqual(panel.x + panel.width);
      // Closed again, so it covers no slot tapped next.
      await page.locator(".pg-header").tap();
      await expect(tip, `${label}: hidden`).toBeHidden();
    }
  });

  // Opens each tooltip-only slot or row's tooltip (in `within`) in turn
  // until one covers the centre (inside the viewport) of an element
  // matching `under`, and leaves that tooltip open. A finger lands on
  // whatever is on top, so the tests tap that point, not the element.
  // Between tries focus is dropped by script, not a tap elsewhere, which
  // would close a detail window.
  async function openOneCovering(page: Page, under: string, within = ".cs") {
    const faces = await page.locator(`${within} .cs-slot__hover > [tabindex="0"]`).all();
    const below = await page.locator(under).all();
    const viewport = page.viewportSize()!;
    for (const open of faces) {
      if (!(await open.isVisible())) continue;
      await open.tap();
      const tip = await tooltipOf(open);
      await expect(tip).toBeVisible();
      const card = (await tip.boundingBox())!;
      for (const target of below) {
        if ((await target.evaluate((el, face) => el === face, await open.elementHandle())) || !(await target.isVisible())) continue;
        const box = (await target.boundingBox())!;
        const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const covered = at.x > card.x && at.x < card.x + card.width && at.y > card.y && at.y < card.y + card.height;
        if (covered && at.y > 0 && at.y < viewport.height) return { open, target, at };
      }
      await open.blur();
      await expect(tip).toBeHidden();
    }
    throw new Error(`no open tooltip covers ${under}`);
  }

  test("a tap on a slot under an open card opens that slot's card in one tap", async ({ page }) => {
    await page.goto("/?view=window&fixture=adventurer&theme=game");
    const { open, target, at } = await openOneCovering(page, '.cs-slot__face[tabindex="0"]');
    await page.touchscreen.tap(at.x, at.y);
    await expect(await tooltipOf(target)).toBeVisible();
    await expect(await tooltipOf(open)).toBeHidden();
  });

  test("a tap on a row under an open tooltip opens that row's tooltip in one tap", async ({ page }) => {
    await page.goto("/?view=window&fixture=edge-cases&theme=game");
    const { open, target, at } = await openOneCovering(page, '.cs__content .cs-slot__hover > [tabindex="0"]');
    await page.touchscreen.tap(at.x, at.y);
    await expect(await tooltipOf(target)).toBeVisible();
    await expect(await tooltipOf(open)).toBeHidden();
  });

  test("in a detail window, a tap on an open tooltip over a link closes only the tooltip", async ({ page }) => {
    // Its rows' tooltips are anchored and fixed, in the top layer. No
    // example has a row's tooltip over another row in one at phone width.
    await page.goto("/?view=window&fixture=edge-cases&theme=game");
    await page.locator(".cs__content [popovertarget]").first().tap();
    const dialog = ".cs-detail:popover-open";
    await expect(page.locator(dialog)).toBeVisible();
    const url = page.url();
    const { open, at } = await openOneCovering(page, `${dialog} a[href]`, dialog);
    await page.touchscreen.tap(at.x, at.y);
    await expect(await tooltipOf(open)).toBeHidden();
    await expect(page.locator(dialog)).toBeVisible();
    // As below: nothing to wait for but time.
    await page.waitForTimeout(500);
    expect(page.url()).toBe(url);
  });

  test("a tap on an open card over a link closes the card without following the link", async ({ page }) => {
    await page.goto("/?view=window&fixture=portfolio&theme=game");
    const url = page.url();
    const { open, at } = await openOneCovering(page, ".cs a[href]");
    const popups: unknown[] = [];
    page.context().on("page", (popup) => popups.push(popup));
    await page.touchscreen.tap(at.x, at.y);
    await expect(await tooltipOf(open)).toBeHidden();
    // Checking that nothing happens has no event to wait for: give a
    // navigation or a new tab time to start.
    await page.waitForTimeout(500);
    expect(page.url()).toBe(url);
    expect(popups).toHaveLength(0);
  });
});
