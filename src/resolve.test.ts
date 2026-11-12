import { describe, expect, it } from "vitest";
import {
  actionHref,
  isActionActive,
  jobHref,
  publicConfig,
  resolveBlocks,
  resolveJob,
  resolveTab,
  tabHref,
  withQuery,
} from "./resolve.ts";
import type { Block, CharacterSheetConfig, Job, JobBlock, Tab, TabPage } from "./types.ts";

function job(id: string, status: Job["status"] = "published"): Job {
  return { id, name: id, title: id, status, level: { label: "Lv.", value: "1" }, slots: {} };
}

const config: CharacterSheetConfig = {
  defaultJobId: "web",
  slots: [{ id: "skills", label: "Skills", position: "left" }],
  jobs: [job("web"), job("data"), job("next", "draft"), job("old", "hidden")],
};

describe("publicConfig", () => {
  it("keeps only published jobs", () => {
    expect(publicConfig(config).jobs.map((j) => j.id)).toEqual(["web", "data"]);
  });

  it("leaves the rest of the config alone", () => {
    expect(publicConfig(config).slots).toBe(config.slots);
    expect(publicConfig(config).defaultJobId).toBe("web");
  });
});

describe("publicConfig: hidden parts", () => {
  const stats = (id?: string, hidden?: boolean): Block => ({
    type: "stats",
    ...(id && { id }),
    ...(hidden && { hidden }),
    groups: [{ rows: [{ label: "A", value: "1" }] }],
  });
  const tab = (id: string, extra: Partial<Tab> = {}): Tab => ({ id, label: id, blocks: [stats()], ...extra });
  const page = (id: string, extra: Partial<TabPage> = {}): TabPage => ({ id, label: id, blocks: [stats()], ...extra });
  const withTabs = (extra: Partial<CharacterSheetConfig>): CharacterSheetConfig => ({ ...config, ...extra });

  it("leaves out hidden tabs, pages and blocks", () => {
    const result = publicConfig(
      withTabs({
        tabs: [
          tab("a", { blocks: [stats("x"), stats("y", true)] }),
          tab("b", { hidden: true }),
          tab("c", { blocks: undefined, pages: [page("p"), page("q", { hidden: true })] }),
        ],
      }),
    );
    expect(result.tabs?.map((t) => t.id)).toEqual(["a", "c"]);
    expect(result.tabs?.[0].blocks?.map((b) => b.id)).toEqual(["x"]);
    expect(result.tabs?.[1].pages?.map((p) => p.id)).toEqual(["p"]);
  });

  it("leaves out a tab or page with every block hidden", () => {
    const result = publicConfig(
      withTabs({
        tabs: [
          tab("a"),
          tab("b", { blocks: [stats("x", true)] }),
          tab("c", { blocks: undefined, pages: [page("p", { blocks: [stats("y", true)] })] }),
          tab("d", { blocks: undefined, pages: [page("p"), page("q", { blocks: [stats("z", true)] })] }),
        ],
      }),
    );
    expect(result.tabs?.map((t) => t.id)).toEqual(["a", "d"]);
    expect(result.tabs?.[1].pages?.map((p) => p.id)).toEqual(["p"]);
  });

  it("leaves out a hidden gearSet, the config's and a job's", () => {
    const hiddenSet = { value: "v1", hidden: true };
    const result = publicConfig(withTabs({ gearSet: hiddenSet, jobs: [{ ...job("web"), gearSet: hiddenSet }] }));
    expect(result).not.toHaveProperty("gearSet");
    expect(result.jobs[0]).not.toHaveProperty("gearSet");
    const shown = publicConfig(withTabs({ gearSet: { value: "v1" } }));
    expect(shown.gearSet).toEqual({ value: "v1" });
  });

  it("leaves out a job's replacement for a block that's gone", () => {
    const replacement: JobBlock = { type: "stats", groups: [{ rows: [{ label: "B", value: "2" }] }] };
    const result = publicConfig(
      withTabs({
        tabs: [tab("a", { blocks: [stats("x"), stats("y", true)] })],
        jobs: [{ ...job("web"), blocks: { x: replacement, y: replacement } }],
      }),
    );
    expect(Object.keys(result.jobs[0].blocks ?? {})).toEqual(["x"]);
  });

  it("adds no tabs or gearSet to a config without them", () => {
    expect(publicConfig(config)).not.toHaveProperty("tabs");
    expect(publicConfig(config)).not.toHaveProperty("gearSet");
    expect(publicConfig(config).jobs[0]).not.toHaveProperty("blocks");
  });
});

