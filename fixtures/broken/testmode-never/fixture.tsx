import type { Fixture } from "../../host/src/fixture.js";
import { config, good } from "../../host/src/good.js";

export const fixture: Fixture = { ...good, config: { ...config, testMode: "never" } };
