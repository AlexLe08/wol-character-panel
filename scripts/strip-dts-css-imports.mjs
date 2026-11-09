// The last step of `npm run build`: blanks CSS side-effect imports
// (`import "./character-sheet.css";`) in dist/*.d.ts. tsc copies them from
// the source, but a .css file has no types, so TypeScript 6+ (where
// noUncheckedSideEffectImports is on by default) fails a host that imports
// "/react" with skipLibCheck off (TS2882). The .js files keep the import,
// which is what loads the CSS. The line is blanked rather than removed so
// the .d.ts.map files still line up.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const cssImport = /^import\s+["']\.\/[^"']+\.css["'];?$/gm;

for (const name of readdirSync(dist)) {
  if (!name.endsWith(".d.ts")) continue;
  const file = new URL(name, dist);
  const text = readFileSync(file, "utf8");
  const stripped = text.replace(cssImport, "");
  if (stripped !== text) writeFileSync(file, stripped);
}
