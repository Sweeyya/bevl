import { Matrix4, Quaternion, Vector3 } from "three";
import type { Pose } from "../contract.js";
import { cameraFrameAt } from "./scene.js";
import type { Choreography } from "./types.js";

const matrix = new Matrix4();
const eye = new Vector3();
const target = new Vector3();
const up = new Vector3(0, 1, 0);
const quat = new Quaternion();

/** Camera pose (position + lookAt rotation) and fov at progress. */
export function cameraPoseAt(choreo: Choreography, progress: number): Pose & { fov: number } {
  const frame = cameraFrameAt(choreo, progress);
  eye.fromArray(frame.position);
  target.fromArray(frame.lookAt);
  quat.setFromRotationMatrix(matrix.lookAt(eye, target, up));
  return {
    position: { x: eye.x, y: eye.y, z: eye.z },
    quaternion: { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
    fov: frame.fov,
  };
}
