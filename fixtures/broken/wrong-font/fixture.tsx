import { brand } from "../../host/src/brand.js";
import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

const overlay = (
  <>
    {good.overlay}
    <h1
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 2,
        fontFamily: "'Courier New', monospace",
      }}
    >
      Doodley fixture
    </h1>
  </>
);

export const fixture: Fixture = { ...good, brand, overlay };
