import type { ComponentProps, ReactNode } from "react";
import { ActionLink } from "./GearSet.tsx";
import { CloseIcon, CollapseIcon, DetailIcon, glyph, hasIcon, Icon } from "./icons.tsx";
import { SlotHover } from "./SlotHover.tsx";
import { TooltipCard } from "./Tooltip.tsx";
import type {
  Block,
  Detail,
  FieldsBlock,
  GaugesBlock,
  IconName,
  LevelsBlock,
  ProgressBlock,
  RowAction,
  StatsBlock,
  Tooltip,
} from "./types.ts";

// The content pane's blocks (no entry exports them), each under an
// optional heading:
//   gauges    two per line: label and value, a bar, a small line under it
//   stats     groups of label/value rows, one <dl> per group
//   fields    small ruled headings, each over a value line that may link,
//             and may end in a button opening a detail window
//   levels    groups of rows: icon, a large level, the label over a bar
//   progress  groups of rows: icon and label, a bar, caption and value
// No heading elements, as in the equipment pane: they would land in the
// host page's outline at a level the package can't know. A labelled block
// or group is a group named by its label instead. Rows may carry the slot
// tooltip (all but fields), shown as a slot's is.

// What a row's action needs to become a link (see ActionLink).
export type ActionContext = Omit<
  ComponentProps<typeof ActionLink>,
  "action" | "className" | "face" | "naming"
>;

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
          case "levels":
            return <Levels key={key} block={block} id={id} context={context} />;
          case "progress":
            return <Progress key={key} block={block} id={id} context={context} />;
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

type Group = {
  label?: string;
  icon?: string;
  iconSrc?: string;
  iconName?: IconName;
  column?: "start" | "end";
  collapsible?: "open" | "closed";
};

// A block's groups. Consecutive groups that set `column` form a run of two
// stacks, the start ones on the left and the end ones on the right, so
// each stack keeps its own heights (a row-flow grid would line them up).
// The run is one container, the start stack first: that is its order in
// the DOM, and when the pane is narrow and the stacks become one column.
function Groups<G extends Group>({
  groups,
  id,
  body,
}: {
  groups: G[];
  id: string;
  // A group's rows, given its id (for the rows' own ids).
  body: (group: G, groupId: string) => ReactNode;
}) {
  const frame = (group: G, index: number) => (
    <GroupFrame key={index} group={group} id={`${id}-${index}`}>
      {body(group, `${id}-${index}`)}
    </GroupFrame>
  );
  const out: ReactNode[] = [];
  for (let index = 0; index < groups.length; index++) {
    if (!groups[index].column) {
      out.push(frame(groups[index], index));
      continue;
    }
    const start = index;
    while (index + 1 < groups.length && groups[index + 1].column) index++;
    const run = groups.slice(start, index + 1).map((group, offset) => ({ group, index: start + offset }));
    out.push(
      <div key={`run-${start}`} className="cs-columns">
        {(["start", "end"] as const).map((side) => {
          const stack = run.filter(({ group }) => group.column === side);
          return (
            stack.length > 0 && (
              <div key={side} className={`cs-columns__stack cs-columns__stack--${side}`}>
                {stack.map(({ group, index }) => frame(group, index))}
              </div>
            )
          );
        })}
      </div>,
    );
  }
  return <>{out}</>;
}

// A group under its optional label. Collapsible (and labelled), it is a
// <details> with the label as its summary, so it opens and closes with no
// JavaScript; parseConfig reports a collapsible group with no label, which
// is drawn plain.
function GroupFrame({ group, id, children }: { group: Group; id: string; children: ReactNode }) {
  const labelId = `${id}-label`;
  const label = group.label && (
    <>
      {hasIcon(group) && (
        <span className="cs-group__icon" aria-hidden="true">
          <Icon {...group} fallback={null} />
        </span>
      )}
      {group.label}
    </>
  );
  if (group.collapsible && group.label) {
    return (
      <details
        className="cs-group cs-group--collapsible"
        open={group.collapsible === "open"}
        aria-labelledby={labelId}
      >
        <summary className="cs-group__label" id={labelId}>
          <span className="cs-group__marker" aria-hidden="true">
            <CollapseIcon />
          </span>
          {label}
        </summary>
        {children}
      </details>
    );
  }
  return (
    <div className="cs-group" {...(group.label && { role: "group", "aria-labelledby": labelId })}>
      {group.label && (
        <p className="cs-group__label" id={labelId}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

// A row's face. With an action, a link named by its text (see ActionLink);
// else, with a tooltip, a group named by `labelledBy` that takes focus, as
// a tooltip-only slot is; else plain text with no Tab stop. A tooltip is
// shown as a slot's is, and describes the face. A row whose face can link
// keeps its bar outside it (a meter inside a link adds its number to the
// link's name), laid over the face by a subgrid.
function RowFace({
  className,
  rowId,
  tooltip,
  action,
  context,
  labelledBy,
  icon,
  subtitle,
  children,
}: {
  className: string;
  // The row's id, which its tooltip's id builds on.
  rowId: string;
  tooltip: Tooltip | undefined;
  action?: RowAction;
  context?: ActionContext;
  // The ids whose text names the row (its label and value).
  labelledBy: string;
  icon: ReactNode;
  subtitle: string;
  children: ReactNode;
}) {
  const tipId = tooltip && `${rowId}-tip`;
  let face: ReactNode;
  if (action && context) {
    face = (
      <ActionLink
        action={action}
        className={className}
        face={children}
        naming={{ labelledBy, tipId }}
        {...context}
      />
    );
  } else if (tooltip) {
    face = (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus shows the tooltip it's described by
      <span className={className} role="group" aria-labelledby={labelledBy} aria-describedby={tipId} tabIndex={0}>
        {children}
      </span>
    );
  } else {
    face = <span className={className}>{children}</span>;
  }
  if (!tooltip || !tipId) return face;
  return (
    <SlotHover>
      {face}
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
                rowId={rowId}
                tooltip={row.tooltip}
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
      <Groups
        groups={block.groups}
        id={id}
        body={(group, groupId) => (
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
                      rowId={rowId}
                      tooltip={row.tooltip}
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
        )}
      />
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
              <dd className="cs-field__body">
                {row.action ? (
                  <ActionLink action={row.action} className="cs-field__line" face={face} {...context} />
                ) : (
                  <span className="cs-field__line">{face}</span>
                )}
                {row.detail && <DetailWindow detail={row.detail} id={`${id}-${index}-detail`} context={context} />}
              </dd>
            </div>
          );
        })}
      </dl>
    </BlockFrame>
  );
}

