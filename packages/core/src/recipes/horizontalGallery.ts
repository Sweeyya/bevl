import { beatsFor, FOV, type Recipe, trackFor, vec } from "./shared.js";

const MAX_SPACING = 8;
const TOTAL_TRAVEL = 45;
const CAMERA_DISTANCE = 6;

export const horizontalGallery: Recipe = {
  name: "horizontal-gallery",
  description:
    "Screens sit in a row along X and the camera pans sideways. Swiping left and right works on touch.",
  whenToUse: "Portfolios, product lineups, timelines, anything that reads left to right.",
  feel: "Like sliding along a gallery wall; natural on phones.",
  create(ids) {
    const n = ids.length;
    const spacing = n > 1 ? Math.min(MAX_SPACING, TOTAL_TRAVEL / (n - 1)) : MAX_SPACING;
    const x = (index: number): number => spacing * index;
    return {
      version: 1,
      beats: beatsFor(ids),
      camera: { position: [0, 0, CAMERA_DISTANCE], lookAt: [0, 0, 0], fov: FOV },
      layouts: { sections: { arrange: "line", spacing, direction: [1, 0, 0] } },
      tracks: [
        ...trackFor("position", n, (i) => vec(x(i), 0, CAMERA_DISTANCE), { sub: 1 }),
        ...trackFor("lookAt", n, (i) => vec(x(i), 0, 0), { sub: 1 }),
      ],
      input: { fine: ["scroll"], coarse: ["scroll", "swipe-x"] },
    };
  },
};
