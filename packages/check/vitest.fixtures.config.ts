import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__fixtures__/**/*.test.ts"],
    testTimeout: 300_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
