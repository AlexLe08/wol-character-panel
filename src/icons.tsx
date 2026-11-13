import type { ReactNode } from "react";
import type { IconName } from "./types.ts";

// The package's own drawings (no entry exports them): 16 by 16, stroked in
// currentColor so both themes colour them. They echo the reference
// window's shapes without copying its artwork. Always decorative: whatever
// they sit in is named by its text.

function Drawing({ children }: { children: ReactNode }) {
  return (
    <svg
      className="cs-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const path = (d: string) => <path d={d} />;

// What an `iconName` can name (ICON_NAMES in schema.ts).
const NAMED: Record<IconName, ReactNode> = {
  sword: path("M13 3 5 11M13 3h-3M13 3v3M4 9l3 3M3 13l2-2"),
  shield: path("M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z"),
  wand: path("M3 13l7-7M11 2v2M14 5h-2M13 3l-1 1"),
  cross: path("M8 2v12M4 6h8"),
  bow: path("M4 2c5 2 5 10 0 12M4 2v12M2 8h11M11 6l2 2-2 2"),
  star: path("M8 2l1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1L2 6.3l4.2-.5z"),
  heart: path("M8 13.5S2.5 10 2.5 6A2.8 2.8 0 0 1 8 4.8 2.8 2.8 0 0 1 13.5 6c0 4-5.5 7.5-5.5 7.5z"),
  person: (
    <>
      <circle cx="8" cy="5" r="2.5" />
      {path("M3 14c0-3 2.2-5 5-5s5 2 5 5")}
    </>
  ),
  note: path("M4 2h6l3 3v9H4zM10 2v3h3M6 8h5M6 11h5"),
  list: path("M5.5 4H13M5.5 8H13M5.5 12H13M2.5 4h.01M2.5 8h.01M2.5 12h.01"),
  save: path("M13 8a5 5 0 0 1-9 3M3 8a5 5 0 0 1 9-3M12 2v3H9M4 14v-3h3"),
  gear: (
    <>
      <circle cx="8" cy="8" r="2" />
      {path("M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4")}
    </>
  ),
  hammer: path("M3 13l6-6M8 4l3-2 3 3-2 3z"),
  leaf: path("M3 13C3 6 7 3 13 3c0 6-3 10-10 10zM3 13l6-6"),
  crest: path("M3 3h10v5c0 3-2 5-5 6-3-1-5-3-5-6zM8 5v6M5.5 7.5h5"),
  flag: path("M4 14V2M4 3h8l-2 3 2 3H4"),
};

export function NamedIcon({ name }: { name: IconName }) {
  return <Drawing>{NAMED[name]}</Drawing>;
}

// The job menu's toggle: a note, like the reference's gear-set list.
export function JobMenuIcon() {
  return <NamedIcon name="note" />;
}

// The pointer beside the active tab, as the reference marks it.
export function TabMarkerIcon() {
  return (
    <Drawing>
      <path d="M5 3l6 5-6 5z" fill="currentColor" />
    </Drawing>
  );
}

// A fields row's detail button: a small page.
export function DetailIcon() {
  return <Drawing>{path("M4 2h5.5L12 4.5V14H4zM9.5 2v2.5H12M6 7.5h4M6 10h4")}</Drawing>;
}

// The detail window's close button.
export function CloseIcon() {
  return <Drawing>{path("M4 4l8 8M12 4l-8 8")}</Drawing>;
}

// A collapsible group's marker: a triangle in a circle, pointing right
// while closed (the CSS turns it down when open).
export function CollapseIcon() {
  return (
    <Drawing>
      <circle cx="8" cy="8" r="6" />
      <path d="M7 5.5 10 8l-3 2.5z" fill="currentColor" />
    </Drawing>
  );
}

// The six round buttons under the portrait, start side then end side.
export const TOOLBAR_ICONS: ReactNode[] = [
  <Drawing key="half-start">
    <circle cx="8" cy="8" r="5" />
    <path d="M8 3a5 5 0 0 0 0 10z" fill="currentColor" />
  </Drawing>,
  <Drawing key="half-end">
    <circle cx="8" cy="8" r="5" />
    <path d="M8 3a5 5 0 0 1 0 10z" fill="currentColor" />
  </Drawing>,
  <Drawing key="turn">{path("M13 8a5 5 0 1 1-1.5-3.5M12 2v3H9")}</Drawing>,
  <Drawing key="triangle">{path("M8 3l5 9H3z")}</Drawing>,
  <Drawing key="target">
    <circle cx="8" cy="8" r="5" />
    <circle cx="8" cy="8" r="2" />
  </Drawing>,
  <Drawing key="turn-back">{path("M3 8a5 5 0 1 0 1.5-3.5M4 2v3h3")}</Drawing>,
];

// Free content's last resort: its label's first two letters, as slots and
// job emblems have always shown.
export const glyph = (text: string) => text.slice(0, 2);

type IconFields = { icon?: string; iconSrc?: string; iconName?: IconName };

// Whether a config object sets any of its three icon fields.
export const hasIcon = ({ icon, iconSrc, iconName }: IconFields) => Boolean(iconSrc || icon || iconName);

// A config's icon, by precedence: an image, a glyph, a built-in drawing,
// then `fallback` (a label's first letters, or a control's default).
export function Icon({ icon, iconSrc, iconName, fallback }: IconFields & { fallback: ReactNode }) {
  if (iconSrc) return <img className="cs-icon cs-icon--img" src={iconSrc} alt="" />;
  if (icon) return <>{icon}</>;
  if (iconName) return <NamedIcon name={iconName} />;
  return <>{fallback}</>;
}
