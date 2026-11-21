import { expect, test } from "@playwright/test";
import { pointerAway, slot, tabTo, tooltipOf } from "./helpers.ts";

// The panel as a host serves it, before hydration or with JavaScript off:
// /static is server-rendered with no script (playground/static.tsx), and
// these tests run with JavaScript disabled too. What must still work:
// tooltips on hover and focus (CSS), the job menu (a popover of links),
// and the narrow layout (a container query). Escape needs the script to
// hide a tooltip, so that isn't expected here (a detail window's Escape is
// the browser's own).

test.use({ javaScriptEnabled: false });

test("the page has no script", async ({ page }) => {
  await page.goto("/static?view=equipment&fixture=portfolio&theme=document");
  await expect(page.locator(".cs")).toBeVisible();
  await expect(page.locator("script")).toHaveCount(0);
});

test("with no query it shows the main page's default: the adventurer example in the game theme", async ({ page }) => {
  await page.goto("/static");
  await expect(page.locator(".cs__bar-name")).toHaveText("Wren Ashvale");
  await expect(page.locator("[data-cs-theme]").first()).toHaveAttribute("data-cs-theme", "game");
});

test("with no theme in the query an example opens in its own, as on the main page", async ({ page }) => {
  await page.goto("/static?fixture=portfolio");
  await expect(page.locator("[data-cs-theme]").first()).toHaveAttribute("data-cs-theme", "document");
  await page.goto("/static?fixture=minimal");
  await expect(page.locator("[data-cs-theme]").first()).toHaveAttribute("data-cs-theme", "game");
});

test("hover and keyboard focus show tooltips", async ({ page }) => {
  await page.goto("/static?view=equipment&fixture=portfolio&theme=document");
  const skills = slot(page, "Skills");
  const tip = await tooltipOf(skills);

  await skills.hover();
  await expect(tip).toBeVisible();
  await pointerAway(page);
  await expect(tip).toBeHidden();

  await tabTo(page, skills);
  await expect(tip).toBeVisible();
});

test("the job menu opens and its links change the job", async ({ page }) => {
  await page.goto("/static?view=equipment&fixture=portfolio&theme=document");
  await expect(page.locator(".cs__job-title")).toHaveText("Front-end developer");

  const healthcare = page.getByRole("link", { name: /Healthcare/ });
  await expect(healthcare).toBeHidden();
  const toggle = page.locator(".cs__jobs-toggle");
  await expect(toggle).toHaveAccessibleName("Change job");
  await toggle.click();
  await expect(healthcare).toBeVisible();
  // Escape and a click outside close it with no script too.
  await page.keyboard.press("Escape");
  await expect(healthcare).toBeHidden();
  await toggle.click();
  await page.locator(".cs__bar").click();
  await expect(healthcare).toBeHidden();
  await toggle.click();

  await healthcare.click();
  await expect(page).toHaveURL(/[?&]job=healthcare/);
  await expect(page.locator(".cs__job-title")).toHaveText("Developer in healthcare");
  // The menu is closed again on the new page.
  await expect(page.getByRole("link", { name: /Healthcare/ })).toBeHidden();
});

// With no script, Tab moves on past the open list and leaves it open over
// the slots below; Escape closes it from there, without going back to it
// (WCAG 2.4.11).
test("Escape closes the job menu from a slot it covers", async ({ page }) => {
  await page.goto("/static?view=equipment&fixture=portfolio&theme=document");
  const list = page.locator(".cs__jobs-list");
  await page.locator(".cs__jobs-toggle").click();
  await expect(list).toBeVisible();
  const stack = slot(page, "Core stack");
  await tabTo(page, stack);
  await expect(list).toBeVisible();
  const covered = () =>
    stack.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".cs__jobs-list");
    });
  expect(await covered(), "the focused slot is under the list").toBe(true);

  await page.keyboard.press("Escape");
  await expect(list).toBeHidden();
  await expect(stack, "focus stays where it was").toBeFocused();
  expect(await covered()).toBe(false);
});

test("the narrow layout needs no script", async ({ page }) => {
  await page.goto("/static?view=equipment&fixture=portfolio&theme=document&width=22");
  const portrait = (await page.locator(".cs__portrait").boundingBox())!;
  const left = (await page.locator(".cs__slots--left").boundingBox())!;
  expect(portrait.y + portrait.height).toBeLessThanOrEqual(left.y);

  const label = page.locator(".cs__slots--left .cs-slot__label").first();
  await expect(label).toBeVisible();
  expect((await label.boundingBox())!.width).toBeGreaterThan(1);
});

// The window, server-rendered: tabs and sub-tabs are links, so they work
// with no script, and so do row tooltips (CSS).
test("the window's tab and sub-tab links work", async ({ page }) => {
  await page.goto("/static?view=window&fixture=portfolio&theme=document");
  const tabs = page.getByRole("navigation", { name: "Tabs" });
  await expect(tabs.getByRole("link", { name: "Attributes" })).toHaveAttribute("aria-current", "page");

  await tabs.getByRole("link", { name: "Skills" }).click();
  await expect(page).toHaveURL(/[?&]tab=skills/);
  await expect(tabs.getByRole("link", { name: "Skills" })).toHaveAttribute("aria-current", "page");

  const pages = page.getByRole("navigation", { name: "Skills" });
  await pages.getByRole("link", { name: "Run" }).click();
  await expect(page).toHaveURL(/[?&]page=run/);
  await expect(pages.getByRole("link", { name: "Run" })).toHaveAttribute("aria-current", "page");
});

test("changing job in the window keeps its tab", async ({ page }) => {
  await page.goto("/static?view=window&fixture=portfolio&theme=document&tab=profile");
  await page.locator(".cs__jobs-toggle").click();
  await page.getByRole("link", { name: /Healthcare/ }).click();
  await expect(page).toHaveURL(/[?&]job=healthcare/);
  await expect(page).toHaveURL(/[?&]tab=profile/);
  await expect(page.locator(".cs__content")).toContainText("Remote");
});

test("keyboard focus shows a row's tooltip", async ({ page }) => {
  await page.goto("/static?view=window&fixture=portfolio&theme=document");
  const frontEnd = page.locator(".cs__content [role='group'][tabindex='0']").filter({ hasText: "Front end" });
  await tabTo(page, frontEnd);
  await expect(await tooltipOf(frontEnd)).toBeVisible();
});

// Collapsible groups are <details>, and detail windows the Popover API:
// both are HTML, so neither needs a script.
test("a collapsible group opens", async ({ page }) => {
  await page.goto("/static?view=window&fixture=portfolio&theme=document&tab=reputation");
  const row = page.locator(".cs-track", { hasText: "Study group" });
  await expect(row).toBeHidden();
  await page.locator("summary", { hasText: "Earlier" }).click();
  await expect(row).toBeVisible();
});

test("a detail window opens and closes", async ({ page }) => {
  await page.goto("/static?view=window&fixture=portfolio&theme=document&tab=profile");
  const dialog = page.getByRole("dialog", { name: "Titles" });
  await page.getByRole("button", { name: "All titles" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "All titles" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
