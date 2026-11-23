import { registerBehavior } from "@bevl/core";
import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

const offset = { x: 0, z: 0 };
const KEYS: Record<string, [number, number]> = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };

window.addEventListener("keydown", (e) => {
  const move = KEYS[e.key];
  if (!move) return;
  offset.x += move[0] * 0.5;
  offset.z += move[1] * 0.5;
});

registerBehavior("roam", (_progress, ctx) => {
  const camera = ctx.camera as { position: { x: number; z: number } };
  camera.position.x += offset.x;
  camera.position.z += offset.z;
});

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ behaviors: ["roam"] }),
};
