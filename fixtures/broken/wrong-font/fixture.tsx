import { brand } from "../../host/src/brand.js";
import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

const overlay = (
  <>
    {good.overlay}
    <h2
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 2,
        fontFamily: "'Courier New', monospace",
      }}
    >
      Toros fixture
    </h2>
  </>
);

export const fixture: Fixture = { ...good, brand, overlay };
