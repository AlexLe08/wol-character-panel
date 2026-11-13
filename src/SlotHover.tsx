"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

// The panel's only client code. Showing the tooltip is pure CSS (hover, or
// keyboard focus inside the slot), so it works before hydration and without
// JavaScript. This adds what CSS can't: Escape hides the tooltip without
// moving focus or the pointer (WCAG 1.4.13), until the pointer leaves or
// focus moves on. That Escape is spent on the tooltip: it is cancelled, so
// a detail window around the row (a popover, which closes on an Escape
// left uncancelled) stays open until the next one.
export function SlotHover({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Hides the tooltip if it shows (by CSS: hover, focus, or a tap), and
  // cancels the Escape so nothing else closes on it.
  const dismiss = (event: KeyboardEvent | ReactKeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const tip = ref.current?.querySelector(".cs-tip");
    if (!tip || getComputedStyle(tip).display === "none") return;
    event.preventDefault();
    setDismissed(true);
  };

  // A hovered slot usually doesn't have focus, so its own onKeyDown never
  // sees the key: listen on the document while the pointer is over it.
  useEffect(() => {
    if (!hovered) return;
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [hovered]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- not a control: it only hears Escape and pointer events from the slot's own focusable face inside it
    <div
      ref={ref}
      className="cs-slot__hover"
      data-dismissed={dismissed || undefined}
      onKeyDown={dismiss}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setDismissed(false);
      }}
      onBlur={() => setDismissed(false)}
    >
      {children}
    </div>
  );
}
