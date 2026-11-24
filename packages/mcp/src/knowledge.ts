import {
  getKnowledge,
  type KnowledgeQuery,
  loadKnowledge,
  recordLesson,
  searchKnowledge,
} from "@toros/tokens";
import { projectRoot, resolveInside } from "./guard.js";

export interface SearchKnowledgeArgs {
  text?: string | undefined;
  tags?: string[] | undefined;
  kind?: "note" | "lesson" | undefined;
  limit?: number | undefined;
  projectDir?: string | undefined;
}

export interface AddLessonArgs {
  id: string;
  title: string;
  tags: string[];
  mistake: string;
  rule: string;
  projectDir?: string | undefined;
}

const dirOf = (projectDir: string | undefined, env: NodeJS.ProcessEnv): string =>
  resolveInside(projectRoot(env), projectDir ?? ".");

export function searchKnowledgeTool(
  args: SearchKnowledgeArgs,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const query: KnowledgeQuery = {
    ...(args.text && { text: args.text }),
    ...(args.tags && { tags: args.tags }),
    ...(args.kind && { kind: args.kind }),
    ...(args.limit !== undefined && { limit: args.limit }),
  };
  const { entries } = loadKnowledge({ projectDir: dirOf(args.projectDir, env) });
  return JSON.stringify(searchKnowledge(entries, query), null, 2);
}

export function getKnowledgeTool(
  args: { id: string; projectDir?: string | undefined },
  env: NodeJS.ProcessEnv = process.env,
): string {
  const { entries } = loadKnowledge({ projectDir: dirOf(args.projectDir, env) });
  const entry = getKnowledge(entries, args.id);
  if (!entry) {
    throw new Error(`No entry "${args.id}". Fix: call search_knowledge and use an id from it.`);
  }
  return JSON.stringify(entry, null, 2);
}

export function addLessonTool(args: AddLessonArgs, env: NodeJS.ProcessEnv = process.env): string {
  const dir = dirOf(args.projectDir, env);
  const { created, seen } = recordLesson(dir, args);
  return `${created ? "Saved" : "Updated"} lesson ${args.id} (seen ${seen}) in .toros/knowledge/lessons.`;
}
