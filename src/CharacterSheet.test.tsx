/// <reference types="vite/client" />
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterSheet, type CharacterSheetProps } from "./CharacterSheet.tsx";
import { parseConfig } from "./parse.ts";
import type { CharacterSheetConfig, Job, SlotContent } from "./types.ts";

// The panel as a server renders it: HTML from react-dom/server in plain
// Node, no DOM and no JavaScript in a browser. That is what a host's page
// shows before hydration (or without JavaScript at all), so these tests pin
// the markup hosts and assistive tech rely on: links and their intents,
// accessible names, and tooltips tied to their slots. Hover, focus and
// Escape need a browser, so they're checked against the playground instead.

const tip = (title: string): SlotContent["tooltip"] => ({ title });

const slots: CharacterSheetConfig["slots"] = [
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

const config: CharacterSheetConfig = { title: "Profile", defaultJobId: "web", slots, jobs: [web, data] };

function render(props: Partial<CharacterSheetProps> = {}): string {
  return renderToStaticMarkup(<CharacterSheet config={config} job={web} {...props} />);
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

describe("CharacterSheet (server render)", () => {
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
      "aria-label": "Character sheet",
    });
    expect(html).toContain('<p class="cs__bar-title">Character sheet</p>');
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

    it("is a details element, so it opens without JavaScript", () => {
      expect(render()).toMatch(/<details class="cs__jobs"><summary class="cs__jobs-toggle">Change job<\/summary>/);
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
          <CharacterSheet config={config} job={web} />
          <CharacterSheet config={config} job={web} />
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

  describe("decorative extras", () => {
    it("are off by default", () => {
      const html = render();
      expect(html).not.toContain("cs-slot__socket");
      expect(html).not.toContain("cs__toolbar");
    });

    it("add sockets to filled slots only", () => {
      const html = render({ showSockets: true });
      const filled = withClass(html, "cs-slot__face").filter((tag) => tag.attrs["aria-describedby"]).length;
      expect(withClass(html, "cs-slot__sockets")).toHaveLength(filled);
    });

    it("hide the toolbar from assistive tech", () => {
      expect(render({ showToolbar: true })).toContain('<div class="cs__toolbar" aria-hidden="true">');
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
