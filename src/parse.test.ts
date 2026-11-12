import { describe, expect, it } from "vitest";
import { findUnknownKeys, loadConfig, parseConfig, type ConfigSource } from "./parse.ts";
import { LIMITS } from "./schema.ts";
import type { CharacterPanelConfig } from "./types.ts";

// Raw input, as a JSON file or the API would give it: plain objects, so a
// test can break any field. zod's own messages aren't asserted, only the
// path each error starts with; this package's messages are.

type Raw = Record<string, unknown>;

function rawJob(id: string, extra: Raw = {}): Raw {
  return {
    id,
    name: id,
    title: `Developer (${id})`,
    level: { label: "Lv.", value: "1" },
    slots: { skills: { tooltip: { title: "Skills" }, action: { kind: "none" } } },
    ...extra,
  };
}

function rawConfig(extra: Raw = {}): Raw {
  return {
    defaultJobId: "web",
    slots: [
      { id: "skills", label: "Skills", position: "left" },
      { id: "title", label: "Title", position: "header-start" },
    ],
    jobs: [rawJob("web"), rawJob("data")],
    ...extra,
  };
}

const jobIds = (config: CharacterPanelConfig | null) => config?.jobs.map((job) => job.id);

describe("parseConfig", () => {
  it("accepts a valid config without errors", () => {
    const { config, errors } = parseConfig(rawConfig());
    expect(errors).toEqual([]);
    expect(config?.defaultJobId).toBe("web");
    expect(jobIds(config)).toEqual(["web", "data"]);
  });

  it("defaults a job's status to published", () => {
    expect(parseConfig(rawConfig()).config?.jobs[0].status).toBe("published");
  });

  it("strips unknown keys instead of dropping the job", () => {
    const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("web", { subtitel: "typo" })], extra: 1 }));
    expect(errors).toEqual([]);
    expect(config?.jobs[0]).not.toHaveProperty("subtitel");
    expect(config).not.toHaveProperty("extra");
  });

  describe("the shell (everything but the jobs)", () => {
    it("returns no config when the input isn't an object", () => {
      const { config, errors } = parseConfig("not a config");
      expect(config).toBeNull();
      expect(errors).toEqual([expect.stringMatching(/^\(root\): /)]);
    });

    it("returns no config for a bad top-level field, with its path", () => {
      const { config, errors } = parseConfig(rawConfig({ slots: [] }));
      expect(config).toBeNull();
      expect(errors).toEqual([expect.stringMatching(/^slots: /)]);
    });

    it("returns no config without jobs", () => {
      const { config, errors } = parseConfig(rawConfig({ jobs: [] }));
      expect(config).toBeNull();
      expect(errors).toEqual([expect.stringMatching(/^jobs: /)]);
    });

    it("reports a duplicate slot id but keeps the config", () => {
      const slots = [...(rawConfig().slots as Raw[]), { id: "skills", label: "Again", position: "right" }];
      const { config, errors } = parseConfig(rawConfig({ slots }));
      expect(errors).toEqual(['slots: duplicate id "skills"']);
      expect(config).not.toBeNull();
    });

    it("reports a second slot in a header position", () => {
      const slots = [
        ...(rawConfig().slots as Raw[]),
        { id: "rank", label: "Rank", position: "header-start" },
        { id: "end", label: "End", position: "header-end" },
      ];
      expect(parseConfig(rawConfig({ slots })).errors).toEqual([
        'slots: "rank" is a second header-start slot, not shown',
      ]);
    });
  });

  describe("jobs, checked one at a time", () => {
    it("drops an invalid job with errors under its index and keeps the rest", () => {
      const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("web"), rawJob("data", { level: {} })] }));
      expect(jobIds(config)).toEqual(["web"]);
      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors) expect(error).toMatch(/^jobs\.1\.level\./);
    });

    it("drops a job whose id repeats an earlier one", () => {
      const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("web"), rawJob("web", { name: "Again" })] }));
      expect(config?.jobs.map((job) => job.name)).toEqual(["web"]);
      expect(errors).toEqual(['jobs.1: duplicate id "web", dropped']);
    });

    it("keeps a job that fills an unknown slot, and says the content is ignored", () => {
      const slots = { ...(rawJob("web").slots as Raw), ghost: { tooltip: { title: "Ghost" }, action: { kind: "none" } } };
      const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("web", { slots })] }));
      expect(jobIds(config)).toEqual(["web"]);
      expect(errors).toEqual(['jobs.0.slots: unknown slot "ghost", ignored']);
    });

    it("returns no config when no job is valid", () => {
      const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("Bad Id")] }));
      expect(config).toBeNull();
      expect(errors.at(-1)).toBe("jobs: no valid job");
      expect(errors[0]).toMatch(/^jobs\.0\.id: /);
    });

    it("returns no config when no job is published", () => {
      const jobs = [rawJob("web", { status: "draft" }), rawJob("data", { status: "hidden" })];
      const { config, errors } = parseConfig(rawConfig({ jobs }));
      expect(config).toBeNull();
      expect(errors).toEqual(["jobs: no published job"]);
    });

    it("keeps drafts and hidden jobs for editors", () => {
      const jobs = [rawJob("web"), rawJob("data", { status: "draft" }), rawJob("old", { status: "hidden" })];
      expect(jobIds(parseConfig(rawConfig({ jobs })).config)).toEqual(["web", "data", "old"]);
    });
  });

  describe("defaultJobId", () => {
    const jobs = [rawJob("draft", { status: "draft" }), rawJob("data"), rawJob("web")];

    it("falls back to the first published job when no job has the id", () => {
      const { config, errors } = parseConfig(rawConfig({ defaultJobId: "gone", jobs }));
      expect(config?.defaultJobId).toBe("data");
      expect(errors).toEqual(['defaultJobId: no valid job "gone", using "data"']);
    });

    it("falls back without a second error when the default job was dropped", () => {
      const { config, errors } = parseConfig(rawConfig({ defaultJobId: "web", jobs: [rawJob("web", { level: {} }), rawJob("data")] }));
      expect(config?.defaultJobId).toBe("data");
      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors) expect(error).toMatch(/^jobs\.0\./);
    });

    it("adds its own error when the default's id was never in a job object", () => {
      // A job that isn't an object has no id to remember, so nothing
      // already explains why "web" is missing.
      const { config, errors } = parseConfig(rawConfig({ defaultJobId: "web", jobs: ["web", rawJob("data")] }));
      expect(config?.defaultJobId).toBe("data");
      expect(errors.at(-1)).toBe('defaultJobId: no valid job "web", using "data"');
      expect(errors[0]).toMatch(/^jobs\.0: /);
    });

    it("falls back when the default job isn't published", () => {
      const { config, errors } = parseConfig(rawConfig({ defaultJobId: "draft", jobs }));
      expect(config?.defaultJobId).toBe("data");
      expect(errors).toEqual(['defaultJobId: "draft" is draft, not published, using "data"']);
    });
  });
});

