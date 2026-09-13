import { defineConfig } from "vite";

export default defineConfig({
  // relative asset paths: served from /unstuck-games/orbis/ on GitHub Pages
  base: "./",
  server: { port: 5188 },
  // GitHub Pages serves the repo root from main, so the built game is committed at /orbis
  build: { outDir: "../../orbis", emptyOutDir: true },
});
