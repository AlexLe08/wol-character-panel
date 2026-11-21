// What the main page and /static know about each example: the theme it
// opens in (its default, so the URL leaves it out), the intro the header
// shows for it, and its place in the Example control. The portfolio is a
// résumé, written for the document theme; the rest are game screens.
// edge-cases is a stress test, not a model config, so it goes last.
type ExampleInfo = {
  theme: "document" | "game";
  intro: string;
  stressTest?: boolean;
};

// In the Example control's order. An example missing here still shows, in
// the game theme with no intro, after these but before the stress tests.
const EXAMPLES: Record<string, ExampleInfo> = {
  adventurer: {
    theme: "game",
    intro:
      "The adventurer example: a game character screen, with a fully geared Paladin and two more jobs in the job menu.",
  },
  portfolio: {
    theme: "document",
    intro:
      "The portfolio example: a developer's résumé, where each job is a role and each slot a skill, project or contact.",
  },
  minimal: {
    theme: "game",
    intro: "The minimal example: about the smallest config that renders, one job and one filled slot.",
  },
  "edge-cases": {
    theme: "game",
    intro:
      "The edge-cases example, a stress test: every field at its limit, a job with no portrait or filled slots, and a hidden job (Drafts and hidden jobs shows it).",
    stressTest: true,
  },
};

const info = (name: string): ExampleInfo | undefined => (Object.hasOwn(EXAMPLES, name) ? EXAMPLES[name] : undefined);

export function exampleTheme(name: string): "document" | "game" {
  return info(name)?.theme ?? "game";
}

export function exampleIntro(name: string): string | undefined {
  return info(name)?.intro;
}

export function exampleLabel(name: string): string {
  return info(name)?.stressTest ? `${name} (stress test)` : name;
}

// The examples in the Example control's order: those listed above in
// their order, then any others by name, then the stress tests.
export function exampleOrder(names: string[]): string[] {
  const listed = Object.keys(EXAMPLES);
  const rank = (name: string) => {
    if (info(name)?.stressTest) return [2, listed.indexOf(name)] as const;
    return listed.includes(name) ? ([0, listed.indexOf(name)] as const) : ([1, 0] as const);
  };
  return [...names].sort((a, b) => {
    const [groupA, indexA] = rank(a);
    const [groupB, indexB] = rank(b);
    return groupA - groupB || indexA - indexB || a.localeCompare(b);
  });
}