describe("parseConfig: tabs, blocks and the gear-set row", () => {
  const stats = (id?: string, extra: Raw = {}): Raw => ({
    type: "stats",
    ...(id && { id }),
    groups: [{ rows: [{ label: "Years", value: "6" }] }],
    ...extra,
  });
  const gauges = (id?: string): Raw => ({ type: "gauges", ...(id && { id }), rows: [{ label: "Focus", value: "80%" }] });
  // `blocks: undefined` in extra leaves the key out, as JSON would.
  const tab = (id: string, extra: Raw = {}): Raw =>
    Object.fromEntries(Object.entries({ id, label: id, blocks: [stats()], ...extra }).filter(([, value]) => value !== undefined));
  const page = (id: string, extra: Raw = {}): Raw => ({ id, label: id, blocks: [stats()], ...extra });
  const tabIds = (config: CharacterPanelConfig | null) => config?.tabs?.map((t) => t.id);

  it("accepts every new field without errors", () => {
    const raw = rawConfig({
      characterName: "Alex Le",
      gearSet: {
        label: "Résumé",
        value: "v14",
        jobMenu: { label: "Switch", iconName: "note" },
        links: [
          { id: "pdf", label: "PDF", icon: "⭳", action: { kind: "link", href: "/resume.pdf" } },
          { label: "Data", iconName: "list", action: { kind: "job", id: "data" } },
          { label: "Save", iconName: "save", position: "end", action: { kind: "none" } },
        ],
      },
      tabs: [
        tab("attributes", {
          iconName: "star",
          blocks: [
            { type: "gauges", id: "vitals", label: "Vitals", rows: [{ label: "Years", value: "6", fill: 100, tone: "primary" }] },
            stats("core", {
              groups: [
                {
                  label: "Core",
                  column: "start",
                  collapsible: "open",
                  rows: [{ label: "A", value: "1", tone: "muted", tooltip: { title: "A" } }],
                },
              ],
            }),
          ],
        }),
        tab("skills", {
          blocks: undefined,
          pages: [
            page("build", {
              blocks: [
                {
                  type: "levels",
                  groups: [{ rows: [{ label: "React", level: "7", fill: 90, tone: "highlight", action: { kind: "job", id: "web" } }] }],
                },
              ],
            }),
            page("run", {
              blocks: [
                { type: "progress", groups: [{ rows: [{ label: "Project", fill: 50, caption: "Maintainer", value: "212" }] }] },
              ],
            }),
          ],
        }),
        tab("profile", {
          blocks: [
            {
              type: "fields",
              rows: [
                {
                  label: "Title",
                  value: "Senior developer",
                  overline: "Now",
                  caption: "Since 2024",
                  iconSrc: "/title.svg",
                  action: { kind: "anchor", target: "about" },
                  detail: { label: "All titles", iconName: "list", title: "Titles", blocks: [stats()] },
                },
              ],
            },
          ],
        }),
      ],
      jobs: [rawJob("web", { blocks: { vitals: gauges() }, gearSet: { value: "Web" } }), rawJob("data")],
    });
    const { config, errors } = parseConfig(raw);
    expect(errors).toEqual([]);
    expect(tabIds(config)).toEqual(["attributes", "skills", "profile"]);
    expect(config?.characterName).toBe("Alex Le");
    expect(config?.gearSet?.links).toHaveLength(3);
    expect(config?.jobs[0].blocks?.vitals.type).toBe("gauges");
    expect(findUnknownKeys(raw, config)).toEqual([]);
  });

  it("leaves tabs and gearSet out of a config that has none", () => {
    const { config } = parseConfig(rawConfig());
    expect(config).not.toHaveProperty("tabs");
    expect(config).not.toHaveProperty("gearSet");
  });

  it("drops a bad tab with errors under its index and keeps the rest", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a"), tab("Bad Id"), tab("c")] }));
    expect(tabIds(config)).toEqual(["a", "c"]);
    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) expect(error).toMatch(/^tabs\.1\.id: /);
  });

  it("keeps the first tabs up to the limit, and drops and reports the rest", () => {
    const tabs = Array.from({ length: LIMITS.config.tabs + 2 }, (_, index) => tab(`t${index}`));
    const { config, errors } = parseConfig(rawConfig({ tabs }));
    expect(config?.tabs).toHaveLength(LIMITS.config.tabs);
    expect(errors).toEqual([
      `tabs.${LIMITS.config.tabs}: over the limit of ${LIMITS.config.tabs}, dropped`,
      `tabs.${LIMITS.config.tabs + 1}: over the limit of ${LIMITS.config.tabs}, dropped`,
    ]);
  });

  it("keeps a tab's first blocks up to the limit", () => {
    const blocks = Array.from({ length: LIMITS.tab.blocks + 1 }, () => stats());
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { blocks })] }));
    expect(config?.tabs?.[0].blocks).toHaveLength(LIMITS.tab.blocks);
    expect(errors).toEqual([`tabs.0.blocks.${LIMITS.tab.blocks}: over the limit of ${LIMITS.tab.blocks}, dropped`]);
  });

  it("keeps a tab's first pages up to the limit, and a page's first blocks", () => {
    const pages = Array.from({ length: LIMITS.tab.pages + 1 }, (_, index) => page(`p${index}`));
    pages[0] = page("p0", { blocks: Array.from({ length: LIMITS.tab.blocks + 1 }, () => stats()) });
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { blocks: undefined, pages })] }));
    expect(config?.tabs?.[0].pages).toHaveLength(LIMITS.tab.pages);
    expect(config?.tabs?.[0].pages?.[0].blocks).toHaveLength(LIMITS.tab.blocks);
    expect(errors).toEqual([
      `tabs.0.pages.${LIMITS.tab.pages}: over the limit of ${LIMITS.tab.pages}, dropped`,
      `tabs.0.pages.0.blocks.${LIMITS.tab.blocks}: over the limit of ${LIMITS.tab.blocks}, dropped`,
    ]);
  });

  it("leaves out an empty tabs list, and reports it", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [] }));
    expect(config).not.toHaveProperty("tabs");
    expect(errors).toEqual(["tabs: empty, left out"]);
  });

  it("leaves out tabs when none is valid, and reports it", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("Bad Id")] }));
    expect(config).not.toBeNull();
    expect(config).not.toHaveProperty("tabs");
    expect(errors.at(-1)).toBe("tabs: no valid tab");
  });

  it("drops a bad block with errors under its path, and keeps the tab", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { blocks: [stats("x"), { type: "stats", groups: [] }, gauges()] })] }));
    expect(config?.tabs?.[0].blocks?.map((block) => block.type)).toEqual(["stats", "gauges"]);
    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) expect(error).toMatch(/^tabs\.0\.blocks\.1\.groups: /);
  });

  it("drops an unknown block type", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { blocks: [stats(), { type: "chart" }] })] }));
    expect(config?.tabs?.[0].blocks).toHaveLength(1);
    expect(errors).toEqual([expect.stringMatching(/^tabs\.0\.blocks\.1\.type: /)]);
  });

  it("drops a tab left with no blocks, or with none to begin with", () => {
    const { config, errors } = parseConfig(
      rawConfig({ tabs: [tab("a"), tab("b", { blocks: [{ type: "chart" }] }), tab("c", { blocks: undefined }), tab("d", { blocks: [] })] }),
    );
    expect(tabIds(config)).toEqual(["a"]);
    expect(errors.filter((error) => !error.startsWith("tabs.1.blocks.0"))).toEqual([
      "tabs.1: no blocks, dropped",
      "tabs.2: no blocks, dropped",
      "tabs.3: no blocks, dropped",
    ]);
  });

  it("drops a tab whose id repeats an earlier one", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a"), tab("a", { label: "Again" })] }));
    expect(config?.tabs?.map((t) => t.label)).toEqual(["a"]);
    expect(errors).toEqual(['tabs.1: duplicate id "a", dropped']);
  });

  it("uses a tab's pages when it has blocks too, and reports it", () => {
    const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { pages: [page("p")] })] }));
    expect(config?.tabs?.[0]).not.toHaveProperty("blocks");
    expect(config?.tabs?.[0].pages?.map((p) => p.id)).toEqual(["p"]);
    expect(errors).toEqual(["tabs.0: has both blocks and pages, blocks ignored"]);
  });

  describe("pages", () => {
    const withPages = (pages: Raw[]) => rawConfig({ tabs: [tab("a", { blocks: undefined, pages })] });

    it("drops a bad page and keeps the rest", () => {
      const { config, errors } = parseConfig(withPages([page("p"), page("q", { label: "" })]));
      expect(config?.tabs?.[0].pages?.map((p) => p.id)).toEqual(["p"]);
      for (const error of errors) expect(error).toMatch(/^tabs\.0\.pages\.1\.label: /);
    });

    it("drops a page whose id repeats an earlier one in its tab", () => {
      const { errors } = parseConfig(withPages([page("p"), page("p")]));
      expect(errors).toEqual(['tabs.0.pages.1: duplicate id "p", dropped']);
    });

    it("allows the same page id in two tabs", () => {
      const tabs = [tab("a", { blocks: undefined, pages: [page("p")] }), tab("b", { blocks: undefined, pages: [page("p")] })];
      expect(parseConfig(rawConfig({ tabs })).errors).toEqual([]);
    });

    it("drops a page left with no blocks, and a tab left with no pages", () => {
      const { config, errors } = parseConfig(withPages([page("p", { blocks: [{ type: "chart" }] })]));
      expect(config).not.toHaveProperty("tabs");
      expect(errors.slice(1)).toEqual([
        "tabs.0.pages.0: no blocks, dropped",
        "tabs.0: no pages, dropped",
        "tabs: no valid tab",
      ]);
    });
  });

  describe("block ids", () => {
    it("drops a block whose id repeats one in any tab or page", () => {
      const tabs = [tab("a", { blocks: [stats("x")] }), tab("b", { blocks: undefined, pages: [page("p", { blocks: [gauges("x"), gauges()] })] })];
      const { config, errors } = parseConfig(rawConfig({ tabs }));
      expect(config?.tabs?.[1].pages?.[0].blocks).toHaveLength(1);
      expect(errors).toEqual(['tabs.1.pages.0.blocks.0: duplicate block id "x", dropped']);
    });

    it("doesn't count blocks of a tab dropped as a duplicate", () => {
      const tabs = [tab("a"), tab("a", { blocks: [stats("x")] }), tab("b", { blocks: [stats("x")] })];
      expect(parseConfig(rawConfig({ tabs })).errors).toEqual(['tabs.1: duplicate id "a", dropped']);
    });
  });

  describe("reported, and kept", () => {
    it("names a job action with an unknown job", () => {
      const levels = { type: "levels", groups: [{ rows: [{ label: "Ops", level: "1", action: { kind: "job", id: "ops" } }] }] };
      const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { blocks: [levels] })] }));
      expect(config?.tabs?.[0].blocks).toHaveLength(1);
      expect(errors).toEqual(['tabs.0.blocks.0.groups.0.rows.0.action: unknown job "ops", drawn without a link']);
    });

    it("counts a draft job as known", () => {
      const levels = { type: "levels", groups: [{ rows: [{ label: "Ops", level: "1", action: { kind: "job", id: "next" } }] }] };
      const jobs = [rawJob("web"), rawJob("next", { status: "draft" })];
      expect(parseConfig(rawConfig({ jobs, tabs: [tab("a", { blocks: [levels] })] })).errors).toEqual([]);
    });

    it("names a job action inside a detail window", () => {
      const row = { label: "Ops", level: "1", action: { kind: "job", id: "ops" } };
      const detail = { label: "More", title: "More", blocks: [{ type: "levels", groups: [{ rows: [row] }] }] };
      const fields = { type: "fields", rows: [{ label: "Role", value: "Dev", detail }] };
      expect(parseConfig(rawConfig({ tabs: [tab("a", { blocks: [fields] })] })).errors).toEqual([
        'tabs.0.blocks.0.rows.0.detail.blocks.0.groups.0.rows.0.action: unknown job "ops", drawn without a link',
      ]);
    });

    it("names a collapsible group without a label", () => {
      const block = stats(undefined, { groups: [{ collapsible: "closed", rows: [{ label: "A", value: "1" }] }] });
      const { config, errors } = parseConfig(rawConfig({ tabs: [tab("a", { blocks: [block] })] }));
      expect(config?.tabs?.[0].blocks).toHaveLength(1);
      expect(errors).toEqual(["tabs.0.blocks.0.groups.0: collapsible without a label, drawn plain"]);
    });
  });

  describe("detail windows", () => {
    it("refuses a detail inside a detail", () => {
      const inner = { label: "More", title: "More", blocks: [stats()] };
      const detail = { label: "More", title: "More", blocks: [{ type: "fields", rows: [{ label: "A", value: "1", detail: inner }] }] };
      const raw = rawConfig({ tabs: [tab("a", { blocks: [stats(), { type: "fields", rows: [{ label: "A", value: "1", detail }] }] })] });
      const { config, errors } = parseConfig(raw);
      // Stripped as an unknown key, as any other key the schema doesn't have.
      expect(errors).toEqual([]);
      expect(findUnknownKeys(raw, config)).toEqual(["tabs.0.blocks.1.rows.0.detail.blocks.0.rows.0.detail"]);
    });
  });

  describe("job.blocks", () => {
    const tabs = [tab("a", { blocks: [gauges("vitals"), stats("core")] })];
    const withJobBlocks = (blocks: Raw) => rawConfig({ tabs, jobs: [rawJob("web", { blocks }), rawJob("data")] });

    it("keeps a replacement of the same type", () => {
      const { config, errors } = parseConfig(withJobBlocks({ vitals: gauges() }));
      expect(errors).toEqual([]);
      expect(Object.keys(config?.jobs[0].blocks ?? {})).toEqual(["vitals"]);
    });

    it("drops an entry naming no block, and keeps the job", () => {
      const { config, errors } = parseConfig(withJobBlocks({ vitals: gauges(), ghost: gauges() }));
      expect(jobIds(config)).toEqual(["web", "data"]);
      expect(Object.keys(config?.jobs[0].blocks ?? {})).toEqual(["vitals"]);
      expect(errors).toEqual(['jobs.0.blocks.ghost: unknown block "ghost", ignored']);
    });

    it("drops an entry of another type than the block it names", () => {
      const { config, errors } = parseConfig(withJobBlocks({ vitals: stats() }));
      expect(config?.jobs[0].blocks).toEqual({});
      expect(errors).toEqual(["jobs.0.blocks.vitals: a stats block can't replace a gauges block, ignored"]);
    });

    it("drops an entry that doesn't parse, and keeps the job", () => {
      const { config, errors } = parseConfig(withJobBlocks({ vitals: { type: "gauges", rows: [] }, core: stats() }));
      expect(jobIds(config)).toEqual(["web", "data"]);
      expect(Object.keys(config?.jobs[0].blocks ?? {})).toEqual(["core"]);
      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors) expect(error).toMatch(/^jobs\.0\.blocks\.vitals\.rows: /);
    });

    it("names a block that was dropped as unknown", () => {
      const raw = rawConfig({
        tabs: [tab("a", { blocks: [stats(), { type: "gauges", id: "vitals", rows: [] }] })],
        jobs: [rawJob("web", { blocks: { vitals: gauges() } })],
      });
      expect(parseConfig(raw).errors.at(-1)).toBe('jobs.0.blocks.vitals: unknown block "vitals", ignored');
    });

    it("names an unknown job in a replacement", () => {
      const levels = (action?: Raw) => ({ type: "levels", groups: [{ rows: [{ label: "A", level: "1", action }] }] });
      const raw = rawConfig({
        tabs: [tab("a", { blocks: [{ ...levels(), id: "lv" }] })],
        jobs: [rawJob("web", { blocks: { lv: levels({ kind: "job", id: "ops" }) } })],
      });
      expect(parseConfig(raw).errors).toEqual([
        'jobs.0.blocks.lv.groups.0.rows.0.action: unknown job "ops", drawn without a link',
      ]);
    });

    it("still drops a job whose other fields are bad", () => {
      const { config } = parseConfig(rawConfig({ tabs, jobs: [rawJob("web"), rawJob("data", { blocks: { vitals: gauges() }, level: {} })] }));
      expect(jobIds(config)).toEqual(["web"]);
    });
  });

  describe("gearSet", () => {
    const link = (label: string, position?: "start" | "end") => ({ label, action: { kind: "none" }, ...(position && { position }) });

    it("drops a bad gearSet with errors under its path, and keeps the config", () => {
      const { config, errors } = parseConfig(rawConfig({ gearSet: { label: "" } }));
      expect(config).not.toBeNull();
      expect(config).not.toHaveProperty("gearSet");
      expect(errors).toEqual([expect.stringMatching(/^gearSet\.label: /)]);
    });

    it("reports a third start link, and keeps it for editors", () => {
      const { config, errors } = parseConfig(rawConfig({ gearSet: { links: [link("a"), link("b", "start"), link("c")] } }));
      expect(config?.gearSet?.links).toHaveLength(3);
      expect(errors).toEqual(["gearSet.links.2: start link over the limit of 2, not shown"]);
    });

    it("reports a second end link", () => {
      const { errors } = parseConfig(rawConfig({ gearSet: { links: [link("a", "end"), link("b"), link("c", "end")] } }));
      expect(errors).toEqual(["gearSet.links.2: end link over the limit of 1, not shown"]);
    });

    it("refuses more links than the limit", () => {
      const { errors } = parseConfig(rawConfig({ gearSet: { links: [link("a"), link("b"), link("c", "end"), link("d")] } }));
      expect(errors).toEqual([expect.stringMatching(/^gearSet\.links: /)]);
    });

    it("names an unknown job in a link", () => {
      const { errors } = parseConfig(rawConfig({ gearSet: { links: [{ label: "Ops", action: { kind: "job", id: "ops" } }] } }));
      expect(errors).toEqual(['gearSet.links.0.action: unknown job "ops", drawn without a link']);
    });

    it("drops a job's bad gearSet and keeps the job", () => {
      const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("web", { gearSet: { label: "" } })] }));
      expect(jobIds(config)).toEqual(["web"]);
      expect(config?.jobs[0]).not.toHaveProperty("gearSet");
      expect(errors).toEqual([expect.stringMatching(/^jobs\.0\.gearSet\.label: /)]);
    });

    it("checks a job's own gearSet the same way", () => {
      const gearSet = { links: [link("a", "end"), link("b", "end")] };
      const { config, errors } = parseConfig(rawConfig({ jobs: [rawJob("web", { gearSet })] }));
      expect(config?.jobs[0].gearSet?.links).toHaveLength(2);
      expect(errors).toEqual(["jobs.0.gearSet.links.1: end link over the limit of 1, not shown"]);
    });

    it("refuses an icon name that isn't built in", () => {
      const { errors } = parseConfig(rawConfig({ gearSet: { links: [{ ...link("a"), iconName: "dragon" }] } }));
      expect(errors).toEqual([expect.stringMatching(/^gearSet\.links\.0\.iconName: /)]);
    });
  });
});

