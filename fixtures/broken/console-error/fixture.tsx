import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

function Scene(): JSX.Element | null {
  console.error("fixture: deliberate console error");
  const Base = good.Scene;
  return Base ? <Base /> : null;
}

export const fixture: Fixture = { ...good, Scene };
