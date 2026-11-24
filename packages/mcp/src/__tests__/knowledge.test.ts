import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { addLessonTool, getKnowledgeTool, searchKnowledgeTool } from "../knowledge.js";

const root = realpathSync(mkdtempSync(join(tmpdir(), "toros-knowledge-mcp-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const env = { TOROS_PROJECT_ROOT: root };

describe("knowledge tools", () => {
  it("searches, then reads the full entry", () => {
    const hits = JSON.parse(searchKnowledgeTool({ text: "dark brand looks black" }, env));
    expect(hits[0].id).toBe("near-black-surfaces");
    expect(hits[0].body).toBeUndefined();
    expect(JSON.parse(getKnowledgeTool({ id: hits[0].id }, env)).body).toContain("Rule:");
  });

  it("adds a lesson inside the project and finds it afterwards", () => {
    const args = {
      id: "port-clash",
      title: "Two dev servers on one port",
      tags: ["dev-server"],
      mistake: "A second server silently took another port.",
      rule: "Always pass --strictPort.",
    };
    expect(addLessonTool(args, env)).toContain("Saved");
    expect(addLessonTool(args, env)).toContain("seen 2");
    expect(readFileSync(join(root, ".toros/knowledge/lessons/port-clash.md"), "utf8")).toContain(
      "seen: 2",
    );
    const hits = JSON.parse(searchKnowledgeTool({ text: "second server port" }, env));
    expect(hits.map((m: { id: string }) => m.id)).toContain("port-clash");
  });

  it("refuses a project folder outside the root and an unknown id", () => {
    expect(() => searchKnowledgeTool({ projectDir: "/tmp" }, env)).toThrow(
      /outside the project root/,
    );
    expect(() => getKnowledgeTool({ id: "nope" }, env)).toThrow(/Fix:/);
  });
});
