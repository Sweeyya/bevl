import { DoodleyContext, registerBehavior } from "@doodley/core";
import { useContext } from "react";
import type { Fixture } from "../../host/src/fixture.js";
import { config, good, withChoreography } from "../../host/src/good.js";

const state = { jump: false };

registerBehavior("link-teleport", (_progress, ctx) => {
  const camera = ctx.camera as { position: { x: number } };
  if (state.jump) camera.position.x += 50;
});

function JumpingNav(): JSX.Element {
  const ctx = useContext(DoodleyContext);
  return (
    <nav aria-label="Site sections">
      <ul style={{ position: "fixed", top: 0, left: 0, zIndex: 10, display: "flex", gap: 8 }}>
        {config.sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#section-${s.id}`}
              style={{ color: "#fff", padding: "4px 12px" }}
              onClick={(e) => {
                e.preventDefault();
                state.jump = true;
                ctx?.goToBeat(i, true);
              }}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const fixture: Fixture = {
  ...good,
  config: withChoreography({ behaviors: ["link-teleport"] }),
  overlay: <JumpingNav />,
};
