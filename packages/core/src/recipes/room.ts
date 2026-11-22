import { insideRig, type Recipe } from "./shared.js";

const RADIUS = 6;
const MAX_PITCH = 55;
const PITCH_SPEED = 240;

export const room: Recipe = {
  name: "room",
  description:
    "The camera stands in the middle of a room and turns to face each wall, then the ceiling and the floor.",
  whenToUse: "Sites with a few distinct topics that work like rooms or stations.",
  feel: "Standing in a small room and looking around.",
  create(ids) {
    const n = ids.length;
    const extras = n > 4 ? Math.min(2, n - 4) : 0;
    const walls = n - extras;
    const pitch = Math.min(MAX_PITCH, PITCH_SPEED / Math.max(n - 1, 1));
    const wallYaw = (k: number): number => (360 * k) / walls;
    const views: Array<[number, number]> = [];
    const split = n > 6 ? Math.ceil(walls / 2) : walls;
    for (let k = 0; k < walls; k++) {
      if (k === split && extras > 0) views.push([wallYaw(k - 1), pitch]);
      views.push([wallYaw(k), 0]);
    }
    if (split === walls && extras > 0) views.push([wallYaw(walls - 1), pitch]);
    if (extras === 2) views.push([wallYaw(walls - 1), -pitch]);
    return { version: 1, ...insideRig(ids, views, RADIUS) };
  },
};
