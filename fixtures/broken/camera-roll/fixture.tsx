import { registerBehavior } from "@bevl/core";
import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

registerBehavior("tilt", (_progress, ctx) => {
  const camera = ctx.camera as { rotation: { z: number } };
  camera.rotation.z = 0.2;
});

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ behaviors: ["tilt"] }),
};