describe("findUnknownKeys", () => {
  function unknownKeys(raw: Raw): string[] {
    const { config, errors } = parseConfig(raw);
    expect(errors).toEqual([]);
    return findUnknownKeys(raw, config);
  }

  it("finds nothing in a config the schema fully knows", () => {
    expect(unknownKeys(rawConfig())).toEqual([]);
  });

  it("names each unknown key by its dotted path, array indexes included, in the input's order", () => {
    const slots = { skills: { tooltip: { title: "Skills", subtitel: "typo" }, action: { kind: "none" } } };
    const raw = rawConfig({ jobs: [rawJob("web"), rawJob("data", { slots })], titel: "typo" });
    expect(unknownKeys(raw)).toEqual(["jobs.1.slots.skills.tooltip.subtitel", "titel"]);
  });

  it("reports an unknown key without looking inside it", () => {
    expect(unknownKeys(rawConfig({ extra: { nested: true } }))).toEqual(["extra"]);
  });

  it("reports a key named like an Object.prototype property", () => {
    expect(unknownKeys(rawConfig({ constructor: "x", toString: "y" }))).toEqual(["constructor", "toString"]);
  });

  it("ignores values that aren't objects or arrays", () => {
    expect(findUnknownKeys("text", null)).toEqual([]);
    expect(findUnknownKeys({ a: 1 }, null)).toEqual([]);
  });
});

