import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ reducedMotion: { mode: "none" } }),
};