describe("resolveTab", () => {
  const block: Block = { type: "stats", groups: [{ rows: [{ label: "A", value: "1" }] }] };
  const tab = (id: string, extra: Partial<Tab> = {}): Tab => ({ id, label: id, blocks: [block], ...extra });
  const page = (id: string, extra: Partial<TabPage> = {}): TabPage => ({ id, label: id, blocks: [block], ...extra });
  const withTabs: CharacterSheetConfig = {
    ...config,
    tabs: [
      tab("hidden", { hidden: true }),
      tab("attributes"),
      tab("skills", { blocks: undefined, pages: [page("draft", { hidden: true }), page("build"), page("run")] }),
    ],
  };
  const ids = (resolved: ReturnType<typeof resolveTab>) => resolved && [resolved.tab.id, resolved.page?.id ?? null];

  it("returns the tab named in the URL, with no page for a tab of blocks", () => {
    expect(ids(resolveTab(withTabs, "attributes"))).toEqual(["attributes", null]);
  });

  it("falls back to the first visible tab for a missing, unknown or hidden id", () => {
    expect(ids(resolveTab(withTabs, undefined))).toEqual(["attributes", null]);
    expect(ids(resolveTab(withTabs, "nope"))).toEqual(["attributes", null]);
    expect(ids(resolveTab(withTabs, "hidden"))).toEqual(["attributes", null]);
  });

  it("returns the page named in the URL, or the tab's first visible one", () => {
    expect(ids(resolveTab(withTabs, "skills", "run"))).toEqual(["skills", "run"]);
    expect(ids(resolveTab(withTabs, "skills"))).toEqual(["skills", "build"]);
    expect(ids(resolveTab(withTabs, "skills", "nope"))).toEqual(["skills", "build"]);
    expect(ids(resolveTab(withTabs, "skills", "draft"))).toEqual(["skills", "build"]);
  });

  it("uses the first value of a repeated parameter", () => {
    expect(ids(resolveTab(withTabs, ["skills", "attributes"], ["run", "build"]))).toEqual(["skills", "run"]);
  });

  it("skips a tab with nothing visible in it", () => {
    const tabs = [tab("empty", { blocks: [{ ...block, hidden: true }] }), tab("pages", { blocks: undefined, pages: [page("p", { hidden: true })] }), tab("a")];
    expect(ids(resolveTab({ ...config, tabs }, undefined))).toEqual(["a", null]);
    expect(ids(resolveTab({ ...config, tabs }, "pages"))).toEqual(["a", null]);
  });

  it("returns null without a tab to show", () => {
    expect(resolveTab(config, "a")).toBeNull();
    expect(resolveTab({ ...config, tabs: [tab("a", { hidden: true })] }, "a")).toBeNull();
  });
});

describe("tabHref", () => {
  const block: Block = { type: "stats", groups: [{ rows: [{ label: "A", value: "1" }] }] };
  const withTabs: CharacterSheetConfig = {
    ...config,
    tabs: [
      { id: "hidden", label: "Hidden", hidden: true, blocks: [block] },
      { id: "attributes", label: "Attributes", blocks: [block] },
      {
        id: "skills",
        label: "Skills",
        pages: [
          { id: "draft", label: "Draft", hidden: true, blocks: [block] },
          { id: "build", label: "Build", blocks: [block] },
          { id: "run", label: "Run", blocks: [block] },
        ],
      },
    ],
  };

  it("gives the first visible tab no parameter", () => {
    expect(tabHref(withTabs, "attributes")).toBe("/");
    expect(tabHref(withTabs, "attributes", "/?tab=skills")).toBe("/");
  });

  it("names any other tab", () => {
    expect(tabHref(withTabs, "skills")).toBe("/?tab=skills");
  });

  it("keeps the job when switching tab, and drops the page", () => {
    expect(tabHref(withTabs, "skills", "/?job=data")).toBe("/?job=data&tab=skills");
    expect(tabHref(withTabs, "attributes", "/?job=data&tab=skills&page=run")).toBe("/?job=data");
    expect(tabHref(withTabs, "skills", "/?job=data&tab=skills&page=run")).toBe("/?job=data&tab=skills");
  });

  it("names a page, but not the tab's first visible one", () => {
    expect(tabHref(withTabs, "skills", "/?job=data", { page: "run" })).toBe("/?job=data&tab=skills&page=run");
    expect(tabHref(withTabs, "skills", "/?job=data&tab=skills&page=run", { page: "build" })).toBe(
      "/?job=data&tab=skills",
    );
  });

  it("uses the host's parameter names", () => {
    expect(tabHref(withTabs, "skills", "/lab?t=attributes&p=x", { page: "run", tabParam: "t", pageParam: "p" })).toBe(
      "/lab?t=skills&p=run",
    );
  });

  it("drops the current hash", () => {
    expect(tabHref(withTabs, "skills", "/?job=data#projects")).toBe("/?job=data&tab=skills");
  });

  it("names a tab the config doesn't show, which resolveTab then falls back from", () => {
    expect(tabHref(withTabs, "hidden")).toBe("/?tab=hidden");
  });

  it("is kept by jobHref, which keeps the base path's query", () => {
    expect(jobHref(withTabs, "data", "/?tab=skills&page=run")).toBe("/?tab=skills&page=run&job=data");
    expect(jobHref(withTabs, "web", "/?job=data&tab=skills&page=run")).toBe("/?tab=skills&page=run");
  });
});

