/// <reference types="vite/client" />
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterWindow, type CharacterWindowProps } from "./CharacterWindow.tsx";
import type { LinkRendererProps } from "./EquipmentBody.tsx";
import { parseConfig } from "./parse.ts";
import { resolveTab } from "./resolve.ts";
import type { Block, CharacterPanelConfig, Job } from "./types.ts";

// The window as a server renders it, as EquipmentPanel.test.tsx does for
// the panel: targeted assertions on the markup hosts and assistive tech
// rely on (links and their intents, aria-current, names, tooltips tied to
// their rows). Hover, focus, Escape and the layouts are browser tests.

const gauges: Block = {
  type: "gauges",
  id: "vitals",
  label: "Vitals",
  iconName: "heart",
  rows: [
    { label: "Years", value: "6", secondary: "since 2020", fill: 75, tone: "primary" },
    { label: "Focus", value: "80%", tone: "secondary", tooltip: { title: "Focus", note: "This month." } },
  ],
};

const stats: Block = {
  type: "stats",
  groups: [
    {
      label: "Core",
      icon: "✦",
      rows: [
        { label: "Front end", value: "92", tone: "highlight", tooltip: { title: "Front end" } },
        { label: "Review time", value: "1.2 d", tone: "muted" },
      ],
    },
    { rows: [{ label: "Plain", value: "1" }] },
  ],
};

const fields: Block = {
  type: "fields",
  rows: [
    { label: "Title", value: "Developer", caption: "Since 2022", iconName: "crest" },
    { label: "Location", value: "Remote", overline: "Time zone" },
    { label: "Writing", value: "Notes", action: { kind: "link", href: "/writing" } },
    { label: "Persona", value: "Data", action: { kind: "job", id: "data" } },
    { label: "Stack", value: "React", action: { kind: "param", name: "stack", value: "react" } },
    // Names the renamed tab parameter in one test below.
    { label: "Clash", value: "Tab", action: { kind: "param", name: "t", value: "x" } },
  ],
};

const tabs: CharacterPanelConfig["tabs"] = [
  { id: "attributes", label: "Attributes", iconName: "crest", blocks: [gauges, stats] },
  { id: "profile", label: "Profile", blocks: [fields] },
  {
    id: "skills",
    label: "Skills",
    pages: [
      { id: "build", label: "Build", icon: "⚒", blocks: [{ type: "stats", groups: [{ rows: [{ label: "Typing", value: "7" }] }] }] },
      { id: "run", label: "Run", blocks: [{ type: "stats", groups: [{ rows: [{ label: "Ops", value: "3" }] }] }] },
    ],
  },
  { id: "secret", label: "Secret", hidden: true, blocks: [fields] },
];

const web: Job = {
  id: "web",
  name: "Web",
  title: "Web developer",
  status: "published",
  level: { label: "Lv.", value: "4" },
  slots: {
    react: {
      tooltip: { title: "React projects" },
      action: { kind: "param", name: "stack", value: "react", target: "projects" },
    },
  },
};

const data: Job = {
  id: "data",
  name: "Data",
  title: "Data engineer",
  status: "published",
  level: { label: "Lv.", value: "2" },
  slots: {},
  blocks: { vitals: { type: "gauges", rows: [{ label: "Pipelines", value: "12" }] } },
};

const config: CharacterPanelConfig = {
  title: "Profile",
  characterName: "Alex Le",
  defaultJobId: "web",
  tabs,
  slots: [{ id: "react", label: "React", position: "right" }],
  jobs: [web, data],
};

function render(props: Partial<CharacterWindowProps> = {}): string {
  return renderToStaticMarkup(<CharacterWindow config={config} job={web} {...props} />);
}

// Opening tags with their attributes, as in EquipmentPanel.test.tsx (kept
// in each test file: a shared helper in src/ would be built and published).
type Tag = { name: string; attrs: Record<string, string> };

const unescape = (value: string) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");

