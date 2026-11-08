import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `npm run dev` runs `vite playground`, so this directory is Vite's root and
// public/ holds the examples' images. Files outside it (src/, examples/)
// are served because Vite allows the whole package root by default.
export default defineConfig({
  plugins: [react()],
});