// A fields row's detail: a small icon button at the row's end, and the
// window it opens, centred on the screen. The Popover API does the rest
// with no script of ours: the button opens and closes it, as do Escape and
// a click outside; it is drawn in the top layer, so nothing clips it; and
// focus goes back to the button. It is all in the HTML, so it works with
// JavaScript off. Its blocks can't hold another detail (the schema refuses
// one), so windows don't nest.
function DetailWindow({ detail, id, context }: { detail: Detail; id: string; context: ActionContext }) {
  const titleId = `${id}-title`;
  return (
    <>
      <button type="button" className="cs-field__detail" popoverTarget={id}>
        <span className="cs-field__detail-icon" aria-hidden="true">
          <Icon {...detail} fallback={<DetailIcon />} />
        </span>
        <span className="cs-visually-hidden">{detail.label}</span>
      </button>
      <div className="cs-detail" id={id} popover="auto" role="dialog" aria-labelledby={titleId}>
        <div className="cs-detail__bar">
          <p className="cs-detail__title" id={titleId}>
            {detail.title}
          </p>
          <button type="button" className="cs-detail__close" popoverTarget={id} popoverTargetAction="hide">
            <CloseIcon />
            <span className="cs-visually-hidden">Close</span>
          </button>
        </div>
        <div className="cs-detail__body">
          <BlockList blocks={detail.blocks} idPrefix={`${id}-`} context={context} />
        </div>
      </div>
    </>
  );
}

function Levels({ block, id, context }: { block: LevelsBlock; id: string; context: ActionContext }) {
  return (
    <BlockFrame block={block} id={id}>
      <Groups
        groups={block.groups}
        id={id}
        body={(group, groupId) => (
          <ul className="cs-levels">
            {group.rows.map((row, index) => {
              const rowId = `${groupId}-${index}`;
              const icon = <Icon {...row} fallback={glyph(row.label)} />;
              return (
                <li key={index} className={`cs-level cs-level--${row.tone ?? "default"}`}>
                  <RowFace
                    className="cs-level__face"
                    rowId={rowId}
                    tooltip={row.tooltip}
                    action={row.action}
                    context={context}
                    // In the order it's drawn ("4 React"), as a link's
                    // name from its text is.
                    labelledBy={`${rowId}-level ${rowId}-label`}
                    icon={icon}
                    subtitle={row.label}
                  >
                    <span className="cs-level__icon" aria-hidden="true">
                      {icon}
                    </span>
                    <span className="cs-level__level" id={`${rowId}-level`}>
                      {row.level}
                    </span>{" "}
                    <span className="cs-level__label" id={`${rowId}-label`}>
                      {row.label}
                    </span>
                  </RowFace>
                  {row.fill !== undefined && <Meter fill={row.fill} labelledBy={`${rowId}-label`} />}
                </li>
              );
            })}
          </ul>
        )}
      />
    </BlockFrame>
  );
}

function Progress({ block, id, context }: { block: ProgressBlock; id: string; context: ActionContext }) {
  return (
    <BlockFrame block={block} id={id}>
      <Groups
        groups={block.groups}
        id={id}
        body={(group, groupId) => (
          <ul className="cs-tracks">
            {group.rows.map((row, index) => {
              const rowId = `${groupId}-${index}`;
              const icon = <Icon {...row} fallback={glyph(row.label)} />;
              const named = [`${rowId}-label`, row.caption && `${rowId}-caption`, row.value && `${rowId}-value`];
              return (
                <li key={index} className="cs-track">
                  <RowFace
                    className="cs-track__face"
                    rowId={rowId}
                    tooltip={row.tooltip}
                    action={row.action}
                    context={context}
                    labelledBy={named.filter(Boolean).join(" ")}
                    icon={icon}
                    subtitle={row.label}
                  >
                    <span className="cs-track__head">
                      <span className="cs-track__icon" aria-hidden="true">
                        {icon}
                      </span>
                      <span className="cs-track__label" id={`${rowId}-label`}>
                        {row.label}
                      </span>
                    </span>{" "}
                    {(row.caption || row.value) && (
                      <span className="cs-track__foot">
                        {row.caption && (
                          <span className="cs-track__caption" id={`${rowId}-caption`}>
                            {row.caption}
                          </span>
                        )}{" "}
                        {row.value && (
                          <span className="cs-track__value" id={`${rowId}-value`}>
                            {row.value}
                          </span>
                        )}
                      </span>
                    )}
                  </RowFace>
                  {row.fill !== undefined && <Meter fill={row.fill} labelledBy={`${rowId}-label`} />}
                </li>
              );
            })}
          </ul>
        )}
      />
    </BlockFrame>
  );
}
