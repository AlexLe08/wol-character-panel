import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The demo's portrait upload (playground only): the chosen file becomes a
// blob: URL in every job's portrait, held in the tab, never in the page's
// URL; Remove and a reload bring the example's portrait back.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Any image will do: the playground's own, which the portrait then shows
// from a blob: URL rather than from /portrait.svg. (Relative to the
// repository root, where Playwright runs.)
const IMAGE = "playground/public/portrait.svg";

test("a chosen portrait shows in every job, stays out of the URL, and goes on Remove or reload", async ({ page }) => {
  const start = "/?fixture=portfolio&theme=document";
  await page.goto(start);
  const portrait = page.locator(".cs__portrait img");
  const input = page.getByLabel("Portrait", { exact: true });
  const remove = page.getByRole("button", { name: "Remove portrait" });
  await expect(portrait).toHaveAttribute("src", "/portrait.svg");
  await expect(remove).toBeDisabled();
  await expect(input).toHaveAccessibleDescription(/isn't uploaded, stored or added to the link/);

  await input.setInputFiles(IMAGE);
  await expect(portrait).toHaveAttribute("src", /^blob:/);
  await expect(portrait).toHaveAttribute("alt", "The image you chose");
  await expect
    .poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth), { message: "the image loaded" })
    .toBeGreaterThan(0);
  expect(new URL(page.url()).search, "nothing added to the URL").toBe("?fixture=portfolio&theme=document");

  // Another job (a link the panel builds) keeps it.
  await page.locator(".cs__jobs-toggle").click();
  await page.getByRole("link", { name: /Healthcare/ }).click();
  await expect(page.locator(".cs__job-title")).toHaveText("Developer in healthcare");
  await expect(portrait).toHaveAttribute("src", /^blob:/);
  expect(new URL(page.url()).searchParams.has("portrait")).toBe(false);

  const found = await new AxeBuilder({ page }).include(".cs").include(".pg-controls").withTags(WCAG).analyze();
  expect(found.violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);

  await remove.click();
  await expect(portrait).toHaveAttribute("src", "/portrait.svg");
  await expect(remove).toBeDisabled();
  expect(await input.inputValue(), "the input is cleared").toBe("");

  await input.setInputFiles(IMAGE);
  await expect(portrait).toHaveAttribute("src", /^blob:/);
  await page.reload();
  await expect(portrait).toHaveAttribute("src", "/portrait.svg");
});

test("a job with no portrait gets the chosen one", async ({ page }) => {
  await page.goto("/?fixture=edge-cases&job=bare");
  await expect(page.getByRole("img", { name: "No portrait yet" })).toBeVisible();

  await page.getByLabel("Portrait", { exact: true }).setInputFiles(IMAGE);
  await expect(page.locator(".cs__portrait img")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("img", { name: "No portrait yet" })).toHaveCount(0);
});
