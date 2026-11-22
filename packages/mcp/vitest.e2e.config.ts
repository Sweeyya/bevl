import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__e2e__/**/*.e2e.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
