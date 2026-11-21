// The theme each example opens in, on the main page and /static: an
// example's own theme is its default, so the URL leaves it out. The
// portfolio is a résumé, written for the document theme; the rest are game
// screens.
const EXAMPLE_THEMES: Record<string, "document" | "game"> = {
  portfolio: "document",
};

export function exampleTheme(fixture: string): "document" | "game" {
  return Object.hasOwn(EXAMPLE_THEMES, fixture) ? EXAMPLE_THEMES[fixture] : "game";
}
