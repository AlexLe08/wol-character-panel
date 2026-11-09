import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// `npm run dev` runs `vite playground`, so this directory is Vite's root and
// public/ holds the examples' images. Files outside it (src/, examples/)
// are served because Vite allows the whole package root by default.
export default defineConfig({
  plugins: [react(), staticPage()],
});

// Serves /static: the panel rendered on the server by static.tsx, with no
// client script (see that file). Dev server only.
function staticPage(): Plugin {
  return {
    name: "playground-static-page",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // The tsconfig has no Node types (src/ must not lean on them), so
        // Node's request type is empty here; its url is a path.
        const { url: path = "/" } = req as { url?: string };
        const url = new URL(path, "http://playground");
        if (url.pathname !== "/static") return next();
        try {
          const { render } = await server.ssrLoadModule("/static.tsx");
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(render(url));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
