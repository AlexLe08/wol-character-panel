/// <reference types="vite/client" />
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EquipmentPanel, type EquipmentPanelProps } from "./EquipmentPanel.tsx";
import { parseConfig } from "./parse.ts";
import { LIMITS } from "./schema.ts";
import type { CharacterPanelConfig, GearSet, GearSetLink, Job, SlotContent } from "./types.ts";
import type { LinkRendererProps } from "./EquipmentBody.tsx";

// The panel as a server renders it: HTML from react-dom/server in plain
// Node, no DOM and no JavaScript in a browser. That is what a host's page
// shows before hydration (or without JavaScript at all), so these tests pin
// the markup hosts and assistive tech rely on: links and their intents,
// accessible names, and tooltips tied to their slots. Hover, focus and
// Escape need a browser, so they're checked against the playground instead.

const tip = (title: string): SlotContent["tooltip"] => ({ title });

const slots: CharacterPanelConfig["slots"] = [
  { id: "stack", label: "Core stack", position: "header-start", icon: "◆" },
  { id: "extra", label: "Extra", position: "header-start" },
  { id: "focus", label: "Focus", position: "header-end" },
  { id: "skills", label: "Skills", position: "left" },
  { id: "projects", label: "Projects", position: "left" },
  { id: "notes", label: "Notes", position: "left" },
  { id: "unused", label: "Unused", position: "left" },
  { id: "react", label: "React", position: "right" },
  { id: "jobs", label: "Jobs", position: "right" },
  { id: "github", label: "GitHub", position: "right" },
  { id: "blog", label: "Blog", position: "right" },
];

const web: Job = {
  id: "web",
  name: "Web",
  title: "Web developer",
  status: "published",
  level: { label: "Lv.", value: "4" },
  badge: { label: "Projects", value: "6" },
  slots: {
    stack: {
      tooltip: { title: "React", tags: ["Daily"], stat: { label: "Years", value: "4" } },
      action: { kind: "anchor", target: "skills" },
    },
    extra: { tooltip: tip("Never shown"), action: { kind: "none" } },
    focus: { tooltip: tip("Focus"), action: { kind: "none" } },
    skills: {
      tooltip: { title: "Skills", items: [{ label: "UI", value: "React" }, "Accessibility"], note: "Most used first." },
      action: { kind: "anchor", target: "skills" },
    },
    projects: { tooltip: tip("Projects"), action: { kind: "link", href: "/projects" } },
    notes: { tooltip: tip("Notes"), action: { kind: "none" }, iconSrc: "/notes.svg" },
    react: { tooltip: tip("React projects"), action: { kind: "param", name: "stack", value: "react", target: "projects" } },
    // Names the job parameter, so it must not render as a link.
    jobs: { tooltip: tip("Jobs"), action: { kind: "param", name: "job", value: "data" } },
    github: { tooltip: tip("GitHub"), action: { kind: "external", href: "https://github.com/", newTab: true } },
    blog: { tooltip: tip("Blog"), action: { kind: "external", href: "https://example.com/blog" } },
  },
};

const data: Job = {
  id: "data",
  name: "Data",
  title: "Data engineer",
  status: "published",
  level: { label: "Lv.", value: "2" },
  portrait: { src: "/me.png", alt: "Portrait", framing: "full" },
  slots: {},
};

const config: CharacterPanelConfig = { title: "Profile", defaultJobId: "web", slots, jobs: [web, data] };

function render(props: Partial<EquipmentPanelProps> = {}): string {
  return renderToStaticMarkup(<EquipmentPanel config={config} job={web} {...props} />);
}

// The opening tags of server-rendered HTML, with their attributes, which is
// enough to check attributes without a DOM. React writes every attribute
// value in double quotes and escapes &, <, >, " and '.
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

// A filled slot's focusable face: the element its tooltip describes.
function face(html: string, slotId: string): Tag {
  const found = withClass(html, "cs-slot__face").filter((tag) => tag.attrs["aria-describedby"]?.endsWith(`tip-${slotId}`));
  expect(found, `face of slot ${slotId}`).toHaveLength(1);
  return found[0];
}

