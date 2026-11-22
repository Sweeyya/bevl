import { insideRig, type Recipe } from "./shared.js";

const RADIUS = 8;
const PITCH_RANGE = 30;

export const sphereOfScreens: Recipe = {
  name: "sphere-of-screens",
  description:
    "You stand inside a sphere. Screens line its inner surface in a gentle spiral and the camera turns on the spot to face each one.",
  whenToUse: "Immersive showcases and experiences where the viewer should feel surrounded.",
  feel: "Looking around a planetarium dome.",
  create(ids) {
    const n = ids.length;
    const views = ids.map((_, i): [number, number] => [
      (360 * i) / n,
      n > 1 ? -PITCH_RANGE + (2 * PITCH_RANGE * i) / (n - 1) : 0,
    ]);
    return { version: 1, ...insideRig(ids, views, RADIUS) };
  },
};
