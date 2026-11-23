import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { captureShotsTool } from "../shots.js";

const root = realpathSync(mkdtempSync(join(tmpdir(), "toros-mcp-shots-")));
const env = { TOROS_PROJECT_ROOT: root };

describe("capture_shots guards", () => {
  it("refuses remote URLs", async () => {
    await expect(captureShotsTool({ url: "https://example.com" }, env)).rejects.toThrow(
      /not local/,
    );
  });
  it("refuses an output folder outside the project", async () => {
    await expect(
      captureShotsTool({ url: "http://localhost:1", outDir: "../elsewhere" }, env),
    ).rejects.toThrow(/Fix:/);
  });
});
