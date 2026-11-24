"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

// The tooltips' client code (JobMenuFocus.tsx is the job menu's). Showing
// the tooltip is pure CSS (hover, or keyboard focus inside the slot), so it
// works before hydration and without JavaScript. This adds what CSS can't: Escape hides the tooltip without
// moving focus or the pointer (WCAG 1.4.13), until the pointer leaves or
// focus moves on. That Escape is spent on the tooltip: it is cancelled, so
// a detail window around the row (a popover, which closes on an Escape
// left uncancelled) stays open until the next one. On a touch screen it
// also hands a tap on an open tooltip to the tooltip-only slot or row
// under it (tapThrough).
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
      onPointerUp={tapThrough}
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

// On a touch screen a tooltip shows while its slot or row has focus, and
// an open one can cover the slots or rows next to it. A tap on it would
// only close it (focus leaves): when a tooltip-only slot or row is under
// the tap, focus that one, so its tooltip opens in the same tap. A link or
// button under it isn't reached through it, since only the tooltip shows:
// the tooltip just closes, as without JavaScript. On pointerup, so a drag
// that scrolls (pointercancel) changes nothing, and before the tap's
// mousedown, which then lands on the slot or row now uncovered. The
// SlotHover wrapper is the event's currentTarget; `view` is for tests.
export function tapThrough(
  event: Pick<ReactPointerEvent, "pointerType" | "target" | "currentTarget" | "clientX" | "clientY">,
  view: { matchMedia(query: string): { matches: boolean }; document: Pick<Document, "elementsFromPoint"> } = window,
): void {
  if (event.pointerType !== "touch" || !view.matchMedia("(hover: none)").matches) return;
  const tip = (event.target as Element).closest(".cs-tip");
  if (!tip || !(event.currentTarget as Element).contains(tip)) return;
  // No scroll, so the tap's mousedown lands on the face chosen here.
  faceUnder(tip, view.document.elementsFromPoint(event.clientX, event.clientY))?.focus({ preventScroll: true });
}

// The slot or row to focus for a tap on an open tooltip: the topmost of
// the elements at the tap's point (`atPoint`, topmost first, as
// elementsFromPoint gives them) that is neither inside the tooltip nor
// around it, when it is, or is inside, a tooltip-only face (the
// `tabindex="0"` `role="group"` child of a `.cs-slot__hover`). A link or
// button gives null, so it isn't reached through the tooltip, even one a
// host's `renderLink` gives a tabindex.
export function faceUnder(tip: Element, atPoint: readonly Element[]): HTMLElement | null {
  const under = atPoint.find((el) => !tip.contains(el) && !el.contains(tip));
  const face = under?.closest<HTMLElement>('[tabindex="0"]');
  if (!face?.matches('[role="group"]') || !face.parentElement?.classList.contains("cs-slot__hover")) return null;
  return face;
}
