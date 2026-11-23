import { resolve } from "node:path";
import { captureShots, formatShots, type ShotViewport } from "@toros/check";

export interface ShotsCommandOptions {
  url: string;
  projectDir?: string;
  out?: string;
  viewport?: string;
  json?: boolean;
}

export async function shots(opts: ShotsCommandOptions): Promise<number> {
  const viewport = opts.viewport ?? "both";
  if (!["desktop", "phone", "both"].includes(viewport))
    throw new Error(`Unknown viewport "${viewport}". Fix: use desktop, phone or both.`);
  const manifest = await captureShots({
    url: opts.url,
    projectDir: resolve(opts.projectDir ?? process.cwd()),
    ...(opts.out !== undefined && { outDir: resolve(opts.out) }),
    viewport: viewport as ShotViewport,
  });
  process.stdout.write(
    opts.json ? `${JSON.stringify(manifest, null, 2)}\n` : formatShots(manifest),
  );
  return 0;
}
