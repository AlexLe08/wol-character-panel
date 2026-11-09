import { expect, test } from "@playwright/test";
import { pointerAway, slot, tabTo, tooltipOf } from "./helpers.ts";

// Tooltips show on hover and keyboard focus (CSS), and Escape hides them
// without moving focus or the pointer (SlotHover.tsx, WCAG 1.4.13).

test.beforeEach(async ({ page }) => {
  await page.goto("/?fixture=full");
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