describe("resolveBlocks", () => {
  const stats = (id: string | undefined, value: string, hidden?: boolean): Block => ({
    type: "stats",
    ...(id && { id }),
    ...(hidden && { hidden }),
    groups: [{ rows: [{ label: "A", value }] }],
  });
  const gauges: Block = { type: "gauges", id: "vitals", rows: [{ label: "Focus", value: "80%" }] };
  const values = (blocks: Block[]) => blocks.map((block) => (block.type === "stats" ? block.groups[0].rows[0].value : block.type));

  it("returns the shared blocks for a job that replaces none", () => {
    const blocks = [stats("x", "1"), stats(undefined, "2")];
    expect(resolveBlocks(blocks, job("web"))).toEqual(blocks);
  });

  it("swaps in the job's block by id, keeping the shared id", () => {
    const web = { ...job("web"), blocks: { x: { type: "stats", groups: [{ rows: [{ label: "A", value: "job" }] }] } } } as Job;
    const result = resolveBlocks([stats("x", "1"), stats("y", "2")], web);
    expect(values(result)).toEqual(["job", "2"]);
    expect(result[0].id).toBe("x");
  });

  it("leaves out hidden blocks, replaced or not", () => {
    const web = { ...job("web"), blocks: { y: { type: "stats", groups: [{ rows: [{ label: "A", value: "job" }] }] } } } as Job;
    expect(values(resolveBlocks([stats("x", "1"), stats("y", "2", true)], web))).toEqual(["1"]);
  });

  it("ignores a replacement of another type", () => {
    const web = { ...job("web"), blocks: { vitals: { type: "stats", groups: [{ rows: [{ label: "A", value: "job" }] }] } } } as Job;
    expect(resolveBlocks([gauges], web)).toEqual([gauges]);
  });

  it("doesn't look up a block id on the prototype", () => {
    const web = { ...job("web"), blocks: {} } as Job;
    expect(resolveBlocks([stats("constructor", "1")], web)).toEqual([stats("constructor", "1")]);
  });
});

describe("resolveJob", () => {
  it("returns the job named in the URL", () => {
    expect(resolveJob(config, "data").id).toBe("data");
  });

  it("falls back to the default job for a missing or unknown id", () => {
    expect(resolveJob(config, undefined).id).toBe("web");
    expect(resolveJob(config, "nope").id).toBe("web");
  });

  it("uses the first value of a repeated parameter", () => {
    expect(resolveJob(config, ["data", "web"]).id).toBe("data");
  });

  it("falls back to the first job when the default is missing", () => {
    expect(resolveJob({ ...config, defaultJobId: "gone" }, "nope").id).toBe("web");
  });
});

describe("jobHref", () => {
  it("gives the default job the bare path", () => {
    expect(jobHref(config, "web")).toBe("/");
    expect(jobHref(config, "web", "/admin/preview")).toBe("/admin/preview");
  });

  it("names any other job in the query", () => {
    expect(jobHref(config, "data")).toBe("/?job=data");
    expect(jobHref(config, "data", "/admin/preview", "j")).toBe("/admin/preview?j=data");
  });

  it("adds to a query the base path already has", () => {
    expect(jobHref(config, "data", "/lab?theme=game")).toBe("/lab?theme=game&job=data");
    expect(jobHref(config, "web", "/lab?theme=game")).toBe("/lab?theme=game");
  });

  it("replaces a job already in the base path, and drops it for the default", () => {
    expect(jobHref(config, "data", "/?job=old")).toBe("/?job=data");
    expect(jobHref(config, "web", "/?job=old")).toBe("/");
  });
});

