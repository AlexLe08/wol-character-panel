import type { ReactNode } from "react";
import type { Tooltip } from "./types.ts";

// A compact item card (no entry exports it): icon and title block, an
// optional headline figure, then the details. Slots and block rows both
// show it, inside SlotHover, which with the CSS shows it on hover and
// keyboard focus.
export function TooltipCard({
  id,
  tooltip,
  icon,
  subtitle,
}: {
  id: string;
  tooltip: Tooltip;
  // Drawn in the card's square, as in the slot or row it belongs to.
  icon: ReactNode;
  // The line under the title when the tooltip sets none: the slot's or
  // row's label.
  subtitle: string;
}) {
  const items = tooltip.items ?? [];
  const pairs = items.filter((item) => typeof item !== "string");
  const lines = items.filter((item) => typeof item === "string");

  return (
    <div className="cs-tip" role="tooltip" id={id}>
      <div className="cs-tip__head">
        <span className="cs-tip__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="cs-tip__heading">
          {tooltip.tags && (
            <p className="cs-tip__tags">
              {tooltip.tags.map((tag) => (
                <span key={tag}>{tag} </span>
              ))}
            </p>
          )}
          <p className="cs-tip__title">{tooltip.title}</p>
          <p className="cs-tip__category">{tooltip.subtitle ?? subtitle}</p>
        </div>
      </div>
      {tooltip.stat && (
        <p className="cs-tip__stat">
          <span className="cs-tip__stat-label">{tooltip.stat.label}</span>{" "}
          <span className="cs-tip__stat-value">{tooltip.stat.value}</span>
        </p>
      )}
      {(items.length > 0 || tooltip.note) && (
        <div className="cs-tip__body">
          {pairs.length > 0 && (
            <dl className="cs-tip__pairs">
              {pairs.map((pair) => (
                <div key={pair.label} className="cs-tip__pair">
                  <dt>{pair.label}</dt>
                  <dd>{pair.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {lines.length > 0 && (
            <ul className="cs-tip__items">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {tooltip.note && <p className="cs-tip__note">{tooltip.note}</p>}
        </div>
      )}
    </div>
  );
}
