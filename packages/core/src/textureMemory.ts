import type { Material, Object3D, Texture } from "three";

const BYTES_PER_PIXEL = 4;
const MIPMAP_FACTOR = 4 / 3;

function isTexture(value: unknown): value is Texture {
  return typeof value === "object" && value !== null && (value as Texture).isTexture === true;
}

/** Estimated GPU memory in MB of every distinct texture used by a material in the scene (RGBA8 plus mipmaps). */
export function estimateTextureMb(scene: Object3D): number {
  const seen = new Set<Texture>();
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(m)) if (isTexture(value)) seen.add(value);
    }
  });
  let bytes = 0;
  for (const texture of seen) {
    const image = texture.image as { width?: number; height?: number } | null;
    const pixels = (image?.width ?? 0) * (image?.height ?? 0);
    bytes += pixels * BYTES_PER_PIXEL * (texture.generateMipmaps ? MIPMAP_FACTOR : 1);
  }
  return bytes / (1024 * 1024);
}
