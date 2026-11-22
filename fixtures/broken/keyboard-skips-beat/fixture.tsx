import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

window.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "ArrowDown") e.stopPropagation();
  },
  true,
);

export const fixture: Fixture = { ...good };
