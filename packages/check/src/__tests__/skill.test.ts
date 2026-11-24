import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import rules from "../rules/index.js";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../skills/toros");
const read = (file: string): string => readFileSync(join(skillDir, file), "utf8");
const skill = read("SKILL.md");

describe("toros agent skill", () => {
  it("has valid frontmatter", () => {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(skill);
    expect(match).not.toBeNull();
    const front = match?.[1] ?? "";
    const name = /^name:\s*(.+)$/m.exec(front)?.[1]?.trim() ?? "";
    const description = /^description:\s*(.+)$/m.exec(front)?.[1]?.trim() ?? "";
    expect(name).toBe("toros");
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).toMatch(/use when/i);
  });

  it("stays short enough to load whole", () => {
    expect(skill.split("\n").length).toBeLessThanOrEqual(400);
  });

  it("has no leftover shell lines and a nested metadata block", () => {
    expect(skill).not.toMatch(/^(EOF|cat )/m);
    expect(skill).toMatch(/^metadata:\n {2}version:/m);
    expect(skill.match(/^# Toros$/gm)).toHaveLength(1);
  });

  it("tells the agent to search and record knowledge", () => {
    for (const tool of ["search_knowledge", "get_knowledge", "add_lesson"]) {
      expect(skill).toContain(tool);
    }
  });

  it("only links to files that exist", () => {
    const links = [...skill.matchAll(/\]\((references\/[^)#]+)\)/g)].map((m) => m[1] ?? "");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(existsSync(join(skillDir, link)), link).toBe(true);
  });

  it("documents exactly the registered rules", () => {
    const documented = [
      ...read("references/rules.md").matchAll(/^\| `([a-z0-9-]+\/[a-z0-9-]+)`\s*\|/gm),
    ]
      .map((m) => m[1])
      .sort();
    expect(documented).toEqual(rules.map((rule) => rule.id).sort());
  });
});
