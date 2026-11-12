import type { ComponentProps, ReactNode } from "react";
import { ActionLink } from "./GearSet.tsx";
import { glyph, hasIcon, Icon } from "./icons.tsx";
import { SlotHover } from "./SlotHover.tsx";
import { TooltipCard } from "./Tooltip.tsx";
import type { Block, FieldsBlock, GaugesBlock, StatsBlock, Tooltip } from "./types.ts";

// The content pane's blocks (no entry exports them), each under an
// optional heading:
//   gauges   two per line: label and value, a bar, a small line under it
//   stats    groups of label/value rows, one <dl> per group
//   fields   small ruled headings, each over a value line that may link
// No heading elements, as in the equipment pane: they would land in the
// host page's outline at a level the package can't know. A labelled block
// or group is a group named by its label instead. Rows may carry the slot
// tooltip (gauges and stats here), shown as a slot's is.

// What a row's action needs to become a link (see ActionLink).
export type ActionContext = Omit<ComponentProps<typeof ActionLink>, "action" | "className" | "face">;

export function BlockList({ blocks, idPrefix, context }: { blocks: Block[]; idPrefix: string; context: ActionContext }) {
  return (
    <>
      {blocks.map((block, index) => {
        const id = `${idPrefix}block-${index}`;
        const key = block.id ?? index;
        switch (block.type) {
          case "gauges":
            return <Gauges key={key} block={block} id={id} />;
          case "stats":
            return <Stats key={key} block={block} id={id} />;
          case "fields":
            return <Fields key={key} block={block} id={id} context={context} />;
          // levels and progress: not drawn yet (docs/character-window-plan.md,
          // PR 5), nor a fields row's detail.
          default:
            return null;
        }
      })}
    </>
  );
}

// A block with its optional heading. Labelled, it is a group named by it.
function BlockFrame({ block, id, children }: { block: Block; id: string; children: ReactNode }) {
  const labelId = `${id}-label`;
  return (
    <div
      className={`cs-block cs-block--${block.type}`}
      {...(block.label && { role: "group", "aria-labelledby": labelId })}
    >
      {block.label && (
        <p className="cs-block__label" id={labelId}>
          {hasIcon(block) && (
            <span className="cs-block__icon" aria-hidden="true">
              <Icon {...block} fallback={null} />
            </span>
          )}
          {block.label}
        </p>
      )}
      {children}
    </div>
  );
}

// A row's focusable face when it has a tooltip: a named group, as a
// tooltip-only slot is, described by the card. Without one, plain text with
// no Tab stop.
function RowFace({
  className,
  tooltip,
  tipId,
  labelledBy,
  icon,
  subtitle,
  children,
}: {
  className: string;
  tooltip: Tooltip | undefined;
  tipId: string;
  // The ids whose text names the row (its label and value).
  labelledBy: string;
  icon: ReactNode;
  subtitle: string;
  children: ReactNode;
}) {
  if (!tooltip) return <span className={className}>{children}</span>;
  return (
    <SlotHover>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus shows the tooltip it's described by */}
      <span className={className} role="group" aria-labelledby={labelledBy} aria-describedby={tipId} tabIndex={0}>
        {children}
      </span>
      <TooltipCard id={tipId} tooltip={tooltip} icon={icon} subtitle={subtitle} />
    </SlotHover>
  );
}

// A bar from 0 to 100, named by its row's label. The value is always text
// beside it too, so the bar is never the only way to read it.
function Meter({ fill, labelledBy }: { fill: number; labelledBy: string }) {
  return (
    <span
      className="cs-meter"
      role="meter"
      aria-valuenow={fill}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-labelledby={labelledBy}
    >
      <span className="cs-meter__fill" style={{ width: `${fill}%` }} />
    </span>
  );
}

function Gauges({ block, id }: { block: GaugesBlock; id: string }) {
  return (
    <BlockFrame block={block} id={id}>
      <ul className="cs-gauges">
        {block.rows.map((row, index) => {
          const rowId = `${id}-${index}`;
          return (
            <li key={index} className={`cs-gauge cs-gauge--${row.tone ?? "primary"}`}>
              <RowFace
                className="cs-gauge__face"
                tooltip={row.tooltip}
                tipId={`${rowId}-tip`}
                labelledBy={`${rowId}-label ${rowId}-value`}
                icon={glyph(row.label)}
                subtitle={row.label}
              >
                <span className="cs-gauge__head">
                  <span className="cs-gauge__label" id={`${rowId}-label`}>
                    {row.label}
                  </span>{" "}
                  <span className="cs-gauge__value" id={`${rowId}-value`}>
                    {row.value}
                  </span>
                </span>
                <Meter fill={row.fill ?? 100} labelledBy={`${rowId}-label`} />
                {row.secondary && <span className="cs-gauge__secondary">{row.secondary}</span>}
              </RowFace>
            </li>
          );
        })}
      </ul>
    </BlockFrame>
  );
}

function Stats({ block, id }: { block: StatsBlock; id: string }) {
  return (
    <BlockFrame block={block} id={id}>
      {block.groups.map((group, groupIndex) => {
        const groupId = `${id}-${groupIndex}`;
        return (
          <div
            key={groupIndex}
            className="cs-group"
            {...(group.label && { role: "group", "aria-labelledby": `${groupId}-label` })}
          >
            {group.label && (
              <p className="cs-group__label" id={`${groupId}-label`}>
                {hasIcon(group) && (
                  <span className="cs-group__icon" aria-hidden="true">
                    <Icon {...group} fallback={null} />
                  </span>
                )}
                {group.label}
              </p>
            )}
            <dl className="cs-stats">
              {group.rows.map((row, index) => {
                const rowId = `${groupId}-${index}`;
                // A <dl> holds only dt and dd (in a div), so a row's
                // tooltip trigger sits in its dt, named by both.
                return (
                  <div key={index} className={`cs-stat cs-stat--${row.tone ?? "default"}`}>
                    <dt className="cs-stat__label">
                      <RowFace
                        className="cs-stat__face"
                        tooltip={row.tooltip}
                        tipId={`${rowId}-tip`}
                        labelledBy={`${rowId}-label ${rowId}-value`}
                        icon={glyph(row.label)}
                        subtitle={row.label}
                      >
                        <span id={`${rowId}-label`}>{row.label}</span>
                      </RowFace>
                    </dt>
                    <dd className="cs-stat__value" id={`${rowId}-value`}>
                      {row.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </BlockFrame>
  );
}

function Fields({ block, id, context }: { block: FieldsBlock; id: string; context: ActionContext }) {
  return (
    <BlockFrame block={block} id={id}>
      <dl className="cs-fields">
        {block.rows.map((row, index) => {
          const face = (
            <>
              {hasIcon(row) && (
                <span className="cs-field__icon" aria-hidden="true">
                  <Icon {...row} fallback={null} />
                </span>
              )}
              <span className="cs-field__text">
                {row.overline && <span className="cs-field__overline">{row.overline}</span>}
                <span className="cs-field__value">{row.value}</span>
                {row.caption && <span className="cs-field__caption">{row.caption}</span>}
              </span>
            </>
          );
          return (
            <div key={index} className="cs-field">
              <dt className="cs-field__label">{row.label}</dt>
              <dd>
                {row.action ? (
                  <ActionLink action={row.action} className="cs-field__line" face={face} {...context} />
                ) : (
                  <span className="cs-field__line">{face}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </BlockFrame>
  );
}
