import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

const COPY =
  "Toros turns any brand into a fast, accessible 3D website, and every site it makes is tested.";

function CanvasCopy(): JSX.Element {
  return (
    <>
      {good.Scene ? <good.Scene /> : null}
      <mesh userData={{ torosText: COPY }}>
        <planeGeometry args={[4, 1]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
    </>
  );
}

export const fixture: Fixture = { ...good, Scene: CanvasCopy };
