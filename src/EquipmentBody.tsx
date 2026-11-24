import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ActionLink, type LinkContext, type RenderLink } from "./ActionLink.tsx";
import { GearSetRow, gearSetFor } from "./GearSet.tsx";
import { glyph, TOOLBAR_ICONS } from "./icons.tsx";
import { isActionActive } from "./resolve.ts";
import { LIMITS } from "./schema.ts";
import { SlotHover } from "./SlotHover.tsx";
import { TooltipCard } from "./Tooltip.tsx";
import type { CharacterPanelConfig, Job, Portrait, SlotContent, SlotDef, SlotPosition } from "./types.ts";

// The equipment pane's inside, shared by the components that draw it (no
// entry exports it):
//   gear set     [links] [job menu]  caption                    [end]
//   header       [header-start slot]  level, emblem, job title  [header-end slot]
//   body         left column | portrait (optional corner badge) | right column
// Slots are links (to a page section, another page, or another site) with
// a compact tooltip on hover or keyboard focus. Slots a job doesn't fill
// render as dimmed empty squares. The component around it draws the
// section and the bar, and its CSS.

export type LinkRendererProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  // "job": swaps the job on the same page (a host may want to keep the
  // scroll position). "tab": shows another tab or page of the window, on
  // the same page (CharacterWindow only). "param": the same page with one
  // query parameter set (a slot's param action; its href ends in #<id>
  // when it should scroll). "page": goes to another page on the site.
  intent: "job" | "tab" | "param" | "page";
};

// The parts of the equipment pane a placement can leave out, each already
// resolved from the component's `parts` prop and its default.
export type EquipmentParts = { gearSet: boolean; jobMenu: boolean; toolbar: boolean; sockets: boolean };

export function defaultLink({ intent, ...props }: LinkRendererProps) {
  void intent; // a plain link has no use for it
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- children come in through props
  return <a {...props} />;
}

export function defaultPortrait(portrait: Portrait) {
  return <img src={portrait.src} alt={portrait.alt} width={portrait.width} height={portrait.height} />;
}

export function EquipmentBody({
  config,
  job,
  idPrefix,
  basePath,
  currentHref,
  jobParam,
  ownParams = [jobParam],
  parts,
  gearSetEnd,
  renderLink,
  renderPortrait,
  isParamActive,
}: {
  config: CharacterPanelConfig;
  job: Job;
  // Makes tooltip ids unique, even with two panels on one page.
  idPrefix: string;
  // The page the pane is on, for the job menu's links.
  basePath: string;
  // This job's own URL, which a param action adds its parameter to.
  currentHref: string;
  jobParam: string;
  // The query parameters the component owns (jobParam, and the window's
  // tabParam and pageParam): a param action naming one renders without a
  // link, so a slot can't clobber them.
  ownParams?: readonly string[];
  parts: EquipmentParts;
  gearSetEnd?: ReactNode;
  renderLink: RenderLink;
  renderPortrait: (portrait: Portrait) => ReactNode;
  isParamActive?: (name: string, value: string) => boolean;
}) {
  const framing = job.portrait?.framing ?? "face";
  const context: LinkContext = { config, job, jobParam, ownParams, currentHref, renderLink, isParamActive };
  const column = { context, idPrefix, showSockets: parts.sockets };
  const gearSet = gearSetFor(config, job);
  const jobMenu = parts.jobMenu && config.jobs.length > 1;
  // The row is drawn whenever it has something to hold.
  // false, as in {editing && <Save />}, is no control, like null.
  const end = gearSetEnd === false || gearSetEnd == null ? undefined : gearSetEnd;
  const gearSetRow = parts.gearSet && (jobMenu || gearSet !== undefined || end !== undefined);

  return (
    <>
      {gearSetRow && (
        <GearSetRow
          context={context}
          gearSet={gearSet}
          jobMenu={jobMenu}
          idPrefix={idPrefix}
          end={end}
          basePath={basePath}
        />
      )}
      <div className="cs__header">
        <SlotList position="header-start" {...column} />
        <div className="cs__job">
          <p className="cs__level">
            <span className="cs__level-label">{job.level.label}</span>{" "}
            <span className="cs__level-value">{job.level.value}</span>
          </p>
          <div className="cs__job-line">
            <span className="cs__job-emblem" aria-hidden="true">
              {job.icon ?? glyph(job.name)}
            </span>
            <p className="cs__job-title">{job.title}</p>
          </div>
        </div>
        <SlotList position="header-end" {...column} />
      </div>

      <div className="cs__body">
        <SlotList position="left" {...column} />
        <div className={`cs__portrait cs__portrait--${framing}`}>
          {job.portrait ? renderPortrait(job.portrait) : <PortraitPlaceholder />}
          {job.badge && (
            <p className="cs__badge">
              <span className="cs__badge-label">{job.badge.label}</span>{" "}
              <span className="cs__badge-value">{job.badge.value}</span>
            </p>
          )}
        </div>
        <SlotList position="right" {...column} />
        {parts.toolbar && <Toolbar />}
      </div>
    </>
  );
}

