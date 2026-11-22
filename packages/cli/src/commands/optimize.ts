import { optimizeGlb } from "@doodley/optimizer";

export interface OptimizeCommandOptions {
  input: string;
  output?: string;
  textureSize?: number;
  draco?: boolean;
  textures?: boolean;
}

export async function optimizeAssets(opts: OptimizeCommandOptions): Promise<void> {
  const result = await optimizeGlb({
    input: opts.input,
    ...(opts.output !== undefined && { output: opts.output }),
    ...(opts.textureSize !== undefined && { textureSize: opts.textureSize }),
    ...(opts.draco && { draco: true }),
    ...(opts.textures && { textures: true }),
  });
  const pct = (result.reduction * 100).toFixed(1);
  process.stdout.write(
    `Optimized: ${result.inputPath}\n` +
      `  Input:  ${(result.inputBytes / 1024).toFixed(1)} KB\n` +
      `  Output: ${(result.outputBytes / 1024).toFixed(1)} KB → ${pct}% smaller\n` +
      `  Saved:  ${result.outputPath}\n`,
  );
}
