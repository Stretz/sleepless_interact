import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
});
