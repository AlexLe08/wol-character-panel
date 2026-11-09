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
  await page.getByText("Change job").click();
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
