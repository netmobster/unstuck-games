import { defineConfig } from "vite";

export default defineConfig({
  // relative asset paths: served from /unstuck-games/bad-monkeys/play/ on GitHub Pages
  base: "./",
  server: { port: 5191 },
  // GitHub Pages serves the repo root from main; the alpha build is committed next to CD's hero page
  build: { outDir: "../../bad-monkeys/play", emptyOutDir: true },
});
