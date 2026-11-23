import { readFile } from "node:fs/promises";
import { briefOrThrow, dealForBrief, parseBriefText } from "@toros/tokens";
import { projectRoot, requireExtension, resolveInside } from "./guard.js";

export interface ValidateBriefArgs {
  file: string;
}

export interface DealArgs {
  briefFile: string;
  seed?: number | undefined;
  apply?: boolean | undefined;
  projectDir?: string | undefined;
}

const briefPath = (root: string, file: string) =>
  requireExtension(resolveInside(root, file), [".json"], "file");

export async function validateBriefTool(
  args: ValidateBriefArgs,
  env: NodeJS.ProcessEnv = process.env,
) {
  const path = briefPath(projectRoot(env), args.file);
  const result = parseBriefText(await readFile(path, "utf8"), args.file);
  return result.ok
    ? `${args.file} is a valid brief (${result.brief.kind}, "${result.brief.name}").`
    : result.errors.join("\n");
}

export async function dealArtDirectionTool(args: DealArgs, env: NodeJS.ProcessEnv = process.env) {
  const root = projectRoot(env);
  const path = briefPath(root, args.briefFile);
  const brief = briefOrThrow(
    parseBriefText(await readFile(path, "utf8"), args.briefFile),
    args.briefFile,
  );
  const dir = args.apply ? resolveInside(root, args.projectDir ?? ".") : undefined;
  const { direction, notes } = await dealForBrief({ brief, seed: args.seed ?? 1, dir });
  return JSON.stringify({ direction, applied: notes }, null, 2);
}
