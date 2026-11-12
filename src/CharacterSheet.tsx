import { useId, type ReactNode } from "react";
import { defaultLink, defaultPortrait, EquipmentBody, glyph, type LinkRendererProps } from "./EquipmentBody.tsx";
import { jobHref } from "./resolve.ts";
import type { CharacterSheetConfig, Job, Portrait, Theme } from "./types.ts";
import "./character-sheet.css";

export type { LinkRendererProps };

// An equipment-screen style panel:
//   top bar      title, and the job menu
//   header       [header-start slot]  level, emblem, job title  [header-end slot]
//   body         left column | portrait (optional corner badge) | right column
// The header and body are EquipmentBody (src/EquipmentBody.tsx); this adds
// the section around them and the bar.
//
// A Server Component with no framework imports. The host passes its own
// link and image components, so in Next.js links use <Link> and the
// portrait goes through next/image; anywhere else the defaults are plain
// <a> and <img>.

export type CharacterSheetProps = {
  config: CharacterSheetConfig;
  job: Job;
  // The page the panel is on, for job links (?job=<id>).
  basePath?: string;
  jobParam?: string;
  theme?: Theme;
  // Slot names under the squares: "narrow" shows them only when the panel
  // is narrow (touch screens have no hover tooltip); "always" shows them
  // at every width. Either way they are the slots' accessible names.
  labels?: "narrow" | "always";
  // Decorative extras with no function yet: two socket dots on each filled
  // slot, and a row of round buttons under the portrait. Hidden from
  // assistive tech and not focusable until they do something.
  showSockets?: boolean;
  showToolbar?: boolean;
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

export function CharacterSheet({
  config,
  job,
  basePath = "/",
  jobParam = "job",
  theme = "document",
  labels = "narrow",
  showSockets = false,
  showToolbar = false,
  label = "Character sheet",
  renderLink = defaultLink,
  renderPortrait = defaultPortrait,
  isParamActive,
}: CharacterSheetProps) {
  // Tooltip ids must be unique even with two panels on one page.
  const idPrefix = useId();
  // This job's own URL, which a param action adds its parameter to.
  const currentHref = jobHref(config, job.id, basePath, jobParam);

  return (
    <section className="cs" data-cs-theme={theme} data-cs-labels={labels} aria-label={label}>
      <div className="cs__bar">
        <p className="cs__bar-title">{config.title ?? label}</p>
        {config.jobs.length > 1 && (
          // Keyed by job so the menu closes after a job change, which
          // re-renders this panel without reloading the page.
          <details className="cs__jobs" key={job.id}>
            <summary className="cs__jobs-toggle">Change job</summary>
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

      <EquipmentBody
        slots={config.slots}
        job={job}
        idPrefix={idPrefix}
        currentHref={currentHref}
        jobParam={jobParam}
        showSockets={showSockets}
        showToolbar={showToolbar}
        renderLink={renderLink}
        renderPortrait={renderPortrait}
        isParamActive={isParamActive}
      />
    </section>
  );
}
