import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { optimizeGlb } from "../optimize.js";

let dir = "";
let input = "";

async function buildGlb(): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const unused = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array(3000))
    .setBuffer(buffer);
  void unused;
  const prim = doc.createPrimitive().setAttribute("POSITION", position);
  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  doc.createScene().addChild(node);
  return new NodeIO().writeBinary(doc);
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "doodley-opt-"));
  input = join(dir, "model.glb");
  writeFileSync(input, await buildGlb());
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("optimizeGlb", () => {
  it("optimizes a real GLB with no optional packages, producing a valid, smaller file", async () => {
    const output = join(dir, "out.glb");
    const result = await optimizeGlb({ input, output });
    expect(result.outputPath).toBe(output);
    expect(result.outputBytes).toBeLessThan(result.inputBytes);
    expect(result.reduction).toBeGreaterThan(0);
    const reread = await new NodeIO().read(output);
    expect(reread.getRoot().listMeshes()).toHaveLength(1);
  });

  it("defaults the output name next to the input", async () => {
    const result = await optimizeGlb({ input });
    expect(result.outputPath).toBe(join(dir, "model-optimized.glb"));
    expect(readFileSync(result.outputPath).byteLength).toBe(result.outputBytes);
  });

  it("fails clearly when an opt-in package is not installed", async () => {
    await expect(optimizeGlb({ input, draco: true })).rejects.toThrow(/draco3dgltf.*Fix:/);
    await expect(optimizeGlb({ input, textures: true })).rejects.toThrow(/sharp.*Fix:/);
  });

  it("rejects a missing input file", async () => {
    await expect(optimizeGlb({ input: join(dir, "nope.glb") })).rejects.toThrow();
  });
});
