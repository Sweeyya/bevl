import type { Color, Material, Object3D } from "three";
import type { MaterialState } from "./contract.js";

type Colored = Material & { color?: Color; emissive?: Color };

/** Every distinct material under `root`, with the hex colors it uses (emissive only when lit). */
export function collectMaterials(root: Object3D): MaterialState[] {
  const seen = new Map<string, MaterialState>();
  root.traverse((object) => {
    const raw = (object as { material?: Material | Material[] }).material;
    if (!raw) return;
    for (const material of Array.isArray(raw) ? raw : [raw]) {
      if (seen.has(material.uuid)) continue;
      const { color, emissive } = material as Colored;
      const colors: string[] = [];
      if (color) colors.push(`#${color.getHexString()}`);
      if (emissive && emissive.getHex() !== 0) colors.push(`#${emissive.getHexString()}`);
      seen.set(material.uuid, { name: material.name || material.type, colors });
    }
  });
  return [...seen.values()];
}
