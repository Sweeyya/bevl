/**
 * optimize — shrink a GLB file using glTF Transform.
 * Always runs dedup, prune, weld, resample, instance and sparse (pure JavaScript).
 * Draco geometry compression and WebP textures are opt-in because they need packages
 * with native or WASM code that users install themselves: `draco3dgltf` and `sharp`.
 */

import { stat, writeFile } from "node:fs/promises";
import { NodeIO, type Transform } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  instance,
  prune,
  resample,
  sparse,
  textureCompress,
  weld,
} from "@gltf-transform/functions";

export interface OptimizeOptions {
  /** Absolute path to the input GLB file */
  input: string;
  /** Output path. Defaults to <input>-optimized.glb */
  output?: string;
  /** Target texture size in px (longest side), used when `textures` is on. Default 1024. */
  textureSize?: number;
  /** Compress geometry with Draco. Needs the `draco3dgltf` package. Default off. */
  draco?: boolean;
  /** Resize textures and convert them to WebP. Needs the `sharp` package. Default off. */
  textures?: boolean;
}

export interface OptimizeResult {
  inputPath: string;
  outputPath: string;
  inputBytes: number;
  outputBytes: number;
  /** Reduction as a 0-1 fraction */
  reduction: number;
}

async function loadOptional(name: string, why: string): Promise<Record<string, unknown>> {
  try {
    return (await import(name)) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${why} needs the "${name}" package. Fix: run "pnpm add ${name}" in your project, or leave the option off.`,
    );
  }
}

export async function optimizeGlb(opts: OptimizeOptions): Promise<OptimizeResult> {
  const inputPath = opts.input;
  const outputPath = opts.output ?? inputPath.replace(/\.glb$/i, "-optimized.glb");

  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const steps: Transform[] = [dedup(), prune(), weld(), resample(), instance({ min: 2 }), sparse()];

  if (opts.textures) {
    const sharp = (await loadOptional("sharp", "Texture compression")).default;
    const size = opts.textureSize ?? 1024;
    steps.push(
      textureCompress({
        encoder: sharp as never,
        targetFormat: "webp",
        resize: [size, size],
      }),
    );
  }

  if (opts.draco) {
    const mod = (await loadOptional("draco3dgltf", "Draco compression")) as unknown as {
      default?: DracoModule;
    } & DracoModule;
    const draco3d = mod.default ?? mod;
    io.registerDependencies({
      "draco3d.encoder": await draco3d.createEncoderModule(),
      "draco3d.decoder": await draco3d.createDecoderModule(),
    });
    steps.push(draco());
  }

  const inputBytes = (await stat(inputPath)).size;
  const doc = await io.read(inputPath);
  await doc.transform(...steps);

  const glb = await io.writeBinary(doc);
  await writeFile(outputPath, glb);

  const outputBytes = glb.byteLength;
  const reduction = inputBytes > 0 ? 1 - outputBytes / inputBytes : 0;

  return { inputPath, outputPath, inputBytes, outputBytes, reduction };
}

interface DracoModule {
  createEncoderModule(): Promise<unknown>;
  createDecoderModule(): Promise<unknown>;
}
