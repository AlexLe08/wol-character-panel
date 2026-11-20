import { describe, expect, it, vi } from "vitest";
import { closeOnLeave } from "./JobMenuFocus.tsx";

// The focus-out rule, with stand-ins for the menu and the element focus
// moved to (Node has no DOM). The browser tests run it for real
// (browser/layout.spec.ts, "the job menu closes").

function menu({ open = true } = {}) {
  const inside = {};
  const hidePopover = vi.fn();
  const element = {
    contains: (node: unknown) => node === inside,
    querySelector: (selector: string) => (open && selector === ".cs__jobs-list:popover-open" ? { hidePopover } : null),
  } as unknown as HTMLElement;
  return { element, inside: inside as EventTarget, hidePopover };
}

describe("closeOnLeave", () => {
  it("hides the open list when focus moves outside the menu", () => {
    const { element, hidePopover } = menu();
    closeOnLeave(element, {} as EventTarget);
    expect(hidePopover).toHaveBeenCalledOnce();
  });

  it("keeps it open when focus moves within the menu", () => {
    const { element, inside, hidePopover } = menu();
    closeOnLeave(element, inside);
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it("keeps it open when focus leaves the page", () => {
    const { element, hidePopover } = menu();
    closeOnLeave(element, null);
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it("does nothing when the list is closed", () => {
    const { element, hidePopover } = menu({ open: false });
    expect(() => closeOnLeave(element, {} as EventTarget)).not.toThrow();
    expect(hidePopover).not.toHaveBeenCalled();
  });
});
