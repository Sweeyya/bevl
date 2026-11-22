import { formatReport, runCheck } from "@doodley/check";
import { optimizeGlb } from "@doodley/optimizer";
import { addSection, applyBrand, createSite, readTokenFile } from "@doodley/tokens";
import { assertSafeUrl, projectRoot, requireExtension, resolveInside } from "./guard.js";

export interface CheckSiteArgs {
  url: string;
  projectDir?: string | undefined;
  seed?: number | undefined;
  viewport?: "desktop" | "phone" | undefined;
  ruleId?: string | undefined;
}

export interface OptimizeAssetsArgs {
  input: string;
  output?: string | undefined;
  textureSize?: number | undefined;
}

export async function checkSite(args: CheckSiteArgs, env: NodeJS.ProcessEnv = process.env) {
  const url = assertSafeUrl(args.url, env);
  const root = projectRoot(env);
  const projectDir = resolveInside(root, args.projectDir ?? ".");
  const report = await runCheck({
    url: url.toString(),
    projectDir,
    ...(args.seed !== undefined && { seed: args.seed }),
    ...(args.viewport !== undefined && { viewportName: args.viewport }),
    ...(args.ruleId !== undefined && { ruleId: args.ruleId }),
  });
  return formatReport(report);
}

export async function optimizeAssets(
  args: OptimizeAssetsArgs,
  env: NodeJS.ProcessEnv = process.env,
) {
  const root = projectRoot(env);
  const input = requireExtension(resolveInside(root, args.input), [".glb"], "input");
  const output =
    args.output === undefined
      ? undefined
      : requireExtension(resolveInside(root, args.output), [".glb"], "output");
  const result = await optimizeGlb({
    input,
    ...(output !== undefined && { output }),
    ...(args.textureSize !== undefined && { textureSize: args.textureSize }),
  });
  const pct = (result.reduction * 100).toFixed(1);
  return (
    `Optimized: ${result.inputPath}\n` +
    `  Input:  ${(result.inputBytes / 1024).toFixed(1)} KB\n` +
    `  Output: ${(result.outputBytes / 1024).toFixed(1)} KB\n` +
    `  Saved:  ${pct}% smaller → ${result.outputPath}`
  );
}

export async function readBrandTokens(filePath: string, env: NodeJS.ProcessEnv = process.env) {
  const file = requireExtension(
    resolveInside(projectRoot(env), filePath),
    [".md", ".json"],
    "filePath",
  );
  return JSON.stringify(await readTokenFile(file), null, 2);
}

export interface CreateSiteArgs {
  name: string;
  dir?: string | undefined;
}

export interface AddSectionArgs {
  id: string;
  title: string;
  projectDir?: string | undefined;
}

export interface ApplyBrandArgs {
  file: string;
  projectDir?: string | undefined;
}

export async function createSiteTool(args: CreateSiteArgs, env: NodeJS.ProcessEnv = process.env) {
  const dir = resolveInside(projectRoot(env), args.dir ?? ".");
  await createSite({ name: args.name, dir });
  return `Created site "${args.name}" in ${dir}. Next: run pnpm install there, then pnpm dev.`;
}

export async function addSectionTool(args: AddSectionArgs, env: NodeJS.ProcessEnv = process.env) {
  const root = projectRoot(env);
  const dir = resolveInside(root, args.projectDir ?? ".");
  return (await addSection({ dir, id: args.id, title: args.title })).join("\n");
}

export async function applyBrandTool(args: ApplyBrandArgs, env: NodeJS.ProcessEnv = process.env) {
  const root = projectRoot(env);
  const dir = resolveInside(root, args.projectDir ?? ".");
  const file = requireExtension(resolveInside(root, args.file), [".md", ".json"], "file");
  return (await applyBrand({ dir, file })).join("\n");
}
