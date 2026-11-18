import { expect, test } from "@playwright/test";

// The demo site (deployed by .github/workflows/pages.yml) is the playground
// served from /wol-character-panel/ (`npm run build:demo`), not the site
// root, with the next demo (the newest beta) under
// /wol-character-panel/next/. In dev the base is /, so the other specs
// never see it; these load each build under its base, from the second and
// third servers in playwright.config.ts.
const DEMOS = [
  { name: "the demo", origin: "http://localhost:5200", base: "/wol-character-panel/" },
  { name: "the next demo", origin: "http://localhost:5201", base: "/wol-character-panel/next/" },
];

for (const { name, origin, base } of DEMOS) {
  const demo = `${origin}${base}`;

  test(`${name} loads its images from under the base path`, async ({ page }) => {
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`${demo}?fixture=full`, { waitUntil: "networkidle" });

    const portrait = page.locator(".cs__portrait img");
    await expect(portrait).toHaveAttribute("src", `${base}portrait.svg`);
    expect(await portrait.evaluate((img: HTMLImageElement) => img.naturalWidth), "the portrait loaded").toBeGreaterThan(0);
    expect(failed, "no failed requests").toEqual([]);
  });

  test(`${name}'s job links keep the base path and survive a reload`, async ({ page }) => {
    await page.goto(`${demo}?theme=game`);
    await page.locator(".cs__jobs-toggle").click();
    const link = page.getByRole("link", { name: /Healthcare/ });
    await expect(link).toHaveAttribute("href", `${base}?theme=game&job=healthcare`);

    await link.click();
    await expect(page).toHaveURL(`${demo}?theme=game&job=healthcare`);
    await page.reload();
    await expect(page.locator(".cs__job-title")).toHaveText("Developer in healthcare");
  });
}
