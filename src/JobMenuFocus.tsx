"use client";

import type { ReactNode } from "react";

// The job menu's one bit of client code. Opening and closing the list is
// the Popover API's (the button, Escape, a click outside), so it works
// before hydration and without JavaScript. This adds what it can't: the
// list closes when keyboard focus moves on out of the menu, as the WAI-ARIA
// disclosure navigation example does, so it isn't left open over the slots
// below.
export function JobMenuFocus({ children }: { children: ReactNode }) {
  return (
    <div className="cs__jobs" onBlur={(event) => closeOnLeave(event.currentTarget, event.relatedTarget)}>
      {children}
    </div>
  );
}

// Hides the menu's open list when focus moved to `next` outside the menu.
// Focus leaving the page (no next element) keeps it open; a click outside
// is the popover's own light dismiss.
export function closeOnLeave(menu: HTMLElement, next: EventTarget | null): void {
  if (next === null || menu.contains(next as Node)) return;
  menu.querySelector<HTMLElement>(".cs__jobs-list:popover-open")?.hidePopover();
}
