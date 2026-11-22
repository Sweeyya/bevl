import { beatsFor, FOV, type Recipe, trackFor, vec } from "./shared.js";

const CAMERA_GAP = 3.5;

export const carousel: Recipe = {
  name: "carousel",
  description:
    "Screens stand in a ring facing outward. The camera circles the outside and looks at each one.",
  whenToUse: "A set of equal items such as products, team members or services.",
  feel: "Walking around a display, one stop at a time.",
  create(ids) {
    const n = ids.length;
    const radius = Math.max(3, 0.45 * n);
    const angle = (index: number): number => (2 * Math.PI * index) / Math.max(n, 1);
    const onRing = (index: number, r: number) =>
      vec(Math.sin(angle(index)) * r, 0, Math.cos(angle(index)) * r);
    return {
      version: 1,
      beats: beatsFor(ids),
      camera: {
        position: onRing(0, radius + CAMERA_GAP),
        lookAt: onRing(0, radius),
        fov: FOV,
      },
      layouts: { sections: { arrange: "ring", radius, facing: "outward" } },
      tracks: [
        ...trackFor("position", n, (i) => onRing(i, radius + CAMERA_GAP)),
        ...trackFor("lookAt", n, (i) => onRing(i, radius)),
      ],
    };
  },
};
