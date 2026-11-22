import type { Fixture } from "../../host/src/fixture.js";
import { good, withChoreography } from "../../host/src/good.js";

export const fixture: Fixture = {
  ...good,
  config: withChoreography({
    input: { fine: ["wheel"], wheelMultiplier: 0.001 },
    snap: { mode: "strong", commit: 1 },
  }),
};
