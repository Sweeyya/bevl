import { registerBehavior } from "@doodley/core";
import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

registerBehavior("teleport", (progress, ctx) => {
  const camera = ctx.camera as { position: { x: number } };
  camera.position.x = progress > 0.5 ? 50 : 0;
});

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ behaviors: ["teleport"] }),
};
