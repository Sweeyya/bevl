import type { Object3D } from "three";
import type { TextMeshState } from "./contract.js";

/** Every object with `userData.torosText` set to a string counts as a 3D text mesh. */
export function collectTextMeshes(scene: Object3D): TextMeshState[] {
  const found: TextMeshState[] = [];
  scene.traverse((object) => {
    const text: unknown = object.userData?.torosText;
    if (typeof text === "string") found.push({ text, charCount: text.length });
  });
  return found;
}