function tags(html: string): Tag[] {
  return [...html.matchAll(/<([a-z][a-z0-9]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/g)].map(([, name, rest]) => ({
    name,
    attrs: Object.fromEntries(
      [...rest.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map(([, key, value]) => [key, unescape(value ?? "")]),
    ),
  }));
}

const withClass = (html: string, className: string) =>
  tags(html).filter((tag) => tag.attrs.class?.split(" ").includes(className));

const section = (html: string) => tags(html).find((tag) => tag.name === "section");
const byId = (html: string, id: string) => tags(html).find((tag) => tag.attrs.id === id);

// A renderLink that writes its intent out, so tests can read it.
const intentLink = ({ intent, ...props }: LinkRendererProps) => (
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- children come in through props
  <a data-intent={intent} {...props} />
);

const tabLinks = (html: string) => withClass(html, "cs__tab").map((tag) => tag.attrs);
const pageLinks = (html: string) => withClass(html, "cs__page").map((tag) => tag.attrs);

describe("CharacterWindow (server render)", () => {
  it("is a labelled landmark carrying its theme and label mode", () => {
    expect(section(render({ theme: "game", labels: "always", label: "Profile window" }))).toEqual({
      name: "section",
      attrs: {
        class: "cs cs--window",
        "data-cs-theme": "game",
        "data-cs-labels": "always",
        "aria-label": "Profile window",
      },
    });
  });

  it("draws the bar with the title and character name, unless parts turn them off", () => {
    expect(render()).toContain('<p class="cs__bar-title">Profile</p><p class="cs__bar-name">Alex Le</p>');
    expect(render({ parts: { characterName: false } })).not.toContain("cs__bar-name");
    expect(render({ parts: { bar: false } })).not.toContain("cs__bar");
  });

  describe("tab strip", () => {
    it("is a navigation list of tab links, the first visible tab at the bare path", () => {
      const html = render({ renderLink: intentLink, basePath: "/about" });
      expect(tags(html).find((tag) => tag.name === "nav")?.attrs).toEqual({ class: "cs__tabs", "aria-label": "Tabs" });
      expect(tabLinks(html)).toEqual([
        { "data-intent": "tab", href: "/about", class: "cs__tab", "aria-current": "page" },
        { "data-intent": "tab", href: "/about?tab=profile", class: "cs__tab" },
        { "data-intent": "tab", href: "/about?tab=skills", class: "cs__tab" },
      ]);
    });

    it("leaves out hidden tabs and the ones hiddenTabs names, with the first shown one as the default", () => {
      expect(render()).not.toContain("Secret");
      const html = render({ hiddenTabs: ["attributes"] });
      expect(tabLinks(html).map((link) => link.href)).toEqual(["/", "/?tab=skills"]);
      expect(html).toContain('<span class="cs__tab-label">Profile</span>');
      expect(html).not.toContain("Attributes");
    });

    it("marks the tab in the URL as current, falling back to the first for an unknown one", () => {
      expect(tabLinks(render({ tab: "profile" })).map((link) => link["aria-current"])).toEqual([undefined, "page", undefined]);
      expect(tabLinks(render({ tab: "nope" }))[0]["aria-current"]).toBe("page");
      expect(tabLinks(render({ tab: ["profile", "skills"] }))[1]["aria-current"]).toBe("page");
    });

    it("draws the pointer and the tab's icon, both hidden from assistive tech", () => {
      const html = render();
      expect(withClass(html, "cs__tab-marker")).toEqual([
        { name: "span", attrs: { class: "cs__tab-marker", "aria-hidden": "true" } },
      ]);
      // Attributes sets iconName; Profile and Skills set none, so no icon.
      expect(withClass(html, "cs__tab-icon")).toHaveLength(1);
    });

    it("marks the tab holding a later page current, but not as the page", () => {
      expect(tabLinks(render({ tab: "skills", page: "run" }))[2]["aria-current"]).toBe("true");
      expect(tabLinks(render({ tab: "skills" }))[2]["aria-current"]).toBe("page");
      expect(tabLinks(render({ tab: "skills", page: "build" }))[2]["aria-current"]).toBe("page");
    });

    it("keeps the job and drops the page when switching tab", () => {
      const html = render({ job: data, tab: "skills", page: "run" });
      expect(tabLinks(html).map((link) => link.href)).toEqual(["/?job=data", "/?job=data&tab=profile", "/?job=data&tab=skills"]);
    });

    it("isn't drawn with one visible tab, whose content still is", () => {
      const html = render({ hiddenTabs: ["profile", "skills"] });
      expect(html).not.toContain("cs__tabs");
      expect(html).toContain("cs__content");
      expect(html).toContain("Years");
    });

    it("uses the host's parameter names", () => {
      const html = render({ tabParam: "t", pageParam: "p", tab: "skills", page: "run" });
      expect(tabLinks(html).map((link) => link.href)).toEqual(["/", "/?t=profile", "/?t=skills"]);
      expect(pageLinks(html).map((link) => link.href)).toEqual(["/?t=skills", "/?t=skills&p=run"]);
    });
  });

  describe("sub-tabs", () => {
    it("are a second navigation list named by their tab, the first page at the tab's own URL", () => {
      const html = render({ renderLink: intentLink, tab: "skills" });
      expect(tags(html).filter((tag) => tag.name === "nav")[1]?.attrs).toEqual({ class: "cs__pages", "aria-label": "Skills" });
      expect(pageLinks(html)).toEqual([
        { "data-intent": "tab", href: "/?tab=skills", class: "cs__page", "aria-current": "page" },
        { "data-intent": "tab", href: "/?tab=skills&page=run", class: "cs__page" },
      ]);
      expect(html).toContain('<span class="cs__page-icon" aria-hidden="true">⚒</span>');
      expect(html).not.toContain("cs__page-marker");
    });

    it("show the page in the URL, or the first for an unknown one", () => {
      expect(render({ tab: "skills", page: "run" })).toContain("Ops");
      expect(render({ tab: "skills", page: "run" })).not.toContain("Typing");
      expect(render({ tab: "skills", page: "nope" })).toContain("Typing");
    });

    it("aren't drawn for a tab of blocks", () => {
      expect(render()).not.toContain("cs__pages");
    });
  });

  describe("blocks", () => {
    it("draw only the active tab's", () => {
      const html = render();
      expect(html).toContain("cs-block--gauges");
      expect(html).toContain("cs-block--stats");
      expect(html).not.toContain("cs-block--fields");
    });

    it("are named by their heading when they have one", () => {
      const block = withClass(render(), "cs-block--gauges")[0];
      expect(block.attrs.role).toBe("group");
      expect(byId(render(), block.attrs["aria-labelledby"])?.attrs.class).toBe("cs-block__label");
      // The stats block has no label: no group, no name.
      expect(withClass(render(), "cs-block--stats")[0].attrs).toEqual({ class: "cs-block cs-block--stats" });
    });

    it("are swapped for the job's replacement by id", () => {
      const html = render({ job: data });
      expect(html).toContain("Pipelines");
      expect(html).not.toContain("Years");
      // The replacement has no label of its own: the shared one's isn't kept.
      expect(html).not.toContain("Vitals");
    });

    it("leave out levels and progress blocks for now, and the rest still draw", () => {
      const html = render({
        config: {
          ...config,
          tabs: [
            {
              id: "only",
              label: "Only",
              blocks: [
                { type: "levels", groups: [{ rows: [{ label: "React", level: "7" }] }] },
                { type: "progress", groups: [{ rows: [{ label: "Project", fill: 50 }] }] },
                fields,
              ],
            },
          ],
        },
      });
      expect(html).not.toContain("cs-block--levels");
      expect(html).not.toContain("cs-block--progress");
      expect(html).toContain("cs-block--fields");
    });
  });

  describe("gauges", () => {
    it("draw a meter from 0 to 100, named by the row's label, defaulting to full", () => {
      const html = render();
      const meters = tags(html).filter((tag) => tag.attrs.role === "meter");
      expect(meters.map((tag) => tag.attrs["aria-valuenow"])).toEqual(["75", "100"]);
      for (const meter of meters) {
        expect(meter.attrs).toMatchObject({ class: "cs-meter", "aria-valuemin": "0", "aria-valuemax": "100" });
        expect(byId(html, meter.attrs["aria-labelledby"])?.attrs.class).toBe("cs-gauge__label");
      }
      expect(html).toContain('style="width:75%"');
    });

    it("carry their tone and secondary line", () => {
      const html = render();
      expect(withClass(html, "cs-gauge").map((tag) => tag.attrs.class)).toEqual([
        "cs-gauge cs-gauge--primary",
        "cs-gauge cs-gauge--secondary",
      ]);
      expect(html).toContain('<span class="cs-gauge__secondary">since 2020</span>');
    });

    it("are focusable only with a tooltip, named by label and value and described by the card", () => {
      const html = render();
      const [plain, withTip] = withClass(html, "cs-gauge__face");
      expect(plain.attrs).toEqual({ class: "cs-gauge__face" });
      expect(withTip.attrs).toMatchObject({ role: "group", tabindex: "0" });
      const [label, value] = withTip.attrs["aria-labelledby"].split(" ");
      expect(byId(html, label)?.attrs.class).toBe("cs-gauge__label");
      expect(byId(html, value)?.attrs.class).toBe("cs-gauge__value");
      expect(byId(html, withTip.attrs["aria-describedby"])?.attrs).toMatchObject({ class: "cs-tip", role: "tooltip" });
    });
  });

  describe("stats", () => {
    it("are a <dl> per group, named by its label, rows carrying their tone", () => {
      const html = render();
      expect(withClass(html, "cs-stats").map((tag) => tag.name)).toEqual(["dl", "dl"]);
      const [core, plain] = withClass(html, "cs-group");
      expect(core.attrs.role).toBe("group");
      expect(byId(html, core.attrs["aria-labelledby"])?.attrs.class).toBe("cs-group__label");
      expect(plain.attrs).toEqual({ class: "cs-group" });
      expect(withClass(html, "cs-stat").map((tag) => tag.attrs.class)).toEqual([
        "cs-stat cs-stat--highlight",
        "cs-stat cs-stat--muted",
        "cs-stat cs-stat--default",
      ]);
      expect(html).toContain('<span class="cs-group__icon" aria-hidden="true">✦</span>');
    });

    it("put a tooltip row's trigger in its dt, named by label and value", () => {
      const html = render();
      const trigger = withClass(html, "cs-stat__face").find((tag) => tag.attrs.tabindex === "0")!;
      const [label, value] = trigger.attrs["aria-labelledby"].split(" ");
      expect(html).toContain(`<span id="${label}">Front end</span>`);
      expect(byId(html, value)).toMatchObject({ name: "dd", attrs: { class: "cs-stat__value" } });
      expect(html).toMatch(/<dt class="cs-stat__label"><div class="cs-slot__hover"><span class="cs-stat__face" role="group"/);
      // The card's subtitle falls back to the row's label.
      expect(html).toContain('<p class="cs-tip__title">Front end</p><p class="cs-tip__category">Front end</p>');
    });
  });

  describe("fields", () => {
    const profile = (props: Partial<CharacterWindowProps> = {}) => render({ tab: "profile", renderLink: intentLink, ...props });

    it("are a <dl> of ruled labels over value lines", () => {
      const html = profile();
      expect(html).toContain('<dt class="cs-field__label">Title</dt>');
      expect(html).toContain(
        '<span class="cs-field__text"><span class="cs-field__overline">Time zone</span><span class="cs-field__value">Remote</span></span>',
      );
      expect(html).toContain('<span class="cs-field__caption">Since 2022</span>');
      // Only the row with an icon draws one.
      expect(withClass(html, "cs-field__icon")).toHaveLength(1);
    });

    it("make the value line the link when the row has an action", () => {
      const lines = withClass(profile({ job: data }), "cs-field__line").map(({ name, attrs }) => ({ name, ...attrs }));
      expect(lines).toEqual([
        { name: "span", class: "cs-field__line" },
        { name: "span", class: "cs-field__line" },
        { name: "a", class: "cs-field__line", "data-intent": "page", href: "/writing" },
        // A job action: links like the job menu, keeping the tab, current on its job.
        { name: "a", class: "cs-field__line", "data-intent": "job", href: "/?job=data&tab=profile", "aria-current": "true" },
        // A param action keeps job and tab.
        { name: "a", class: "cs-field__line", "data-intent": "param", href: "/?job=data&tab=profile&stack=react" },
        // "t" isn't the tab parameter here (that's "tab"), so it links.
        { name: "a", class: "cs-field__line", "data-intent": "param", href: "/?job=data&tab=profile&t=x" },
      ]);
    });

    it("render a param action naming a renamed tab or page parameter without a link", () => {
      const html = render({ tab: "profile", tabParam: "t" });
      expect(withClass(html, "cs-field__line").filter((tag) => tag.name === "a").map((tag) => tag.attrs.href)).not.toContain(
        "/?tab=profile&t=x",
      );
      expect(withClass(html, "cs-field__line").at(-1)).toEqual({ name: "span", attrs: { class: "cs-field__line" } });
    });
  });

  describe("equipment pane", () => {
    it("wraps the panel's inside, after the content pane", () => {
      const html = render();
      expect(html.indexOf("cs__content")).toBeLessThan(html.indexOf("cs__equipment"));
      expect(html).toMatch(/<div class="cs__equipment"><div class="cs__gear">/);
      expect(html).toContain('<p class="cs__job-title">Web developer</p>');
    });

    it("keeps the tab and page in job links and param actions", () => {
      const html = render({ tab: "skills", page: "run" });
      expect(withClass(html, "cs__jobs-link").map((tag) => tag.attrs.href)).toEqual([
        "/?tab=skills&page=run",
        "/?tab=skills&page=run&job=data",
      ]);
      expect(withClass(html, "cs-slot__face")[0].attrs.href).toBe("/?tab=skills&page=run&stack=react#projects");
    });

    it("takes the host's gearSetEnd", () => {
      expect(render({ gearSetEnd: <button type="button">Save</button> })).toContain(
        '<div class="cs__gear-end"><button type="button">Save</button></div>',
      );
    });
  });

  describe("parts", () => {
    it("tabs: false leaves the bar and the equipment pane, as wide as the panel", () => {
      const html = render({ parts: { tabs: false } });
      expect(html).not.toContain("cs__tabs");
      expect(html).not.toContain("cs__content");
      expect(html).toContain("cs__equipment");
      expect(section(html)?.attrs.class).toBe("cs cs--window cs--single");
      // No tab in its URLs either.
      expect(withClass(html, "cs__jobs-link").map((tag) => tag.attrs.href)).toEqual(["/", "/?job=data"]);
    });

    it("equipment: false leaves the tabs and content", () => {
      const html = render({ parts: { equipment: false } });
      expect(html).toContain("cs__content");
      expect(html).not.toContain("cs__equipment");
      expect(html).not.toContain("cs__header");
      expect(section(html)?.attrs.class).toBe("cs cs--window cs--single");
    });

    it("the equipment pane's own parts pass through", () => {
      const html = render({ parts: { gearSet: false, toolbar: true } });
      expect(html).not.toContain("cs__gear");
      expect(html).toContain("cs__toolbar");
    });

    it("a config with no tabs draws the equipment pane alone", () => {
      const html = render({ config: { ...config, tabs: undefined } });
      expect(html).not.toContain("cs__content");
      expect(section(html)?.attrs.class).toBe("cs cs--window cs--single");
    });
  });

  it("gives every id it draws once", () => {
    const html = render({ tab: "attributes" });
    const ids = tags(html).flatMap((tag) => tag.attrs.id ?? []);
    expect(ids.length).toBeGreaterThan(5);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the example configs in the window", () => {
  const examples = import.meta.glob<unknown>("../examples/*.json", { eager: true, import: "default" });

  // A smoke test: every visible tab and page of every example, for every
  // job, renders without throwing.
  it.each(Object.entries(examples))("%s renders every tab for every job", (_, raw) => {
    const { config: parsed } = parseConfig(raw);
    expect(parsed).not.toBeNull();
    const views = (parsed!.tabs ?? []).flatMap((tab) =>
      tab.pages ? tab.pages.map((page) => [tab.id, page.id]) : [[tab.id, undefined]],
    );
    for (const job of parsed!.jobs) {
      for (const [tab, page] of views.length > 0 ? views : [[undefined, undefined]]) {
        const html = renderToStaticMarkup(<CharacterWindow config={parsed!} job={job} tab={tab} page={page} />);
        expect(section(html)?.attrs.class).toMatch(/^cs cs--window/);
        if (resolveTab(parsed!, tab, page)) expect(html).toContain("cs__content");
      }
    }
  });
});
