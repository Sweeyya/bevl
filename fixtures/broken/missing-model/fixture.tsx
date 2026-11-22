import type { Fixture } from "../../host/src/fixture.js";
import { good } from "../../host/src/good.js";

fetch("/models/missing.glb", { headers: { Accept: "model/gltf-binary" } }).catch(() => undefined);

export const fixture: Fixture = good;
