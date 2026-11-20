"use client";

import { useEffect, useRef, type ReactNode } from "react";

// The job menu's one bit of client code. Opening and closing the list is
// the Popover API's (the button, Escape, a click outside), so it works
// before hydration and without JavaScript. This adds what it can't: the
// list closes when keyboard focus lands anywhere outside the menu, as the
// WAI-ARIA disclosure navigation example does, so it isn't left open over
// the slot focus moved to. It listens on the document, not for the menu's
// own focus-out, since focus can reach a slot without ever being in the
// menu (Safari doesn't focus a button on click).
export function JobMenuFocus({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => watchFocus(ref, document), []);

  return (
    <div ref={ref} className="cs__jobs">
      {children}
    </div>
  );
}

// Closes the menu's list whenever focus lands outside it; returns the
// cleanup.
export function watchFocus(
  menu: { readonly current: HTMLElement | null },
  doc: Pick<Document, "addEventListener" | "removeEventListener">,
) {
  const onFocusIn = (event: FocusEvent) => closeOnFocusElsewhere(menu.current, event.target);
  doc.addEventListener("focusin", onFocusIn);
  return () => doc.removeEventListener("focusin", onFocusIn);
}

// Hides the menu's open list when focus landed on `target` outside the
// menu. Checks for the Popover API first: a browser without it would throw
// on :popover-open.
export function closeOnFocusElsewhere(menu: HTMLElement | null, target: EventTarget | null): void {
  if (menu === null || target === null || menu.contains(target as Node)) return;
  const list = menu.querySelector<HTMLElement>(".cs__jobs-list");
  if (list && "hidePopover" in list && list.matches(":popover-open")) list.hidePopover();
}
