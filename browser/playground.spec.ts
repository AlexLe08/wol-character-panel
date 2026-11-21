import { expect, test, type Page } from "@playwright/test";

// The playground's controls and header: each example opens in its own
// theme (playground/example-info.ts), and the URL leaves out a value equal
// to its default, the theme's being the example's own.

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

  await page.getByLabel("Example").selectOption("portfolio");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "document");
  expect(search(page)).toBe("?fixture=portfolio");

  await page.getByLabel("Example").selectOption("minimal");
  await expect(theme(page)).toHaveAttribute("data-cs-theme", "game");
  expect(search(page)).toBe("?fixture=minimal");

  await page.getByLabel("Example").selectOption("adventurer");
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

test("the Example control lists the examples with the stress test last", async ({ page }) => {
  await page.goto("/");
  const options = page.getByLabel("Example").locator("option");
  await expect(options).toHaveText(["adventurer", "portfolio", "minimal", "edge-cases (stress test)"]);
  // The values stay the examples' names, which ?fixture= links use.
  expect(await options.evaluateAll((all) => all.map((option) => (option as HTMLOptionElement).value))).toEqual([
    "adventurer",
    "portfolio",
    "minimal",
    "edge-cases",
  ]);

  await page.getByLabel("Example").selectOption("edge-cases");
  expect(search(page)).toBe("?fixture=edge-cases");
});

test("the intro follows the example chosen, and describes the Example control", async ({ page }) => {
  await page.goto("/");
  const intro = page.locator("#pg-example-intro");
  await expect(intro).toHaveText(/^The adventurer example: a game character screen/);
  await expect(page.getByLabel("Example")).toHaveAccessibleDescription(/^The adventurer example/);

  await page.getByLabel("Example").selectOption("portfolio");
  await expect(intro).toHaveText(/^The portfolio example: a developer's résumé/);
  await expect(page.getByLabel("Example")).toHaveAccessibleDescription(/^The portfolio example/);

  await page.goto("/?fixture=edge-cases");
  await expect(intro).toHaveText(/^The edge-cases example, a stress test/);
});

test("the header names the version and its install line, @next for a prerelease", async ({ page }) => {
  await page.goto("/");
  const install = page.locator(".pg-install");
  const version = /This demo shows version (\S+)\./.exec((await install.textContent()) ?? "")?.[1] ?? "";
  expect(version).toMatch(/^\d+\.\d+\.\d+/);
  await expect(install.locator("code")).toHaveText(
    `npm install @solution-nine/wol-character-panel${version.includes("-") ? "@next" : ""} react zod`,
  );
  // Plain text: links there would come before the panel in the tab order.
  await expect(page.locator(".pg-header a")).toHaveCount(0);
});

test("a hint above the panel says how to open a tooltip", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".pg-hint")).toHaveText("Hover over a slot or Tab to it to see its tooltip.");
});
