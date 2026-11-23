import type { Fixture } from "../../host/src/fixture.js";
import { good, overlay } from "../../host/src/good.js";

export const fixture: Fixture = {
  ...good,
  overlay: (
    <>
      {overlay}
      <a
        href="#contact"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 10,
          padding: "12px 24px",
          borderRadius: 999,
          background: "#ffffff",
          color: "#000000",
        }}
      >
        Get started
      </a>
    </>
  ),
};
