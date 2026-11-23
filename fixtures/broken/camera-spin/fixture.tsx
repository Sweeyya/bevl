import { registerBehavior } from "@toros/core";
import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

registerBehavior("spin", (progress, ctx) => {
  const camera = ctx.camera as { rotation: { y: number } };
  camera.rotation.y = 1.2 * Math.sin(progress * 60);
});

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ behaviors: ["spin"] }),
};
