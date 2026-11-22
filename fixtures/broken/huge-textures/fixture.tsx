import { DataTexture } from "three";
import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

const SIZE = 4096;
const texture = new DataTexture(new Uint8Array(SIZE * SIZE * 4), SIZE, SIZE);
texture.generateMipmaps = true;
texture.needsUpdate = true;

function HugeTexture(): JSX.Element {
  return (
    <>
      {good.Scene ? <good.Scene /> : null}
      <mesh position={[0, 0, -20]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </>
  );
}

export const fixture: Fixture = { ...good, Scene: HugeTexture };
