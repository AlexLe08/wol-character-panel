import type { ReactNode } from "react";
import type { LinkRendererProps } from "./EquipmentBody.tsx";
import { glyph, Icon, JobMenuIcon } from "./icons.tsx";
import { actionHref, isActionActive, jobHref } from "./resolve.ts";
import { LIMITS } from "./schema.ts";
import type { CharacterPanelConfig, GearSet, GearSetLink, Job, RowAction } from "./types.ts";

// The gear-set row, above the job header (no entry exports it):
//   [link] [link] [job menu]  caption: label / value          [end]
// The start links are the ones without position "end", up to
// LIMITS.gearSet.startLinks; the end is the host's gearSetEnd, else the
// first end link. parseConfig reports the links past either limit.

type RenderLink = (props: LinkRendererProps) => ReactNode;

// The gear-set row a job shows: its own, else the config's. A hidden one
// counts as none, as publicConfig() would leave it out.
export function gearSetFor(config: CharacterPanelConfig, job: Job): GearSet | undefined {
  const visible = (gearSet?: GearSet) => (gearSet && !gearSet.hidden ? gearSet : undefined);
  return visible(job.gearSet) ?? visible(config.gearSet);
}

export function GearSetRow({
  config,
  job,
  gearSet,
  jobMenu,
  end,
  basePath,
  jobParam,
  ownParams,
  currentHref,
  renderLink,
  isParamActive,
}: {
  config: CharacterPanelConfig;
  job: Job;
  gearSet: GearSet | undefined;
  // Whether to draw the job menu (more than one job, and not turned off).
  jobMenu: boolean;
  // The host's own control for the right end, in place of an end link.
  end?: ReactNode;
  basePath: string;
  jobParam: string;
  ownParams: readonly string[];
  currentHref: string;
  renderLink: RenderLink;
  isParamActive?: (name: string, value: string) => boolean;
}) {
  const links = gearSet?.links ?? [];
  const startLinks = links.filter((link) => link.position !== "end").slice(0, LIMITS.gearSet.startLinks);
  const endLink = links.find((link) => link.position === "end");
  const action = { config, job, jobParam, ownParams, currentHref, renderLink, isParamActive };
  const menuLabel = gearSet?.jobMenu?.label ?? "Change job";

  return (
    <div className="cs__gear">
      <div className="cs__gear-start">
        {startLinks.map((link, index) => (
          <GearLink key={link.id ?? index} link={link} {...action} />
        ))}
        {jobMenu && (
          // Keyed by job so the menu closes after a job change, which
          // re-renders the panel without reloading the page.
          <details className="cs__jobs" key={job.id}>
            <summary className="cs__jobs-toggle cs__gear-button">
              <span className="cs__gear-icon" aria-hidden="true">
                <Icon {...gearSet?.jobMenu} fallback={<JobMenuIcon />} />
              </span>
              <span className="cs-visually-hidden">{menuLabel}</span>
            </summary>
            <ul className="cs__jobs-list">
              {config.jobs.map((option) => (
                <li key={option.id}>
                  {renderLink({
                    href: jobHref(config, option.id, basePath, jobParam),
                    intent: "job",
                    className: "cs__jobs-link",
                    "aria-current": option.id === job.id ? "true" : undefined,
                    children: (
                      <>
                        <span className="cs__jobs-emblem" aria-hidden="true">
                          {option.icon ?? glyph(option.name)}
                        </span>
                        <span className="cs__jobs-name">{option.name}</span>
                        <span className="cs__jobs-level">
                          {option.level.label} {option.level.value}
                        </span>
                      </>
                    ),
                  })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {(gearSet?.label || gearSet?.value) && (
        <p className="cs__gear-caption">
          {gearSet.label && <span className="cs__gear-label">{gearSet.label}</span>}{" "}
          {gearSet.value && <span className="cs__gear-value">{gearSet.value}</span>}
        </p>
      )}
      {(end ?? endLink) && (
        <div className="cs__gear-end">{end ?? (endLink && <GearLink link={endLink} {...action} />)}</div>
      )}
    </div>
  );
}

// An icon button: a link named by its label. With no link to make (kind
// "none", or a job the config doesn't have) the icon stays, not focusable.
function GearLink({
  link,
  ...action
}: {
  link: GearSetLink;
  config: CharacterPanelConfig;
  job: Job;
  jobParam: string;
  ownParams: readonly string[];
  currentHref: string;
  renderLink: RenderLink;
  isParamActive?: (name: string, value: string) => boolean;
}) {
  const face = (
    <>
      <span className="cs__gear-icon" aria-hidden="true">
        <Icon {...link} fallback={glyph(link.label)} />
      </span>
      <span className="cs-visually-hidden">{link.label}</span>
    </>
  );
  return <ActionLink action={link.action} className="cs__gear-button" face={face} {...action} />;
}

// A row's action as a link, handled as a slot's is (intents, new-tab text,
// aria-current), plus the job kind, which links like the job menu.
export function ActionLink({
  action,
  className,
  face,
  naming,
  config,
  job,
  jobParam,
  ownParams,
  currentHref,
  renderLink,
  isParamActive,
}: {
  action: RowAction;
  className: string;
  face: ReactNode;
  // For a row named by its parts rather than its whole text (a level row's
  // meter would otherwise add its number to the name): the ids that name
  // it, an id for the new-tab hint, and its tooltip's id if it has one.
  // With a tooltip and no link to make, the face is focusable, as a
  // tooltip-only slot's is.
  naming?: { labelledBy: string; hintId: string; tipId?: string };
  config: CharacterPanelConfig;
  job: Job;
  jobParam: string;
  // The component's own query parameters (see EquipmentBody).
  ownParams: readonly string[];
  currentHref: string;
  renderLink: RenderLink;
  isParamActive?: (name: string, value: string) => boolean;
}) {
  const named = naming && { "aria-labelledby": naming.labelledBy, "aria-describedby": naming.tipId };
  const unlinked = () =>
    naming?.tipId ? (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus shows the tooltip it's described by
      <span className={className} role="group" {...named} tabIndex={0}>
        {face}
      </span>
    ) : (
      <span className={className}>{face}</span>
    );

  if (action.kind === "job") {
    if (!config.jobs.some((option) => option.id === action.id)) return unlinked();
    // currentHref carries the panel's own query (a host's basePath), so
    // the job's link keeps it, as the job menu's links do.
    return renderLink({
      href: jobHref(config, action.id, currentHref, jobParam),
      intent: "job",
      className,
      "aria-current": action.id === job.id ? "true" : undefined,
      ...named,
      children: face,
    });
  }
  // A param action naming one of the component's own parameters renders
  // without a link, as on a slot (the schema refuses "job", "tab" and
  // "page", but a host can rename them).
  const href = action.kind === "param" && ownParams.includes(action.name) ? null : actionHref(action, currentHref);
  if (href === null) return unlinked();
  if (action.kind === "link") return renderLink({ className, href, intent: "page", ...named, children: face });
  if (action.kind === "param") {
    return renderLink({
      className,
      href,
      intent: "param",
      "aria-current": isActionActive(action, isParamActive, ownParams) ? "true" : undefined,
      ...named,
      children: face,
    });
  }
  if (action.kind === "external" && action.newTab) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...named}
        {...(naming && { "aria-labelledby": `${naming.labelledBy} ${naming.hintId}` })}
      >
        {face}
        <span className="cs-visually-hidden" id={naming?.hintId}> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a className={className} href={href} {...named}>
      {face}
    </a>
  );
}
