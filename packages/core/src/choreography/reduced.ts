import { sectionVisibility } from "../html/visibility.js";
import { cameraFrameAt } from "./scene.js";
import type { Choreography } from "./types.js";

/** True when the camera and objects should keep their full motion under reduced motion. */
export function keepsFullMotion(choreo: Choreography): boolean {
  return choreo.reducedMotion?.mode === "none";
}

/**
 * The choreography to run while reduced motion is on: the camera stays at its start pose
 * (plus any camera tracks the author listed), and only the author's extra tracks and
 * safe behaviors run. Layouts stay because they place objects and do not move them.
 */
export function reducedChoreography(choreo: Choreography): Choreography {
  const { position, lookAt, fov } = cameraFrameAt(choreo, 0);
  const { reducedMotion, ...rest } = choreo;
  return {
    ...rest,
    camera: { position, lookAt, fov },
    tracks: reducedMotion?.tracks ?? [],
    behaviors: reducedMotion?.behaviors ?? [],
  };
}

/** How much each beat's 3D group is shown at `progress`, the same weights the HTML layer fades with. */
export function fadeWeights(progress: number, beats: number[]): number[] {
  return beats.map((_, i) => sectionVisibility(progress, beats, i));
}

/** Material opacity for a fade weight. Fully shown restores the original. */
export function fadedOpacity(original: number, weight: number): number {
  return original * Math.min(1, Math.max(0, weight));
}
