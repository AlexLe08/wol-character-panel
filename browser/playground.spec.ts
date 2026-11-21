import { expect, test, type Page } from "@playwright/test";

// The playground's controls: each example opens in its own theme
// (playground/example-themes.ts), and the URL leaves out a value equal to
// its default, the theme's being the example's own.

const theme = (page: Page) => page.locator("[data-cs-theme]").first();
const search = (page: Page) => new URL(page.url()).search;

test("the portfolio example opens in the document theme", async ({ page }) => {
  await page.goto("/?fixture=portfolio");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "document");
  await expect(page.getByLabel("Theme")).toHaveValue("document");
});

test("choosing an example opens it in its own theme, with no theme in the URL", async ({ page }) => {
  await page.goto("/?theme=document");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "document");

  await page.getByLabel("Fixture").selectOption("portfolio");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "document");
  expect(search(page)).toBe("?fixture=portfolio");

  await page.getByLabel("Fixture").selectOption("minimal");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "game");
  expect(search(page)).toBe("?fixture=minimal");

  await page.getByLabel("Fixture").selectOption("adventurer");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "game");
  expect(search(page)).toBe("");
});

test("a theme other than the example's own stays in the URL; its own leaves it", async ({ page }) => {
  await page.goto("/?fixture=portfolio");

  await page.getByLabel("Theme").selectOption("game");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "game");
  expect(search(page)).toBe("?fixture=portfolio&theme=game");
  await page.reload();
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "game");

  await page.getByLabel("Theme").selectOption("document");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "document");
  expect(search(page)).toBe("?fixture=portfolio");
});
