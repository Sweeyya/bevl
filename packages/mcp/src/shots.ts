import { captureShots, formatShots } from "@toros/check";
import { assertSafeUrl, projectRoot, resolveInside } from "./guard.js";

export interface CaptureShotsArgs {
  url: string;
  projectDir?: string | undefined;
  outDir?: string | undefined;
  viewport?: "desktop" | "phone" | "both" | undefined;
}

export async function captureShotsTool(
  args: CaptureShotsArgs,
  env: NodeJS.ProcessEnv = process.env,
) {
  const url = assertSafeUrl(args.url, env);
  const root = projectRoot(env);
  const projectDir = resolveInside(root, args.projectDir ?? ".");
  const manifest = await captureShots({
    url: url.toString(),
    projectDir,
    ...(args.outDir !== undefined && { outDir: resolveInside(root, args.outDir) }),
    ...(args.viewport !== undefined && { viewport: args.viewport }),
  });
  return formatShots(manifest);
}
