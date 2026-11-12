import { useId, type ReactNode } from "react";
import { BlockList } from "./Blocks.tsx";
import { defaultLink, defaultPortrait, EquipmentBody, type LinkRendererProps } from "./EquipmentBody.tsx";
import type { EquipmentPanelParts, EquipmentPanelProps } from "./EquipmentPanel.tsx";
import { hasIcon, Icon, TabMarkerIcon } from "./icons.tsx";
import { jobHref, resolveBlocks, resolveTab, tabHref, visiblePages, visibleTabs } from "./resolve.ts";
import type { Tab, TabPage } from "./types.ts";
import "./character-panel.css";

// The whole character window, around the equipment pane:
//   top bar      title ........................ character name
//   tab strip    [ tab ▸ ] [ tab ] [ tab ]
//   panes        content of the active tab  |  equipment pane
// The content pane is the active tab's blocks, under its sub-tabs if it
// has pages; the equipment pane is EquipmentPanel's inside (gear set,
// header, body). Below a 46rem container width the panes stack, in DOM
// order: tab strip, content, equipment.
//
// A Server Component, like EquipmentPanel. Tabs and pages are links
// (?tab=, ?page=), so switching needs no JavaScript, the back button works,
// and only the active tab is in the HTML.

// EquipmentPanel's parts, plus the window's own two.
export type CharacterWindowParts = EquipmentPanelParts & {
  tabs?: boolean; // default true: the tab strip and the content pane
  equipment?: boolean; // default true: the equipment pane
};

export type CharacterWindowProps = Omit<EquipmentPanelProps, "parts"> & {
  // The raw ?tab= and ?page= values; an unknown or missing one falls back
  // to the first visible tab, or the tab's first page.
  tab?: string | string[];
  page?: string | string[];
  tabParam?: string;
  pageParam?: string;
  parts?: CharacterWindowParts;
  // Tab ids to leave out in this placement.
  hiddenTabs?: readonly string[];
};

export function CharacterWindow({
  config,
  job,
  tab: tabValue,
  page: pageValue,
  basePath = "/",
  jobParam = "job",
  tabParam = "tab",
  pageParam = "page",
  theme = "document",
  labels = "narrow",
  parts = {},
  hiddenTabs = [],
  gearSetEnd,
  label = "Character panel",
  renderLink = defaultLink,
  renderPortrait = defaultPortrait,
  isParamActive,
}: CharacterWindowProps) {
  const idPrefix = useId();
  const {
    bar = true,
    characterName = true,
    jobMenu = true,
    gearSet = true,
    toolbar = false,
    sockets = false,
    tabs = true,
    equipment = true,
  } = parts;

  // The tabs this placement leaves out go from the config itself, so
  // resolveTab and tabHref agree on which tab comes first.
  const shown =
    hiddenTabs.length > 0 && config.tabs
      ? { ...config, tabs: config.tabs.filter((tab) => !hiddenTabs.includes(tab.id)) }
      : config;
  const active = tabs ? resolveTab(shown, tabValue, pageValue) : null;
  const names = { tabParam, pageParam };
  // This view's own URL: job, tab and page, each left out when it's the
  // default. Job links keep the tab and page; a param action keeps all three.
  const jobOnly = jobHref(config, job.id, basePath, jobParam);
  const currentHref = active ? tabHref(shown, active.tab.id, jobOnly, { ...names, page: active.page?.id }) : jobOnly;
  const ownParams = [jobParam, tabParam, pageParam];
  const context = { config, job, jobParam, ownParams, currentHref, renderLink, isParamActive };

  const tabList = active ? visibleTabs(shown) : [];
  const pageList = active?.page ? visiblePages(active.tab) : [];
  const both = active !== null && equipment;
  // On a later page the active tab's link (to its first page) isn't this
  // view, only the tab it is in.
  const activeTabCurrent = active?.page && active.page !== pageList[0] ? "true" : "page";

  return (
    <section
      className={`cs cs--window${both ? "" : " cs--single"}`}
      data-cs-theme={theme}
      data-cs-labels={labels}
      aria-label={label}
    >
      {bar && (
        <div className="cs__bar">
          <p className="cs__bar-title">{config.title ?? label}</p>
          {characterName && config.characterName && <p className="cs__bar-name">{config.characterName}</p>}
        </div>
      )}

      <div className="cs__panes">
        {active && tabList.length > 1 && (
          <nav className="cs__tabs" aria-label="Tabs">
            <ul className="cs__tab-list">
              {tabList.map((tab) => (
                <li key={tab.id}>
                  <TabLink
                    item={tab}
                    href={tabHref(shown, tab.id, currentHref, names)}
                    current={tab.id === active.tab.id && activeTabCurrent}
                    className="cs__tab"
                    marker
                    renderLink={renderLink}
                  />
                </li>
              ))}
            </ul>
          </nav>
        )}

        {active && (
          <div className="cs__content">
            {pageList.length > 1 && (
              <nav className="cs__pages" aria-label={active.tab.label}>
                <ul className="cs__page-list">
                  {pageList.map((page) => (
                    <li key={page.id}>
                      <TabLink
                        item={page}
                        href={tabHref(shown, active.tab.id, currentHref, { ...names, page: page.id })}
                        current={page.id === active.page?.id && "page"}
                        className="cs__page"
                        renderLink={renderLink}
                      />
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <BlockList
              blocks={resolveBlocks(active.page ? active.page.blocks : (active.tab.blocks ?? []), job)}
              idPrefix={idPrefix}
              context={context}
            />
          </div>
        )}

        {equipment && (
          <div className="cs__equipment">
            <EquipmentBody
              config={config}
              job={job}
              idPrefix={idPrefix}
              basePath={currentHref}
              currentHref={currentHref}
              jobParam={jobParam}
              ownParams={ownParams}
              parts={{ gearSet, jobMenu, toolbar, sockets }}
              gearSetEnd={gearSetEnd}
              renderLink={renderLink}
              renderPortrait={renderPortrait}
              isParamActive={isParamActive}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// A tab or sub-tab: a link, aria-current on the one showing.
function TabLink({
  item,
  href,
  current,
  className,
  marker = false,
  renderLink,
}: {
  item: Tab | TabPage;
  href: string;
  // Its aria-current: "page" when its link is this view, "true" for the
  // tab holding a later page, false otherwise.
  current: "page" | "true" | false;
  className: string;
  // Draw the pointer beside the current one (top-level tabs).
  marker?: boolean;
  renderLink: (props: LinkRendererProps) => ReactNode;
}) {
  return renderLink({
    href,
    intent: "tab",
    className,
    "aria-current": current || undefined,
    children: (
      <>
        {marker && current && (
          <span className={`${className}-marker`} aria-hidden="true">
            <TabMarkerIcon />
          </span>
        )}
        {hasIcon(item) && (
          <span className={`${className}-icon`} aria-hidden="true">
            <Icon {...item} fallback={null} />
          </span>
        )}
        <span className={`${className}-label`}>{item.label}</span>
      </>
    ),
  });
}
