import { SECTION_SPACING } from "./default.js";
import { evaluateTrack } from "./evaluate.js";
import { layoutPositions, type Placement } from "./layout.js";
import type { Choreography, Vec3Tuple } from "./types.js";

export const SECTIONS_LAYOUT = "sections";
export const DEFAULT_FOV = 60;

export interface CameraFrame {
  position: Vec3Tuple;
  lookAt: Vec3Tuple;
  fov: number;
}

/** Where each Section group sits, aligned with sectionIds. */
export function sectionPositions(choreo: Choreography, sectionIds: string[]): Placement[] {
  const spec = choreo.layouts?.[SECTIONS_LAYOUT];
  if (spec) return layoutPositions(spec, sectionIds.length);
  return sectionIds.map((_, i) => ({ position: [0, 0, -SECTION_SPACING * i] }));
}

export function cameraFrameAt(choreo: Choreography, progress: number): CameraFrame {
  let position = choreo.camera.position;
  let lookAt = choreo.camera.lookAt;
  let fov = choreo.camera.fov ?? DEFAULT_FOV;
  for (const track of choreo.tracks ?? []) {
    if (track.target !== "camera") continue;
    const value = evaluateTrack(track, progress);
    if (track.prop === "position" && Array.isArray(value)) position = value;
    else if (track.prop === "lookAt" && Array.isArray(value)) lookAt = value;
    else if (track.prop === "fov" && typeof value === "number") fov = value;
  }
  return { position, lookAt: lookAt ?? [position[0], position[1], position[2] - 1], fov };
}
