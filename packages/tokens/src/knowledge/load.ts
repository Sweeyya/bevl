import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseKnowledge } from "./parse.js";
import type { Knowledge } from "./schema.js";

const MAX_FILE_BYTES = 16_000;
const MAX_FILES = 500;

export const bundledKnowledgeDir = fileURLToPath(new URL("../../knowledge/", import.meta.url));

export const projectKnowledgeDir = (projectDir: string): string =>
  join(projectDir, ".toros", "knowledge");

export interface LoadResult {
  entries: Knowledge[];
  problems: string[];
}

function readTree(root: string, source: Knowledge["source"], out: LoadResult): void {
  let files = 0;
  const walk = (dir: string, depth: number): void => {
    let names: string[];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      const path = join(dir, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        if (depth < 2) walk(path, depth + 1);
        continue;
      }
      if (!name.endsWith(".md") || name === "README.md") continue;
      if (++files > MAX_FILES) {
        out.problems.push(`${root}: more than ${MAX_FILES} files, the rest are ignored.`);
        return;
      }
      if (stat.size > MAX_FILE_BYTES) {
        out.problems.push(
          `${path}: larger than ${MAX_FILE_BYTES} bytes. Fix: split it into smaller notes.`,
        );
        continue;
      }
      const result = parseKnowledge(readFileSync(path, "utf8"), path, source);
      if (result.ok) out.entries.push(result.entry);
      else out.problems.push(result.error);
    }
  };
  walk(root, 0);
}

/** Bundled files first, then the project's `.toros/knowledge`. A project entry with the same id replaces the bundled one. */
export function loadKnowledge(
  options: { projectDir?: string; bundledDir?: string } = {},
): LoadResult {
  const bundled: LoadResult = { entries: [], problems: [] };
  readTree(options.bundledDir ?? bundledKnowledgeDir, "bundled", bundled);
  const project: LoadResult = { entries: [], problems: [] };
  if (options.projectDir) readTree(projectKnowledgeDir(options.projectDir), "project", project);
  const local = new Set(project.entries.map((e) => e.id));
  return {
    entries: [...bundled.entries.filter((e) => !local.has(e.id)), ...project.entries],
    problems: [...bundled.problems, ...project.problems],
  };
}
