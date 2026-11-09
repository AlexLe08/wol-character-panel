import { expect, type Locator, type Page } from "@playwright/test";

// A slot's face: the link (or focusable group, for tooltip-only slots)
// named by the slot's label.
export function slot(page: Page, label: string): Locator {
  return page.locator(".cs .cs-slot__face").filter({ has: page.getByText(label, { exact: true }) });
}

// The tooltip a slot's face is described by (aria-describedby).
export async function tooltipOf(face: Locator): Promise<Locator> {
  const id = await face.getAttribute("aria-describedby");
  expect(id, "the slot names its tooltip").toBeTruthy();
  return face.page().locator(`[id="${id}"]`);
}

// Presses Tab until `target` has focus, as a keyboard user gets there (so
// :focus-visible applies, which a programmatic focus() may not promise).
export async function tabTo(page: Page, target: Locator, maxPresses = 40): Promise<void> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Tab never reached ${target}`);
}

// Moves the pointer to the page's top-left corner, away from the panel.
export async function pointerAway(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
}
