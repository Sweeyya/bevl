import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, type PreviewServer, preview } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCheck } from "../checker.js";
import type { Report } from "../report.js";

const root = resolve(fileURLToPath(import.meta.url), "../../../../..");
const brokenDir = join(root, "fixtures/broken");
const names = readdirSync(brokenDir).sort();

interface Expected {
  mustFail: string[];
  mayAlsoFail: string[];
}

let server: PreviewServer;
let base = "";
let projectDir = "";

async function check(fixture: string): Promise<Report> {
  return runCheck({ url: `${base}/?fixture=${fixture}`, projectDir });
}

function failedRules(report: Report): Set<string> {
  return new Set(report.findings.filter((f) => f.severity !== "info").map((f) => f.rule));
}

beforeAll(async () => {
  projectDir = mkdtempSync(join(tmpdir(), "doodley-fixtures-"));
  const outDir = join(projectDir, "host-dist");
  const configFile = join(root, "fixtures/host/vite.config.ts");
  await build({ configFile, build: { outDir, emptyOutDir: true }, logLevel: "error" });
  server = await preview({
    configFile,
    build: { outDir },
    preview: { port: 0, host: "127.0.0.1" },
    logLevel: "error",
  });
  const address = server.httpServer.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;
}, 300_000);

afterAll(async () => {
  await new Promise<void>((done) => (server ? server.httpServer.close(() => done()) : done()));
  rmSync(projectDir, { recursive: true, force: true });
});

describe("good baseline", () => {
  it("scores 90 or more with no errors", async () => {
    const report = await check("good");
    expect(report.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(report.score).toBeGreaterThanOrEqual(90);
  });
});

describe("broken fixtures", () => {
  for (const name of names) {
    it(name, async () => {
      const expected = JSON.parse(
        readFileSync(join(brokenDir, name, "expected.json"), "utf8"),
      ) as Expected;
      const failed = failedRules(await check(name));
      for (const rule of expected.mustFail) expect(failed, `${rule} should fail`).toContain(rule);
      const allowed = new Set([...expected.mustFail, ...expected.mayAlsoFail]);
      expect([...failed].filter((r) => !allowed.has(r))).toEqual([]);
    });
  }
});
