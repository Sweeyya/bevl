import { formatReport, runCheck } from "@doodley/check";
import { optimizeGlb } from "@doodley/optimizer";
import { readTokenFile } from "@doodley/tokens";
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
