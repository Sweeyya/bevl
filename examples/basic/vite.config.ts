import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point directly at source so Vite's React plugin processes the JSX
      "@toros/core": resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});
