// TypeScript 6 checks side-effect imports (`noUncheckedSideEffectImports`),
// so `import "./character-sheet.css"` needs a declaration. tsconfig.json gets
// one from Vite's client types through the playground; the build sees only
// src/. Not emitted to dist/ and referenced by nothing there (the CSS import
// is stripped from the emitted .d.ts, see scripts/strip-dts-css-imports.mjs);
// it ships under src/ like the other sources.
declare module "*.css";