function SlotList({
  position,
  context,
  idPrefix,
  showSockets,
}: {
  position: SlotPosition;
  context: LinkContext;
  idPrefix: string;
  showSockets: boolean;
}) {
  // One slot each side of the job title, and LIMITS.slot.column in each
  // side column; parseConfig reports any extras.
  const header = position === "header-start" || position === "header-end";
  const here = context.config.slots.filter((slot) => slot.position === position).slice(0, header ? 1 : LIMITS.slot.column);
  const className = `cs__slots cs__slots--${position}`;
  if (here.length === 0) return <div className={className} />;

  return (
    <ul className={className}>
      {here.map((slot) => (
        <Slot
          key={slot.id}
          slot={slot}
          content={context.job.slots[slot.id]}
          tipId={`${idPrefix}tip-${slot.id}`}
          labelId={`${idPrefix}label-${slot.id}`}
          context={context}
          showSockets={showSockets}
        />
      ))}
    </ul>
  );
}

function SlotIcon({ slot, content }: { slot: SlotDef; content?: SlotContent }) {
  if (content?.iconSrc) {
    // Decorative: the slot's label is its accessible name.
    return <img className="cs-slot__img" src={content.iconSrc} alt="" />;
  }
  return <>{slot.icon ?? glyph(slot.label)}</>;
}

function Slot({
  slot,
  content,
  tipId,
  labelId,
  context,
  showSockets,
}: {
  slot: SlotDef;
  content: SlotContent | undefined;
  tipId: string;
  labelId: string;
  context: LinkContext;
  showSockets: boolean;
}) {
  const face = (
    <>
      <span className="cs-slot__square" aria-hidden="true">
        <SlotIcon slot={slot} content={content} />
        {showSockets && content && (
          <span className="cs-slot__sockets">
            <span className="cs-slot__socket" />
            <span className="cs-slot__socket" />
          </span>
        )}
      </span>
      <span className="cs-slot__label" id={labelId}>
        {slot.label}
      </span>
    </>
  );

  if (!content) {
    return (
      <li className="cs-slot cs-slot--empty">
        <span className="cs-slot__face">
          {face}
          <span className="cs-visually-hidden"> (empty)</span>
        </span>
      </li>
    );
  }

  const { action } = content;
  // The page is showing what this slot links to (its filter is on).
  const active = isActionActive(action, context.isParamActive, context.ownParams);

  return (
    <li className={`cs-slot cs-slot--${action.kind}${active ? " cs-slot--active" : ""}`}>
      <SlotHover>
        {/* With nothing to open (none, or a param naming one of the
            component's own parameters), a focusable group, so keyboard
            users still get the tooltip. */}
        <ActionLink
          action={action}
          className="cs-slot__face"
          face={face}
          naming={{ labelledBy: labelId, tipId }}
          active={active}
          context={context}
        />
        <TooltipCard
          id={tipId}
          tooltip={content.tooltip}
          icon={<SlotIcon slot={slot} content={content} />}
          subtitle={slot.label}
        />
      </SlotHover>
    </li>
  );
}

// Round buttons under the portrait: three each side, the first two lit.
// Visual only for now; when they get a job, make them real <button>s.
function Toolbar() {
  const sides = { start: TOOLBAR_ICONS.slice(0, 3), end: TOOLBAR_ICONS.slice(3) };
  return (
    <div className="cs__toolbar" aria-hidden="true">
      {(["start", "end"] as const).map((side) => (
        <span key={side} className={`cs__toolbar-group cs__toolbar-group--${side}`}>
          {sides[side].map((icon, index) => (
            <span
              key={index}
              className={`cs__toolbar-button${side === "start" && index < 2 ? " cs__toolbar-button--lit" : ""}`}
            >
              {icon}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

function PortraitPlaceholder() {
  return (
    <svg className="cs__placeholder" viewBox="0 0 100 200" role="img" aria-label="No portrait yet">
      <circle cx="50" cy="34" r="17" />
      <path d="M22 200V96c0-26 12-42 28-42s28 16 28 42v104z" />
    </svg>
  );
}
