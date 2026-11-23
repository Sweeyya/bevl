import { registerBehavior } from "@toros/core";
import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

registerBehavior("jitter", (_progress, ctx) => {
  const camera = ctx.camera as { position: { y: number } };
  camera.position.y += Math.random() * 0.01;
});

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ behaviors: ["jitter"] }),
};
