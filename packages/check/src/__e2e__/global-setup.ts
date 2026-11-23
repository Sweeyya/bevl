import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import type { TestProject } from "vitest/node";

const root = resolve(fileURLToPath(import.meta.url), "../../../../..");

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const dir = mkdtempSync(join(tmpdir(), "toros-e2e-"));
  const outDir = join(dir, "host-dist");
  const configFile = join(root, "fixtures/host/vite.config.ts");
  await build({ configFile, build: { outDir, emptyOutDir: true }, logLevel: "error" });
  const server = await preview({
    configFile,
    build: { outDir },
    preview: { port: 0, host: "127.0.0.1" },
    logLevel: "error",
  });
  const { port } = server.httpServer.address() as AddressInfo;
  project.provide("baseUrl", `http://127.0.0.1:${port}`);
  return async () => {
    await new Promise<void>((done) => server.httpServer.close(() => done()));
    rmSync(dir, { recursive: true, force: true });
  };
}
