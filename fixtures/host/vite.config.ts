import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: { "@bevl/core": resolve(__dirname, "../../packages/core/src/index.ts") },
    dedupe: ["react", "react-dom", "three", "@react-three/fiber"],
  },
  server: { fs: { allow: ["../.."] } },
  build: { target: "esnext" },
  logLevel: "warn",
});
