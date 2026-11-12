import { expect, test } from "@playwright/test";
import { pointerAway, slot, tabTo, tooltipOf } from "./helpers.ts";

// The panel as a host serves it, before hydration or with JavaScript off:
// /static is server-rendered with no script (playground/static.tsx), and
// these tests run with JavaScript disabled too. What must still work:
// tooltips on hover and focus (CSS), the job menu (<details> of links),
// and the narrow layout (a container query). Escape needs the script, so
// it isn't expected here.

test.use({ javaScriptEnabled: false });

test("the page has no script", async ({ page }) => {
  await page.goto("/static?fixture=full");
  await expect(page.locator(".cs")).toBeVisible();
  await expect(page.locator("script")).toHaveCount(0);
});

test("hover and keyboard focus show tooltips", async ({ page }) => {
  await page.goto("/static?fixture=full");
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
  await page.goto("/static?fixture=full");
  await expect(page.locator(".cs__job-title")).toHaveText("Front-end developer");

  const healthcare = page.getByRole("link", { name: /Healthcare/ });
  await expect(healthcare).toBeHidden();
  const toggle = page.locator(".cs__jobs-toggle");
  await expect(toggle).toHaveAccessibleName("Change job");
  await toggle.click();
  await expect(healthcare).toBeVisible();

  await healthcare.click();
  await expect(page).toHaveURL(/[?&]job=healthcare/);
  await expect(page.locator(".cs__job-title")).toHaveText("Developer in healthcare");
  // The menu is closed again on the new page.
  await expect(page.getByRole("link", { name: /Healthcare/ })).toBeHidden();
});

test("the narrow layout needs no script", async ({ page }) => {
  await page.goto("/static?fixture=full&width=22");
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
  await page.goto("/static?view=window&fixture=full");
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
  await page.goto("/static?view=window&fixture=full&tab=profile");
  await page.locator(".cs__jobs-toggle").click();
  await page.getByRole("link", { name: /Healthcare/ }).click();
  await expect(page).toHaveURL(/[?&]job=healthcare/);
  await expect(page).toHaveURL(/[?&]tab=profile/);
  await expect(page.locator(".cs__content")).toContainText("Remote");
});

test("keyboard focus shows a row's tooltip", async ({ page }) => {
  await page.goto("/static?view=window&fixture=full");
  const frontEnd = page.locator(".cs__content [role='group'][tabindex='0']").filter({ hasText: "Front end" });
  await tabTo(page, frontEnd);
  await expect(await tooltipOf(frontEnd)).toBeVisible();
});
