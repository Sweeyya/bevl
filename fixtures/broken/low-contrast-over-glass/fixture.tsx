import type { Fixture } from "../../host/src/fixture.js";
import { good, overlay } from "../../host/src/good.js";

export const fixture: Fixture = {
  ...good,
  overlay: (
    <>
      {overlay}
      <div
        style={{
          position: "fixed",
          top: 120,
          left: 24,
          zIndex: 10,
          padding: 24,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <h2 style={{ margin: 0, color: "#ffffff", fontSize: 32 }}>Pricing</h2>
        <p style={{ margin: 0, color: "#f2f2f2", fontSize: 16 }}>Plans for every team.</p>
      </div>
    </>
  ),
};
