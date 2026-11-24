import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectKnowledgeDir } from "./load.js";
import { formatKnowledge, parseKnowledge } from "./parse.js";
import { type Knowledge, knowledgeSchema } from "./schema.js";

export interface LessonInput {
  id: string;
  title: string;
  tags: string[];
  mistake: string;
  rule: string;
}

export interface LessonResult {
  path: string;
  seen: number;
  created: boolean;
}

/** Writes or updates `.toros/knowledge/lessons/<id>.md`. Saying the same lesson again raises `seen` instead of duplicating it. */
export function recordLesson(projectDir: string, input: LessonInput): LessonResult {
  const dir = join(projectKnowledgeDir(projectDir), "lessons");
  const path = join(dir, `${input.id}.md`);
  const body = `Mistake: ${input.mistake.trim()}\n\nRule: ${input.rule.trim()}`;
  let seen = 1;
  const created = !existsSync(path);
  if (!created) {
    const old = parseKnowledge(readFileSync(path, "utf8"), path, "project");
    if (old.ok) seen = (old.entry.seen ?? 1) + 1;
  }
  const entry = {
    id: input.id,
    kind: "lesson" as const,
    title: input.title,
    tags: input.tags,
    seen,
    body,
  };
  const short = input.mistake.trim().length < 10 || input.rule.trim().length < 10;
  const check = knowledgeSchema.safeParse({ ...entry, source: "project" });
  if (short || !check.success) {
    const issue = check.success ? undefined : check.error.issues[0];
    throw new Error(
      `Invalid lesson: ${issue?.path.join(".") || "entry"} ${issue?.message ?? ""}. Fix: use a lowercase-hyphen id, 1 to 10 lowercase-hyphen tags, and at least a sentence each for mistake and rule.`,
    );
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, formatKnowledge(entry as Omit<Knowledge, "source">));
  return { path, seen, created };
}
