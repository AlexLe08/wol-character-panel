import type { ReactNode } from "react";
import { ActionLink, type LinkContext } from "./ActionLink.tsx";
import { glyph, Icon, JobMenuIcon } from "./icons.tsx";
import { JobMenuFocus } from "./JobMenuFocus.tsx";
import { jobHref } from "./resolve.ts";
import { LIMITS } from "./schema.ts";
import type { CharacterPanelConfig, GearSet, GearSetLink, Job } from "./types.ts";

// The gear-set row, above the job header (no entry exports it):
//   [link] [link] [job menu]  caption: label / value          [end]
// The start links are the ones without position "end", up to
// LIMITS.gearSet.startLinks; the end is the host's gearSetEnd, else the
// first end link. parseConfig reports the links past either limit.

// The gear-set row a job shows: its own, else the config's. A hidden one
// counts as none, as publicConfig() would leave it out.
export function gearSetFor(config: CharacterPanelConfig, job: Job): GearSet | undefined {
  const visible = (gearSet?: GearSet) => (gearSet && !gearSet.hidden ? gearSet : undefined);
  return visible(job.gearSet) ?? visible(config.gearSet);
}

export function GearSetRow({
  context,
  gearSet,
  jobMenu,
  idPrefix,
  end,
  basePath,
}: {
  context: LinkContext;
  gearSet: GearSet | undefined;
  // Whether to draw the job menu (more than one job, and not turned off).
  jobMenu: boolean;
  // Makes the job list's id unique, even with two panels on one page.
  idPrefix: string;
  // The host's own control for the right end, in place of an end link.
  end?: ReactNode;
  // The page the pane is on, for the job menu's links.
  basePath: string;
}) {
  const { config, job, jobParam, renderLink } = context;
  const links = gearSet?.links ?? [];
  const startLinks = links.filter((link) => link.position !== "end").slice(0, LIMITS.gearSet.startLinks);
  const endLink = links.find((link) => link.position === "end");
  const menuLabel = gearSet?.jobMenu?.label ?? "Change job";
  const menuId = `${idPrefix}jobs`;

  return (
    <div className="cs__gear">
      <div className="cs__gear-start">
        {startLinks.map((link, index) => (
          <GearLink key={link.id ?? index} link={link} context={context} />
        ))}
        {jobMenu && (
          // A button and its list, through the Popover API, as a detail
          // window is, so it works with JavaScript off. The button opens and
          // closes the list, as do Escape (from anywhere, so a list left open
          // over a focused slot can be dismissed without going back to it:
          // WCAG 2.4.11) and a click outside; Escape inside it returns focus
          // to the button. JobMenuFocus adds the one thing a popover can't
          // do: close when focus lands outside the menu. Keyed by job so
          // the list closes after a job change, which re-renders the panel
          // without reloading the page.
          <JobMenuFocus key={job.id}>
            <button type="button" className="cs__jobs-toggle cs__gear-button" popoverTarget={menuId}>
              <span className="cs__gear-icon" aria-hidden="true">
                <Icon {...gearSet?.jobMenu} fallback={<JobMenuIcon />} />
              </span>
              <span className="cs-visually-hidden">{menuLabel}</span>
            </button>
            <ul className="cs__jobs-list" id={menuId} popover="auto">
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
          </JobMenuFocus>
        )}
      </div>
      {(gearSet?.label || gearSet?.value) && (
        <p className="cs__gear-caption">
          {gearSet.label && <span className="cs__gear-label">{gearSet.label}</span>}{" "}
          {gearSet.value && <span className="cs__gear-value">{gearSet.value}</span>}
        </p>
      )}
      {(end ?? endLink) && (
        <div className="cs__gear-end">{end ?? (endLink && <GearLink link={endLink} context={context} />)}</div>
      )}
    </div>
  );
}


// An icon button: a link named by its label. With no link to make (kind
// "none", or a job the config doesn't have) the icon stays, not focusable.
function GearLink({ link, context }: { link: GearSetLink; context: LinkContext }) {
  const face = (
    <>
      <span className="cs__gear-icon" aria-hidden="true">
        <Icon {...link} fallback={glyph(link.label)} />
      </span>
      <span className="cs-visually-hidden">{link.label}</span>
    </>
  );
  return <ActionLink action={link.action} className="cs__gear-button" face={face} context={context} />;
}
