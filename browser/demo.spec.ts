import { expect, test } from "@playwright/test";

// The demo site (`npm run build:demo`, deployed by
// .github/workflows/pages.yml) is the playground served from
// /wol-character-panel/, not the site root. In dev the base is /, so the
// other specs never see it; this one loads the build under its base, from
// the second server in playwright.config.ts.
const DEMO = "http://localhost:5200/wol-character-panel/";

test("the demo loads its images from under the base path", async ({ page }) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${DEMO}?fixture=full`, { waitUntil: "networkidle" });

  const portrait = page.locator(".cs__portrait img");
  await expect(portrait).toHaveAttribute("src", "/wol-character-panel/portrait.svg");
  expect(await portrait.evaluate((img: HTMLImageElement) => img.naturalWidth), "the portrait loaded").toBeGreaterThan(0);
  expect(failed, "no failed requests").toEqual([]);
});

test("the demo's job links keep the base path and survive a reload", async ({ page }) => {
  await page.goto(`${DEMO}?theme=game`);
  await page.locator(".cs__jobs-toggle").click();
  const link = page.getByRole("link", { name: /Healthcare/ });
  await expect(link).toHaveAttribute("href", "/wol-character-panel/?theme=game&job=healthcare");

  await link.click();
  await expect(page).toHaveURL(`${DEMO}?theme=game&job=healthcare`);
  await page.reload();
  await expect(page.locator(".cs__job-title")).toHaveText("Developer in healthcare");
});