// React 19 may put <link rel="preload"> hints for images first, so look the
// panel up by name rather than taking the first tag.
const section = (html: string) => tags(html).find((tag) => tag.name === "section");

const tooltipIds = (html: string) => tags(html).filter((tag) => tag.attrs.role === "tooltip").map((tag) => tag.attrs.id);

describe("EquipmentPanel (server render)", () => {
  it("is a labelled landmark carrying its theme and label mode", () => {
    expect(section(render({ theme: "game", labels: "always", label: "Profile panel" }))).toEqual({
      name: "section",
      attrs: { class: "cs", "data-cs-theme": "game", "data-cs-labels": "always", "aria-label": "Profile panel" },
    });
  });

  it("defaults to the document theme, narrow labels and a generic name", () => {
    const html = render({ config: { ...config, title: undefined } });
    expect(section(html)?.attrs).toMatchObject({
      "data-cs-theme": "document",
      "data-cs-labels": "narrow",
      "aria-label": "Character panel",
    });
    expect(html).toContain('<p class="cs__bar-title">Character panel</p>');
  });

  it("shows the config's title in the top bar", () => {
    expect(render()).toContain('<p class="cs__bar-title">Profile</p>');
  });

  describe("job menu", () => {
    it("links every job, marking the current one", () => {
      const links = withClass(render({ basePath: "/about", jobParam: "j" }), "cs__jobs-link");
      expect(links.map((link) => link.attrs)).toEqual([
        { href: "/about", class: "cs__jobs-link", "aria-current": "true" },
        { href: "/about?j=data", class: "cs__jobs-link" },
      ]);
    });

    it("passes the job intent to a host's link renderer", () => {
      const intents: string[] = [];
      render({
        renderLink: ({ intent, href, children }) => {
          intents.push(`${intent} ${href}`);
          return <a href={href}>{children}</a>;
        },
      });
      expect(intents).toEqual(expect.arrayContaining(["job /", "job /?job=data"]));
    });

    it("is left out when there is only one job", () => {
      const html = render({ config: { ...config, jobs: [web] } });
      expect(html).not.toContain("cs__jobs");
      expect(html).not.toContain("Change job");
    });

    it("is a details element in the gear-set row, so it opens without JavaScript", () => {
      const html = render();
      expect(html).toMatch(
        /<div class="cs__gear"><div class="cs__gear-start"><details class="cs__jobs"><summary class="cs__jobs-toggle cs__gear-button">/,
      );
      expect(html).toContain('<span class="cs-visually-hidden">Change job</span></summary>');
    });

    it("is no longer in the bar", () => {
      const html = render();
      expect(html.slice(html.indexOf("cs__bar"), html.indexOf("cs__gear"))).not.toContain("cs__jobs");
    });

    it("draws a note as its toggle unless the config names another icon and label", () => {
      const toggle = (html: string) => html.slice(html.indexOf("cs__jobs-toggle"), html.indexOf("</summary>"));
      expect(toggle(render())).toContain('<svg class="cs-icon"');
      const gearSet = { jobMenu: { label: "Switch persona", icon: "≡" } };
      const custom = toggle(render({ config: { ...config, gearSet } }));
      expect(custom).toContain('<span class="cs__gear-icon" aria-hidden="true">≡</span>');
      expect(custom).toContain("Switch persona");
      expect(custom).not.toContain("<svg");
    });

    it("is left out with parts.jobMenu false, keeping the rest of the row", () => {
      const html = render({ config: { ...config, gearSet: { value: "v2" } }, parts: { jobMenu: false } });
      expect(html).not.toContain("cs__jobs");
      expect(html).toContain("cs__gear-caption");
    });
  });

  describe("header", () => {
    it("shows the level and job title, with the icon or the name's first letters as emblem", () => {
      const html = render();
      expect(html).toContain('<span class="cs__level-label">Lv.</span> <span class="cs__level-value">4</span>');
      expect(html).toContain('<span class="cs__job-emblem" aria-hidden="true">We</span>');
      expect(html).toContain('<p class="cs__job-title">Web developer</p>');
      expect(render({ job: { ...web, icon: "W" } })).toContain('<span class="cs__job-emblem" aria-hidden="true">W</span>');
    });

    it("keeps one slot each side of the job title", () => {
      const html = render();
      expect(face(html, "stack").attrs.href).toBe("#skills");
      expect(tooltipIds(html).some((id) => id.endsWith("tip-extra"))).toBe(false);
      expect(html).not.toContain("Never shown");
    });
  });

  describe("slots", () => {
    it("ties each tooltip to its face with matching ids", () => {
      const html = render();
      const described = withClass(html, "cs-slot__face")
        .map((tag) => tag.attrs["aria-describedby"])
        .filter(Boolean);
      expect(described.length).toBeGreaterThan(0);
      expect(tooltipIds(html)).toEqual(described);
    });

    it("gives two panels on one page different ids", () => {
      const html = renderToStaticMarkup(
        <>
          <EquipmentPanel config={config} job={web} />
          <EquipmentPanel config={config} job={web} />
        </>,
      );
      const ids = tags(html)
        .map((tag) => tag.attrs.id)
        .filter(Boolean);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("renders an anchor action as an in-page link", () => {
      expect(face(render(), "skills")).toMatchObject({ name: "a", attrs: { href: "#skills" } });
    });

    it("renders a link action through the host's renderer with the page intent", () => {
      const seen: string[] = [];
      const html = render({
        renderLink: ({ intent, href, children, ...rest }) => {
          seen.push(`${intent} ${href}`);
          return (
            <a href={href} {...rest}>
              {children}
            </a>
          );
        },
      });
      expect(seen).toContain("page /projects");
      // The renderer gets the face's class and tooltip link through its props.
      expect(face(html, "projects")).toMatchObject({ name: "a", attrs: { href: "/projects" } });
    });

    it("renders a param action on the job's own URL, with its target as the hash", () => {
      expect(face(render(), "react").attrs.href).toBe("/?stack=react#projects");
    });

    it("keeps the current job when a param action adds its parameter", () => {
      const job: Job = { ...data, slots: { react: web.slots.react } };
      expect(face(render({ job }), "react").attrs.href).toBe("/?job=data&stack=react#projects");
    });

    it("marks a param action current only when the host says so, never asking about the job parameter", () => {
      const asked: string[] = [];
      const html = render({
        isParamActive: (name, value) => {
          asked.push(`${name}=${value}`);
          return name === "stack" && value === "react";
        },
      });
      expect(face(html, "react").attrs["aria-current"]).toBe("true");
      expect(html).toContain('<li class="cs-slot cs-slot--param cs-slot--active">');
      expect(asked).toEqual(["stack=react"]);

      const unmarked = render();
      expect(face(unmarked, "react").attrs["aria-current"]).toBeUndefined();
      expect(unmarked).not.toContain("cs-slot--active");
    });

    it("makes a param action naming the job parameter a focusable group, not a link", () => {
      const html = render();
      const jobs = face(html, "jobs");
      expect(jobs.name).toBe("span");
      expect(jobs.attrs).toMatchObject({ role: "group", tabindex: "0" });
      expect(jobs.attrs.href).toBeUndefined();
      expect(jobs.attrs["aria-labelledby"]).toMatch(/label-jobs$/);
      expect(html).toContain(`id="${jobs.attrs["aria-labelledby"]}"`);
    });

    it("makes a slot with no action a focusable group, so keyboard users get its tooltip", () => {
      expect(face(render(), "notes")).toMatchObject({ name: "span", attrs: { role: "group", tabindex: "0" } });
    });

    it("opens an external link in a new tab only when asked, and says so", () => {
      const html = render();
      expect(face(html, "github").attrs).toMatchObject({
        href: "https://github.com/",
        target: "_blank",
        rel: "noopener noreferrer",
      });
      expect(html).toContain('<span class="cs-visually-hidden"> (opens in a new tab)</span>');
      expect(html.match(/opens in a new tab\)/g)).toHaveLength(1);

      const blog = face(html, "blog").attrs;
      expect(blog.href).toBe("https://example.com/blog");
      expect(blog.target).toBeUndefined();
    });

    it("renders a slot the job doesn't fill as an empty square with no tooltip", () => {
      const html = render();
      expect(withClass(html, "cs-slot--empty")).toHaveLength(1);
      const empty = withClass(html, "cs-slot__face").filter((tag) => !tag.attrs["aria-describedby"]);
      expect(empty).toEqual([{ name: "span", attrs: { class: "cs-slot__face" } }]);
      expect(html).toMatch(/Unused<\/span><span class="cs-visually-hidden"> \(empty\)<\/span>/);
      expect(tooltipIds(html).some((id) => id.endsWith("tip-unused"))).toBe(false);
    });

    it("draws at most LIMITS.slot.column slots in a side column", () => {
      const extra = Array.from({ length: LIMITS.slot.column }, (_, index) => ({
        id: `more-${index}`,
        label: `More ${index}`,
        position: "right" as const,
      }));
      const html = render({ config: { ...config, slots: [...slots, ...extra] } });
      const right = html.slice(html.indexOf("cs__slots--right"));
      expect(right.match(/<li class="cs-slot/g)).toHaveLength(LIMITS.slot.column);
      // The column has four slots already, so two of the extras fit.
      expect(html).toContain("More 1");
      expect(html).not.toContain("More 2");
    });

    it("renders an empty column as an empty div", () => {
      expect(render({ config: { ...config, slots: slots.filter((slot) => slot.position !== "right") } })).toContain(
        '<div class="cs__slots cs__slots--right"></div>',
      );
    });

    it("uses an image icon as decoration only", () => {
      const images = tags(render()).filter((tag) => tag.attrs.src === "/notes.svg");
      expect(images.map((tag) => tag.attrs)).toEqual([
        { class: "cs-slot__img", src: "/notes.svg", alt: "" },
        { class: "cs-slot__img", src: "/notes.svg", alt: "" },
      ]);
    });
  });

  describe("tooltip", () => {
    it("shows tags, title, the slot's label as category, and the stat", () => {
      const html = render();
      expect(html).toContain('<p class="cs-tip__tags"><span>Daily </span></p>');
      expect(html).toContain('<p class="cs-tip__title">React</p><p class="cs-tip__category">Core stack</p>');
      expect(html).toContain('<span class="cs-tip__stat-label">Years</span> <span class="cs-tip__stat-value">4</span>');
    });

    it("puts pairs in a description list, plain lines in a list, then the note", () => {
      expect(render()).toContain(
        '<div class="cs-tip__body"><dl class="cs-tip__pairs"><div class="cs-tip__pair"><dt>UI</dt><dd>React</dd></div></dl>' +
          '<ul class="cs-tip__items"><li>Accessibility</li></ul><p class="cs-tip__note">Most used first.</p></div>',
      );
    });

    it("prefers a subtitle over the slot's label", () => {
      const focus: SlotContent = { tooltip: { title: "Focus", subtitle: "Learning" }, action: { kind: "none" } };
      const job: Job = { ...web, slots: { focus } };
      expect(render({ job })).toContain('<p class="cs-tip__category">Learning</p>');
    });
  });

  describe("portrait", () => {
    it("shows a labelled placeholder when the job has no portrait", () => {
      const html = render();
      expect(html).toContain('<div class="cs__portrait cs__portrait--face">');
      expect(html).toContain('role="img" aria-label="No portrait yet"');
    });

    it("renders the portrait as a plain img by default, with its framing", () => {
      const html = render({ job: data });
      expect(html).toContain('<div class="cs__portrait cs__portrait--full"><img src="/me.png" alt="Portrait"/>');
      expect(html).not.toContain("No portrait yet");
    });

    it("hands the portrait to a host's renderer", () => {
      const html = render({ job: data, renderPortrait: (portrait) => <picture data-src={portrait.src} /> });
      expect(html).toContain('<picture data-src="/me.png"></picture>');
    });

    it("shows the badge in the portrait's corner", () => {
      expect(render()).toContain(
        '<p class="cs__badge"><span class="cs__badge-label">Projects</span> <span class="cs__badge-value">6</span></p>',
      );
    });
  });

  describe("bar", () => {
    it("shows the character name at its right", () => {
      expect(render({ config: { ...config, characterName: "Alex" } })).toContain(
        '<div class="cs__bar"><p class="cs__bar-title">Profile</p><p class="cs__bar-name">Alex</p></div>',
      );
    });

    it("leaves the name out with parts.characterName false, and the whole bar with parts.bar false", () => {
      const named = { ...config, characterName: "Alex" };
      expect(render({ config: named, parts: { characterName: false } })).not.toContain("cs__bar-name");
      const html = render({ config: named, parts: { bar: false } });
      expect(html).not.toContain("cs__bar");
      expect(section(html)?.attrs["aria-label"]).toBe("Character panel");
    });
  });

  describe("gear-set row", () => {
    const links: GearSet["links"] = [
      { label: "Contact", iconName: "person", action: { kind: "anchor", target: "contact" } },
      { label: "Résumé", icon: "CV", action: { kind: "link", href: "/resume" } },
      { label: "Third start link", action: { kind: "none" } },
      { label: "Save", position: "end", action: { kind: "external", href: "https://save.example/", newTab: true } },
    ];
    const withGearSet = (gearSet: GearSet, jobs = config.jobs) => ({ ...config, gearSet, jobs });
    const linkTo = (props: LinkRendererProps, seen: string[]) => {
      const { intent, children, ...rest } = props;
      seen.push(`${intent} ${rest.href}`);
      return <a {...rest}>{children}</a>;
    };

    it("is drawn for several jobs even without a gearSet, and not for one job without one", () => {
      expect(render()).toContain('<div class="cs__gear">');
      expect(render({ config: { ...config, jobs: [web] } })).not.toContain("cs__gear");
    });

    it("is drawn for one job with a gearSet or a host control", () => {
      expect(render({ config: withGearSet({ label: "Résumé" }, [web]) })).toContain("cs__gear");
      expect(render({ config: { ...config, jobs: [web] }, gearSetEnd: <button type="button">Save</button> })).toContain(
        '<div class="cs__gear-end"><button type="button">Save</button></div>',
      );
    });

    it("is left out, menu and host control too, with parts.gearSet false", () => {
      const html = render({ config: withGearSet({ links }), parts: { gearSet: false }, gearSetEnd: <b>end</b> });
      expect(html).not.toContain("cs__gear");
      expect(html).not.toContain("cs__jobs");
      expect(html).not.toContain("<b>end</b>");
    });

    it("shows the caption, label then value", () => {
      expect(render({ config: withGearSet({ label: "Résumé", value: "v14" }) })).toContain(
        '<p class="cs__gear-caption"><span class="cs__gear-label">Résumé</span> <span class="cs__gear-value">v14</span></p>',
      );
    });

    it("draws two start links before the job menu and the end link at the end, as named icon buttons", () => {
      const html = render({ config: withGearSet({ links }) });
      const start = html.slice(html.indexOf("cs__gear-start"), html.indexOf("cs__jobs"));
      expect(withClass(start, "cs__gear-button").map((tag) => tag.attrs.href)).toEqual(["#contact", "/resume"]);
      expect(start).toContain('<span class="cs-visually-hidden">Contact</span>');
      expect(start).toContain('<span class="cs__gear-icon" aria-hidden="true">CV</span>');
      expect(html).not.toContain("Third start link");
      const end = html.slice(html.indexOf("cs__gear-end"));
      expect(withClass(end, "cs__gear-button")[0].attrs).toMatchObject({ href: "https://save.example/", target: "_blank" });
      expect(end).toContain("(opens in a new tab)");
    });

    it("puts the host's control in place of the end link", () => {
      const html = render({ config: withGearSet({ links }), gearSetEnd: <button type="button">Host</button> });
      expect(html).toContain('<div class="cs__gear-end"><button type="button">Host</button></div>');
      expect(html).not.toContain("https://save.example/");
    });

    it("takes the job's own gearSet over the config's, and skips a hidden one", () => {
      const own = { ...web, gearSet: { value: "Job's own" } };
      expect(render({ config: withGearSet({ value: "Shared" }), job: own })).toContain("Job&#x27;s own");
      const hidden = { ...web, gearSet: { value: "Job's own", hidden: true } };
      const html = render({ config: withGearSet({ value: "Shared" }), job: hidden });
      expect(html).toContain("Shared");
      expect(html).not.toContain("Job&#x27;s own");
    });

    it("links a job action like the job menu, marking the current job, and drops the link for an unknown job", () => {
      const seen: string[] = [];
      const jobLinks: GearSet["links"] = [
        { label: "To data", action: { kind: "job", id: "data" } },
        { label: "To web", action: { kind: "job", id: "web" } },
      ];
      const html = render({ config: withGearSet({ links: jobLinks }), renderLink: (props) => linkTo(props, seen) });
      expect(seen).toEqual(expect.arrayContaining(["job /?job=data", "job /"]));
      const links = withClass(html, "cs__gear-button").filter((tag) => tag.name === "a");
      expect(links.map((tag) => tag.attrs["aria-current"])).toEqual([undefined, "true"]);

      const gone = render({ config: withGearSet({ links: [{ label: "Gone", action: { kind: "job", id: "gone" } }] }) });
      expect(withClass(gone, "cs__gear-button").filter((tag) => tag.name !== "summary")).toEqual([
        { name: "span", attrs: { class: "cs__gear-button" } },
      ]);
    });

    it("marks an active param link current and passes the param intent", () => {
      const seen: string[] = [];
      const param: GearSet["links"] = [{ label: "React", action: { kind: "param", name: "stack", value: "react" } }];
      const html = render({
        config: withGearSet({ links: param }),
        isParamActive: () => true,
        renderLink: (props) => linkTo(props, seen),
      });
      expect(seen).toContain("param /?stack=react");
      expect(withClass(html, "cs__gear-button")[0].attrs["aria-current"]).toBe("true");
    });

    it("picks an icon by precedence: image, glyph, built-in drawing, then the label's first letters", () => {
      const only = (link: Partial<GearSetLink>) =>
        render({ config: withGearSet({ links: [{ label: "Plain", action: { kind: "none" }, ...link }] }) });
      expect(only({ iconSrc: "/i.svg", icon: "G", iconName: "star" })).toContain(
        '<img class="cs-icon cs-icon--img" src="/i.svg" alt=""/>',
      );
      expect(only({ icon: "G", iconName: "star" })).toContain('<span class="cs__gear-icon" aria-hidden="true">G</span>');
      expect(only({ iconName: "star" })).toMatch(/<span class="cs__gear-icon" aria-hidden="true"><svg class="cs-icon"/);
      expect(only({})).toContain('<span class="cs__gear-icon" aria-hidden="true">Pl</span>');
    });
  });

  describe("decorative extras", () => {
    it("are off by default", () => {
      const html = render();
      expect(html).not.toContain("cs-slot__socket");
      expect(html).not.toContain("cs__toolbar");
    });

    it("add sockets to filled slots only", () => {
      const html = render({ parts: { sockets: true } });
      const filled = withClass(html, "cs-slot__face").filter((tag) => tag.attrs["aria-describedby"]).length;
      expect(withClass(html, "cs-slot__sockets")).toHaveLength(filled);
    });

    it("hide the toolbar, six drawn buttons, from assistive tech", () => {
      const html = render({ parts: { toolbar: true } });
      expect(html).toContain('<div class="cs__toolbar" aria-hidden="true">');
      expect(html.match(/<span class="cs__toolbar-button[^"]*"><svg class="cs-icon"/g)).toHaveLength(6);
    });
  });
});

describe("the example configs", () => {
  const examples = import.meta.glob<unknown>("../examples/*.json", { eager: true, import: "default" });

  // A smoke test: every job of every example renders without throwing.
  it.each(Object.entries(examples))("%s renders every job", (_, raw) => {
    const { config: parsed } = parseConfig(raw);
    expect(parsed).not.toBeNull();
    for (const job of parsed!.jobs) {
      expect(section(render({ config: parsed!, job }))?.attrs.class).toBe("cs");
    }
  });
});
