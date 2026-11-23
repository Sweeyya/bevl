import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dealArtDirectionTool, validateBriefTool } from "../taste.js";

const setup = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "toros-mcp-taste-")));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "toros.json"), JSON.stringify({ sections: [] }));
  const brief = { version: 1, name: "Cafe", kind: "venue", colors: "choose", tone: ["warm"] };
  writeFileSync(join(root, "toros.brief.json"), JSON.stringify(brief));
  writeFileSync(join(root, "bad.json"), JSON.stringify({ version: 3 }));
  return { root, env: { TOROS_PROJECT_ROOT: root } };
};

describe("taste tools", () => {
  it("validates a brief and lists Fix lines for a bad one", async () => {
    const { env } = setup();
    expect(await validateBriefTool({ file: "toros.brief.json" }, env)).toContain("valid brief");
    expect(await validateBriefTool({ file: "bad.json" }, env)).toContain("Fix:");
  });

  it("deals and applies a direction inside the project only", async () => {
    const { root, env } = setup();
    const out = JSON.parse(
      await dealArtDirectionTool({ briefFile: "toros.brief.json", apply: true }, env),
    );
    expect(out.direction.id).toBe("roastery-night");
    expect(
      JSON.parse(readFileSync(join(root, "src/brand.tokens.json"), "utf8")).colors.primary,
    ).toBe(out.direction.palette.primary);
    await expect(dealArtDirectionTool({ briefFile: "../x.json" }, env)).rejects.toThrow(
      "outside the project root",
    );
  });
});
