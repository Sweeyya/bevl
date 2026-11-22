import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__e2e__/**/*.e2e.test.ts"],
    globalSetup: ["src/__e2e__/global-setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
