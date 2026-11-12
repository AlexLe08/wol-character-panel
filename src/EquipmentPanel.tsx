import { useId, type ReactNode } from "react";
import { defaultLink, defaultPortrait, EquipmentBody, type LinkRendererProps } from "./EquipmentBody.tsx";
import { jobHref } from "./resolve.ts";
import type { CharacterPanelConfig, Job, Portrait, Theme } from "./types.ts";
import "./character-panel.css";

// An equipment-screen style panel:
//   top bar      title ........................ character name
//   gear set     [links] [job menu]  caption                    [end]
//   header       [header-start slot]  level, emblem, job title  [header-end slot]
//   body         left column | portrait (optional corner badge) | right column
// The gear set, header and body are EquipmentBody (src/EquipmentBody.tsx);
// this adds the section around them and the bar.
//
// A Server Component with no framework imports. The host passes its own
// link and image components, so in Next.js links use <Link> and the
// portrait goes through next/image; anywhere else the defaults are plain
// <a> and <img>.

// Which parts are drawn. Each key reads the same way, true to draw it,
// though the decorative ones start off: toolbar (a row of round buttons
// under the portrait) and sockets (two dots on each filled slot) have no
// function yet, so they are hidden from assistive tech and not focusable.
// gearSet: false removes the whole row, with the job menu and gearSetEnd;
// jobMenu: false removes only that button.
export type EquipmentPanelParts = {
  bar?: boolean; // default true
  characterName?: boolean; // default true
  jobMenu?: boolean; // default true
  gearSet?: boolean; // default true
  toolbar?: boolean; // default false
  sockets?: boolean; // default false
};

export type EquipmentPanelProps = {
  config: CharacterPanelConfig;
  job: Job;
  // The page the panel is on, for job links (?job=<id>).
  basePath?: string;
  jobParam?: string;
  theme?: Theme;
  // Slot names under the squares: "narrow" shows them only when the panel
  // is narrow (touch screens have no hover tooltip); "always" shows them
  // at every width. Either way they are the slots' accessible names.
  labels?: "narrow" | "always";
  parts?: EquipmentPanelParts;
  // The host's own control at the gear-set row's right end (a save button
  // in an editor, say), in place of the config's end link.
  gearSetEnd?: ReactNode;
  // Accessible name for the panel landmark; also the top bar's text when
  // the config sets no title.
  label?: string;
  renderLink?: (props: LinkRendererProps) => ReactNode;
  renderPortrait?: (portrait: Portrait) => ReactNode;
  // Whether the page currently applies a param action's parameter value,
  // e.g. a project filter set by ?stack=. The panel can't tell on its own:
  // only the host knows how it reads its parameters (ignoring case, say).
  // A slot whose action it returns true for is marked as current
  // (aria-current and a highlight). Left out, no slot is.
  isParamActive?: (name: string, value: string) => boolean;
};

export function EquipmentPanel({
  config,
  job,
  basePath = "/",
  jobParam = "job",
  theme = "document",
  labels = "narrow",
  parts = {},
  gearSetEnd,
  label = "Character panel",
  renderLink = defaultLink,
  renderPortrait = defaultPortrait,
  isParamActive,
}: EquipmentPanelProps) {
  // Tooltip ids must be unique even with two panels on one page.
  const idPrefix = useId();
  // This job's own URL, which a param action adds its parameter to.
  const currentHref = jobHref(config, job.id, basePath, jobParam);
  const { bar = true, characterName = true, jobMenu = true, gearSet = true, toolbar = false, sockets = false } = parts;

  return (
    <section className="cs" data-cs-theme={theme} data-cs-labels={labels} aria-label={label}>
      {bar && (
        <div className="cs__bar">
          <p className="cs__bar-title">{config.title ?? label}</p>
          {characterName && config.characterName && <p className="cs__bar-name">{config.characterName}</p>}
        </div>
      )}

      <EquipmentBody
        config={config}
        job={job}
        idPrefix={idPrefix}
        basePath={basePath}
        currentHref={currentHref}
        jobParam={jobParam}
        parts={{ gearSet, jobMenu, toolbar, sockets }}
        gearSetEnd={gearSetEnd}
        renderLink={renderLink}
        renderPortrait={renderPortrait}
        isParamActive={isParamActive}
      />
    </section>
  );
}
