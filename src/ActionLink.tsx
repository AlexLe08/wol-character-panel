import type { ReactNode } from "react";
import type { LinkRendererProps } from "./EquipmentBody.tsx";
import { actionHref, isActionActive, jobHref } from "./resolve.ts";
import type { CharacterPanelConfig, Job, RowAction } from "./types.ts";

// An action as a link (no entry exports it): the one place slots, block
// rows and gear-set links turn their action into a link, or into a face
// with no link when there is none to make.

export type RenderLink = (props: LinkRendererProps) => ReactNode;

// What an action needs to become a link, the same for the whole pane.
export type LinkContext = {
  config: CharacterPanelConfig;
  job: Job;
  jobParam: string;
  // The query parameters the component owns (jobParam, and the window's
  // tabParam and pageParam): a param action naming one renders without a
  // link, so it can't clobber them.
  ownParams: readonly string[];
  // This view's own URL, which a param action adds its parameter to.
  currentHref: string;
  renderLink: RenderLink;
  isParamActive?: (name: string, value: string) => boolean;
};

// For a face with a tooltip: the ids whose text names it, and the card's
// id, which describes it.
export type FaceNaming = { labelledBy: string; tipId?: string };

// A face with no link. With a tooltip, a group named by `labelledBy` that
// takes focus, so keyboard users get the tooltip (a group, not a button: a
// button would promise an action); else plain text with no Tab stop.
export function UnlinkedFace({
  className,
  naming,
  children,
}: {
  className: string;
  naming?: FaceNaming;
  children: ReactNode;
}) {
  if (!naming?.tipId) return <span className={className}>{children}</span>;
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus shows the tooltip it's described by
    <span className={className} role="group" aria-labelledby={naming.labelledBy} aria-describedby={naming.tipId} tabIndex={0}>
      {children}
    </span>
  );
}

// The action as a link: the host's renderLink for the panel's own pages
// (intents "job", "page" and "param", aria-current on the one showing), a
// plain <a> for an anchor or another site (with "(opens in a new tab)" when
// it does). A link is named by its text, and described by its tooltip's
// card. With no link to make (kind "none", a job the config doesn't have,
// or a param naming one of the component's own parameters), an UnlinkedFace.
export function ActionLink({
  action,
  className,
  face,
  naming,
  active,
  context,
}: {
  action: RowAction;
  className: string;
  face: ReactNode;
  naming?: FaceNaming;
  // Whether a param action is current, when the caller has already asked
  // (a slot marks its <li> too), so the host's isParamActive is asked once.
  active?: boolean;
  context: LinkContext;
}) {
  const { config, job, jobParam, ownParams, currentHref, renderLink, isParamActive } = context;
  const described = naming?.tipId ? { "aria-describedby": naming.tipId } : undefined;
  const unlinked = () => (
    <UnlinkedFace className={className} naming={naming}>
      {face}
    </UnlinkedFace>
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
      ...described,
      children: face,
    });
  }
  // A param action naming one of the component's own parameters renders
  // without a link (the schema refuses "job", "tab" and "page", but a host
  // can rename them).
  const href = action.kind === "param" && ownParams.includes(action.name) ? null : actionHref(action, currentHref);
  if (href === null) return unlinked();
  if (action.kind === "link") return renderLink({ className, href, intent: "page", ...described, children: face });
  if (action.kind === "param") {
    return renderLink({
      className,
      href,
      intent: "param",
      "aria-current": (active ?? isActionActive(action, isParamActive, ownParams)) ? "true" : undefined,
      ...described,
      children: face,
    });
  }
  if (action.kind === "external" && action.newTab) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer" {...described}>
        {face}
        <span className="cs-visually-hidden"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a className={className} href={href} {...described}>
      {face}
    </a>
  );
}
