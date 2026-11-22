import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { tabTo } from "./helpers.ts";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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
  const version = /^Install (\S+) with/.exec((await install.textContent()) ?? "")?.[1] ?? "";
  expect(version).toMatch(/^\d+\.\d+\.\d+/);
  await expect(install.locator("code")).toHaveText(
    `npm install @solution-nine/wol-character-panel${version.includes("-") ? "@next" : ""} react zod`,
  );
  // Plain text: links there would come before the panel in the tab order.
  await expect(page.locator(".pg-header a")).toHaveCount(0);
});

test("a hint in the header says how to open a tooltip", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".pg-hint")).toHaveText("Hover over a slot or Tab to it to see its tooltip.");
});

// "Show config", under the panel: the example's file as written and the
// code a host would write for the current controls.
const config = (page: Page) => page.locator("details.pg-config");

test("Show config is closed under the panel, and opens to the example's JSON", async ({ page }) => {
  await page.goto("/?fixture=minimal");
  await expect(config(page)).not.toHaveAttribute("open");
  await expect(page.locator("#pg-config-json")).toBeHidden();
  // Below the panel, so nothing above it moved.
  const stage = await page.locator(".pg-stage").boundingBox();
  const details = await config(page).boundingBox();
  expect(details!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height);

  await page.getByText("Show config", { exact: true }).click();
  const json = page.locator("#pg-config-json");
  await expect(json).toBeVisible();
  // The file as written: its own formatting, not re-serialised.
  await expect(json).toContainText('"slots": [{ "id": "skills", "label": "Skills", "position": "left" }],');
  expect(JSON.parse((await json.textContent()) ?? "")).toMatchObject({
    $schema: "../character-panel.schema.json",
    defaultJobId: "developer",
    jobs: [{ id: "developer" }],
  });

  await page.getByLabel("Example").selectOption("portfolio");
  await expect(page.locator(".pg-config h2").nth(1)).toHaveText("The config, examples/portfolio.json");
  expect(JSON.parse((await json.textContent()) ?? "")).toMatchObject({ defaultJobId: "frontend" });
});

test("Show config's code follows the controls", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Show config", { exact: true }).click();
  const jsx = page.locator("#pg-config-jsx");
  await expect(jsx).toContainText('import { CharacterWindow } from "@solution-nine/wol-character-panel/react";');
  await expect(jsx).toContainText('import "@solution-nine/wol-character-panel/character-panel.css";');
  await expect(jsx).toContainText('import json from "./adventurer.json";');
  await expect(jsx).toContainText("const config = publicConfig(parsed.config);");
  await expect(jsx).toContainText(
    '<CharacterWindow\n  config={config}\n  job={resolveJob(config, searchParams.job)}\n  tab={searchParams.tab}\n  page={searchParams.page}\n  theme="game"\n/>',
  );

  // The select's accessible name takes in its options' text.
  await page.locator(".pg-controls").getByLabel("View").selectOption("equipment");
  await page.getByLabel("Theme").selectOption("document");
  await page.getByLabel("Labels").selectOption("always");
  await page.getByLabel("Sockets").check();
  await page.getByLabel("End control").check();
  await page.getByLabel("Drafts and hidden jobs").check();
  await expect(jsx).toContainText('import { EquipmentPanel } from "@solution-nine/wol-character-panel/react";');
  await expect(jsx).toContainText("const config = parsed.config;");
  await expect(jsx).toContainText(
    '<EquipmentPanel\n  config={config}\n  job={resolveJob(config, searchParams.job)}\n  theme="document"\n  labels="always"\n  parts={{ sockets: true }}\n  gearSetEnd={<SaveButton />}\n/>',
  );

  await page.goto("/?fixture=minimal&width=22");
  await page.getByText("Show config", { exact: true }).click();
  await expect(jsx).toContainText('import json from "./minimal.json";');
  await expect(jsx).toContainText('<div style={{ width: "22rem" }}>\n  <CharacterWindow');
});

for (const fixture of ["adventurer", "portfolio"]) {
  test(`no axe violations in Show config, open (${fixture}, its own theme)`, async ({ page }) => {
    await page.goto(`/?fixture=${fixture}`);
    await page.getByText("Show config", { exact: true }).click();
    await expect(page.locator("#pg-config-json")).toBeVisible();
    const found = await new AxeBuilder({ page }).include(".pg-config").withTags(WCAG).analyze();
    expect(found.violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  });
}

test("Show config opens from the keyboard, with a focus ring", async ({ page }) => {
  await page.goto("/?view=equipment&fixture=minimal");
  const summary = page.locator(".pg-config summary");
  await tabTo(page, summary);
  await expect(summary).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(config(page)).toHaveAttribute("open");
});
