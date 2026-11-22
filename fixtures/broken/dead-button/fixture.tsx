import type { Fixture } from "../../host/src/fixture.js";
import { good, overlay } from "../../host/src/good.js";

export const fixture: Fixture = {
  ...good,
  overlay: (
    <>
      {overlay}
      <nav aria-label="Actions" style={{ position: "fixed", bottom: 0, left: 0, zIndex: 10 }}>
        <button type="button" style={{ padding: "8px 16px" }}>
          Book a call
        </button>
      </nav>
    </>
  ),
};
