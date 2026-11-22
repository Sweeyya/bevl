import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer, type ViteDevServer } from "vite";
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

let server: ViteDevServer;
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
  server = await createServer({
    configFile: join(root, "fixtures/host/vite.config.ts"),
    server: { port: 0, host: "127.0.0.1" },
  });
  await server.listen();
  const address = server.httpServer?.address() as AddressInfo | null | undefined;
  base = `http://127.0.0.1:${address?.port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const name of ["good", ...names]) {
    await page.goto(`${base}/?fixture=${name}&doodley-test`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => "__doodley" in window, undefined, { timeout: 60_000 });
  }
  await browser.close();
}, 300_000);

afterAll(async () => {
  await server?.close();
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
