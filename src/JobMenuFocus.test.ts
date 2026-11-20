import { describe, expect, it, vi } from "vitest";
import { closeOnFocusElsewhere, watchFocus } from "./JobMenuFocus.tsx";

// The focus rule, with stand-ins for the menu, its list and the element
// focus landed on (Node has no DOM). The browser tests run it for real
// (browser/layout.spec.ts, "the job menu closes").

function menu({ open = true, popover = true } = {}) {
  const inside = {};
  const hidePopover = vi.fn();
  const list = {
    matches: (selector: string) => selector === ":popover-open" && open,
    ...(popover ? { hidePopover } : {}),
  };
  const element = {
    contains: (node: unknown) => node === inside,
    querySelector: (selector: string) => (selector === ".cs__jobs-list" ? list : null),
  } as unknown as HTMLElement;
  return { element, inside: inside as EventTarget, hidePopover };
}

describe("closeOnFocusElsewhere", () => {
  it("hides the open list when focus lands outside the menu", () => {
    const { element, hidePopover } = menu();
    closeOnFocusElsewhere(element, {} as EventTarget);
    expect(hidePopover).toHaveBeenCalledOnce();
  });

  it("keeps it open when focus moves within the menu", () => {
    const { element, inside, hidePopover } = menu();
    closeOnFocusElsewhere(element, inside);
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it("keeps it open with no element to focus", () => {
    const { element, hidePopover } = menu();
    closeOnFocusElsewhere(element, null);
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it("does nothing when the list is closed", () => {
    const { element, hidePopover } = menu({ open: false });
    closeOnFocusElsewhere(element, {} as EventTarget);
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it("does nothing before the menu is mounted", () => {
    expect(() => closeOnFocusElsewhere(null, {} as EventTarget)).not.toThrow();
  });

  it("does nothing in a browser without the Popover API", () => {
    const { element } = menu({ popover: false });
    expect(() => closeOnFocusElsewhere(element, {} as EventTarget)).not.toThrow();
  });
});

describe("watchFocus", () => {
  it("applies the rule to each focusin on the document until cleaned up", () => {
    const { element, inside, hidePopover } = menu();
    const listeners = new Set<(event: FocusEvent) => void>();
    const doc = {
      addEventListener: (type: string, listener: (event: FocusEvent) => void) => type === "focusin" && listeners.add(listener),
      removeEventListener: (type: string, listener: (event: FocusEvent) => void) => listeners.delete(listener),
    } as unknown as Pick<Document, "addEventListener" | "removeEventListener">;
    const focusIn = (target: unknown) => listeners.forEach((listener) => listener({ target } as FocusEvent));

    const stop = watchFocus({ current: element }, doc);
    focusIn(inside);
    expect(hidePopover).not.toHaveBeenCalled();
    focusIn({});
    expect(hidePopover).toHaveBeenCalledOnce();

    stop();
    expect(listeners.size).toBe(0);
  });
});
