import { beatsFor, FOV, type Recipe, trackFor, vec } from "./shared.js";

const HERO = "product";
const HERO_CENTER: [number, number, number] = [0, 0.3, 0];
const CAMERA_GAP = 3.5;
const VIEW_OFFSET = 0.5;
const HEIGHT_RANGE = 1.2;

export const orbitProduct: Recipe = {
  name: "orbit-product",
  description: `One hero object named "${HERO}" stays at the center. The camera orbits it on a smooth curve, rising and dipping, while each section's caption screen waits on a small ring around it.`,
  whenToUse: "A single product or mascot that deserves to be seen from every side.",
  feel: "Slow and close, like walking around a sculpture.",
  create(ids) {
    const n = ids.length;
    const radius = Math.max(2.5, 0.35 * n);
    const angle = (index: number): number => (2 * Math.PI * index) / Math.max(n, 1);
    const height = (index: number): number =>
      n > 1 ? HEIGHT_RANGE * Math.sin((Math.PI * index) / (n - 1)) : 0;
    const orbit = (index: number) => {
      const a = angle(index) + VIEW_OFFSET;
      const r = radius + CAMERA_GAP;
      return vec(Math.sin(a) * r, 0.5 + height(index), Math.cos(a) * r);
    };
    return {
      version: 1,
      beats: beatsFor(ids),
      camera: { position: orbit(0), lookAt: HERO_CENTER, fov: FOV },
      layouts: { sections: { arrange: "ring", radius, facing: "outward" } },
      tracks: [
        ...trackFor("position", n, orbit, { path: "curve", sub: 4 }),
        ...trackFor("lookAt", n, () => HERO_CENTER, { sub: 1 }),
      ],
    };
  },
};
