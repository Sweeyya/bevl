import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

export const fixture: Fixture = { ...good, fallback: <p /> };