describe("withQuery", () => {
  it("sets parameters on a path without a query", () => {
    expect(withQuery("/", { stack: "React" })).toBe("/?stack=React");
    expect(withQuery("/lab", { a: "1", b: "2" })).toBe("/lab?a=1&b=2");
  });

  it("keeps the parameters already there, in order, and replaces one in place", () => {
    expect(withQuery("/?job=data&stack=Go", { stack: "React", page: "2" })).toBe("/?job=data&stack=React&page=2");
  });

  it("removes a parameter set to null, and the ? with the last one", () => {
    expect(withQuery("/?job=data&stack=Go", { stack: null })).toBe("/?job=data");
    expect(withQuery("/?stack=Go", { stack: null })).toBe("/");
    expect(withQuery("/lab", { stack: null })).toBe("/lab");
  });

  it("drops the href's hash and adds the one given", () => {
    expect(withQuery("/?job=data#about", {})).toBe("/?job=data");
    expect(withQuery("/#about", { stack: "Go" }, "projects")).toBe("/?stack=Go#projects");
    expect(withQuery("/", {}, "projects")).toBe("/#projects");
  });

  it("encodes values", () => {
    expect(withQuery("/", { stack: "C# & .NET" })).toBe("/?stack=C%23+%26+.NET");
  });

  it("collapses a repeated parameter to one in the first one's place, or removes them all", () => {
    expect(withQuery("/?s=a&j=1&s=b", { s: "c" })).toBe("/?s=c&j=1");
    expect(withQuery("/?s=a&j=1&s=b", { s: null })).toBe("/?j=1");
  });

  it("keeps an empty value", () => {
    expect(withQuery("/", { s: "" })).toBe("/?s=");
  });

  it("treats undefined from a plain-JS caller like null", () => {
    const params = { s: undefined } as unknown as Record<string, string | null>;
    expect(withQuery("/?s=a&j=1", params)).toBe("/?j=1");
  });

  it("leaves a relative or empty path as it is", () => {
    expect(withQuery("admin?x=1", { y: "2" })).toBe("admin?x=1&y=2");
    expect(withQuery("", { y: "2" })).toBe("?y=2");
  });
});

describe("actionHref", () => {
  it("links an anchor to its id on the same page", () => {
    expect(actionHref({ kind: "anchor", target: "projects" })).toBe("#projects");
  });

  it("passes link and external hrefs through", () => {
    expect(actionHref({ kind: "link", href: "/projects/a" })).toBe("/projects/a");
    expect(actionHref({ kind: "external", href: "https://example.com" })).toBe("https://example.com");
  });

  it("returns null for no action", () => {
    expect(actionHref({ kind: "none" })).toBeNull();
  });

  describe("param", () => {
    const stack = { kind: "param", name: "stack", value: "React" } as const;

    it("sets the parameter on the current page", () => {
      expect(actionHref(stack)).toBe("/?stack=React");
      expect(actionHref(stack, "/admin/preview")).toBe("/admin/preview?stack=React");
    });

    it("keeps the query the current href already has", () => {
      expect(actionHref(stack, "/?job=data")).toBe("/?job=data&stack=React");
    });

    it("replaces the parameter's old value instead of repeating it", () => {
      expect(actionHref(stack, "/?stack=Python&job=data")).toBe("/?stack=React&job=data");
    });

    it("drops the current hash and adds the target's", () => {
      expect(actionHref(stack, "/?job=data#about")).toBe("/?job=data&stack=React");
      expect(actionHref({ ...stack, target: "projects" }, "/#about")).toBe("/?stack=React#projects");
    });

    it("encodes the value", () => {
      expect(actionHref({ ...stack, value: "C# & .NET" })).toBe("/?stack=C%23+%26+.NET");
    });
  });
});

describe("isActionActive", () => {
  const stack = { kind: "param", name: "stack", value: "React" } as const;
  const showing = (current: Record<string, string>) => (name: string, value: string) => current[name] === value;

  it("asks the host about a param action", () => {
    expect(isActionActive(stack, showing({ stack: "React" }))).toBe(true);
    expect(isActionActive(stack, showing({ stack: "Python" }))).toBe(false);
    expect(isActionActive(stack, showing({}))).toBe(false);
  });

  it("passes the action's own name and value", () => {
    const calls: [string, string][] = [];
    isActionActive({ ...stack, value: "Go", target: "projects" }, (name, value) => (calls.push([name, value]), true));
    expect(calls).toEqual([["stack", "Go"]]);
  });

  it("is never active without a host check", () => {
    expect(isActionActive(stack)).toBe(false);
  });

  it("is never active for a param naming the job parameter", () => {
    const always = () => true;
    expect(isActionActive({ ...stack, name: "j" }, always, "j")).toBe(false);
    expect(isActionActive({ ...stack, name: "j" }, always)).toBe(true);
  });

  it("is never active for other kinds", () => {
    const always = () => true;
    expect(isActionActive({ kind: "anchor", target: "projects" }, always)).toBe(false);
    expect(isActionActive({ kind: "link", href: "/" }, always)).toBe(false);
    expect(isActionActive({ kind: "external", href: "https://example.com" }, always)).toBe(false);
    expect(isActionActive({ kind: "none" }, always)).toBe(false);
  });
});
