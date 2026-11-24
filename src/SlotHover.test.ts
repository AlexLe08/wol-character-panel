import { describe, expect, it, vi } from "vitest";
import { faceUnder, tapThrough } from "./SlotHover.tsx";

// Which slot or row a tap on an open tooltip goes to, with stand-ins for
// the elements at the tap's point (Node has no DOM). The browser tests run
// it for real (browser/tooltips.spec.ts, "on a touch screen").

type Fake = HTMLElement & { parentElement: Fake | null; focus: ReturnType<typeof vi.fn> };

// A stand-in element: `classes` and `focusable` (tabindex="0") are all
// `closest` and `classList` look at.
function el(parent: Fake | null, { classes = [] as string[], focusable = false } = {}): Fake {
  const matches = (at: Fake, selector: string) => {
    const own = at as unknown as { classes: string[]; focusable: boolean };
    if (selector === '[tabindex="0"]') return own.focusable;
    if (selector.startsWith(".")) return own.classes.includes(selector.slice(1));
    throw new Error(`unexpected selector ${selector}`);
  };
  const node = {
    parentElement: parent,
    classes,
    focusable,
    focus: vi.fn(),
    classList: { contains: (name: string) => classes.includes(name) },
    contains(other: Fake | null): boolean {
      for (let at = other; at; at = at.parentElement) if (at === node) return true;
      return false;
    },
    closest(selector: string): Fake | null {
      for (let at: Fake | null = node; at; at = at.parentElement) if (matches(at, selector)) return at;
      return null;
    },
  } as unknown as Fake;
  return node;
}

// A list of slots: the open one's tooltip, a slot beside it, and a link.
function slots() {
  const list = el(null);
  const openHover = el(list, { classes: ["cs-slot__hover"] });
  const openFace = el(openHover, { focusable: true });
  const tip = el(openHover, { classes: ["cs-tip"] });
  const tipText = el(tip);
  const nextHover = el(list, { classes: ["cs-slot__hover"] });
  const nextFace = el(nextHover, { focusable: true });
  const nextLabel = el(nextFace);
  const link = el(list, { focusable: true });
  return { list, openHover, openFace, tip, tipText, nextHover, nextFace, nextLabel, link };
}

describe("faceUnder", () => {
  it("gives the tooltip-only face under the tooltip, past the tooltip's own content", () => {
    const { tip, tipText, nextFace, nextLabel, nextHover, list } = slots();
    expect(faceUnder(tip, [tipText, tip, nextLabel, nextFace, nextHover, list])).toBe(nextFace);
  });

  it("skips the elements around the tooltip", () => {
    const { tip, openHover, list, nextFace } = slots();
    expect(faceUnder(tip, [tip, openHover, nextFace, list])).toBe(nextFace);
  });

  it("gives null for a link under the tooltip, so it isn't followed", () => {
    // A link isn't the child of a .cs-slot__hover.
    const { tip, link, list } = slots();
    expect(faceUnder(tip, [tip, link, list])).toBeNull();
  });

  it("gives null when nothing focusable is under the tooltip", () => {
    const { tip, list } = slots();
    expect(faceUnder(tip, [tip, list])).toBeNull();
    expect(faceUnder(tip, [tip])).toBeNull();
  });
});

describe("tapThrough", () => {
  // A tap on the open tooltip's text, over the slot beside it.
  function tap({ pointerType = "touch" as "mouse" | "pen" | "touch", hoverNone = true, target = "tipText", wrapper = "openHover" } = {}) {
    const s = slots();
    const elementsFromPoint = vi.fn(() => [s.tipText, s.tip, s.nextLabel, s.nextFace, s.nextHover, s.list]);
    const view = { matchMedia: () => ({ matches: hoverNone }), document: { elementsFromPoint } };
    const event = { pointerType, target: s[target as keyof typeof s], currentTarget: s[wrapper as keyof typeof s], clientX: 10, clientY: 20 };
    tapThrough(event, view);
    return { ...s, elementsFromPoint };
  }

  it("focuses the tooltip-only slot under a touch tap on an open tooltip", () => {
    const { nextFace, elementsFromPoint } = tap();
    expect(elementsFromPoint).toHaveBeenCalledWith(10, 20);
    expect(nextFace.focus).toHaveBeenCalledOnce();
  });

  it("does nothing for a mouse or pen", () => {
    expect(tap({ pointerType: "mouse" }).nextFace.focus).not.toHaveBeenCalled();
    expect(tap({ pointerType: "pen" }).nextFace.focus).not.toHaveBeenCalled();
  });

  it("does nothing on a screen with hover, where tooltips don't open on focus", () => {
    expect(tap({ hoverNone: false }).nextFace.focus).not.toHaveBeenCalled();
  });

  it("does nothing for a tap that isn't on a tooltip", () => {
    const { nextFace, elementsFromPoint } = tap({ target: "openFace" });
    expect(elementsFromPoint).not.toHaveBeenCalled();
    expect(nextFace.focus).not.toHaveBeenCalled();
  });

  it("ignores a tooltip outside its own slot or row", () => {
    const { nextFace, elementsFromPoint } = tap({ wrapper: "nextHover" });
    expect(elementsFromPoint).not.toHaveBeenCalled();
    expect(nextFace.focus).not.toHaveBeenCalled();
  });
});
