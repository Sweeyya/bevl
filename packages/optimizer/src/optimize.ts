/**
 * optimize — shrink a GLB file using glTF Transform.
 * Runs: dedup, prune, simplify (if requested), draco compression.
 */

import { stat, writeFile } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
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
  /** Target texture size in px (longest side). Default 1024. */
  textureSize?: number;
}

export interface OptimizeResult {
  inputPath: string;
  outputPath: string;
  inputBytes: number;
  outputBytes: number;
  /** Reduction as a 0-1 fraction */
  reduction: number;
}

export async function optimizeGlb(opts: OptimizeOptions): Promise<OptimizeResult> {
  const inputPath = opts.input;
  const outputPath = opts.output ?? inputPath.replace(/\.glb$/i, "-optimized.glb");

  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

  const inputBytes = (await stat(inputPath)).size;

  const doc = await io.read(inputPath);

  await doc.transform(
    dedup(),
    prune(),
    weld(),
    resample(),
    instance({ min: 2 }),
    sparse(),
    textureCompress({
      targetFormat: "webp",
      resize: [opts.textureSize ?? 1024, opts.textureSize ?? 1024],
    }),
    draco(),
  );

  const glb = await io.writeBinary(doc);
  await writeFile(outputPath, glb);

  const outputBytes = glb.byteLength;
  const reduction = inputBytes > 0 ? 1 - outputBytes / inputBytes : 0;

  return { inputPath, outputPath, inputBytes, outputBytes, reduction };
}