describe("loadConfig", () => {
  const fallback = parseConfig(rawConfig({ defaultJobId: "fallback", jobs: [rawJob("fallback")] })).config!;
  const source = (name: string, load: () => unknown): ConfigSource => ({ name, load: async () => load() });

  it("uses the first source with a usable config", async () => {
    const result = await loadConfig(
      [source("api", () => rawConfig()), source("cms", () => rawConfig({ defaultJobId: "data" }))],
      fallback,
    );
    expect(result.source).toBe("api");
    expect(result.config.defaultJobId).toBe("web");
    expect(result.issues).toEqual([]);
  });

  it("moves on quietly from a source with nothing yet", async () => {
    const result = await loadConfig([source("api", () => undefined), source("cms", () => rawConfig())], fallback);
    expect(result.source).toBe("cms");
    expect(result.issues).toEqual([]);
  });

  it("records a source that throws, with the error, and moves on", async () => {
    const failure = new Error("HTTP 503");
    const result = await loadConfig(
      [
        source("api", () => {
          throw failure;
        }),
        source("cms", () => rawConfig()),
      ],
      fallback,
    );
    expect(result.source).toBe("cms");
    expect(result.issues).toEqual([{ source: "api", errors: ["Error: HTTP 503"], error: failure }]);
  });

  it("uses a source with errors when it still has a config, and records them", async () => {
    const result = await loadConfig(
      [source("api", () => rawConfig({ jobs: [rawJob("web"), rawJob("web")] }))],
      fallback,
    );
    expect(result.source).toBe("api");
    expect(result.issues).toEqual([{ source: "api", errors: ['jobs.1: duplicate id "web", dropped'] }]);
  });

  it("records an unusable source and moves on", async () => {
    const result = await loadConfig([source("api", () => ({ jobs: [] })), source("cms", () => rawConfig())], fallback);
    expect(result.source).toBe("cms");
    expect(result.issues.map((issue) => issue.source)).toEqual(["api"]);
    expect(result.issues[0].errors.length).toBeGreaterThan(0);
  });

  it("falls back, with every issue, when no source works", async () => {
    const result = await loadConfig(
      [
        source("api", () => {
          throw new Error("down");
        }),
        source("cms", () => "garbage"),
      ],
      fallback,
    );
    expect(result).toMatchObject({ config: fallback, source: null });
    expect(result.issues.map((issue) => issue.source)).toEqual(["api", "cms"]);
  });

  it("falls back without issues when no source has anything yet", async () => {
    const result = await loadConfig([source("api", () => undefined)], fallback);
    expect(result).toEqual({ config: fallback, source: null, issues: [] });
  });
});
