import { beatsFor, FOV, type Recipe, trackFor, vec } from "./shared.js";

const MAX_SPACING = 10;
const TOTAL_TRAVEL = 50;
const CAMERA_DISTANCE = 6;

export const flyThrough: Recipe = {
  name: "fly-through",
  description: "The camera flies straight forward through the sections, one screen per section.",
  whenToUse: "Default for most sites: landing pages, portfolios, any story told in order.",
  feel: "Calm and steady, like gliding down a corridor of rooms.",
  create(ids) {
    const n = ids.length;
    const spacing = n > 1 ? Math.min(MAX_SPACING, TOTAL_TRAVEL / (n - 1)) : MAX_SPACING;
    const z = (index: number): number => -spacing * index;
    return {
      version: 1,
      beats: beatsFor(ids),
      camera: { position: [0, 0, CAMERA_DISTANCE], lookAt: [0, 0, 0], fov: FOV },
      layouts: { sections: { arrange: "line", spacing, direction: [0, 0, -1] } },
      tracks: [
        ...trackFor("position", n, (i) => vec(0, 0, z(i) + CAMERA_DISTANCE), { sub: 1 }),
        ...trackFor("lookAt", n, (i) => vec(0, 0, z(i)), { sub: 1 }),
      ],
    };
  },
};
