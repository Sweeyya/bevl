import type { Choreography, Track } from "./types.js";

export const SECTION_SPACING = 10;
const CAMERA_OFFSET_Z = 6;

export function beatAt(index: number, count: number): number {
  return count <= 1 ? 0 : index / (count - 1);
}

/** Camera flies forward along -Z, one beat per section, sections 10 units apart. */
export function defaultChoreography(sectionIds: string[]): Choreography {
  const n = sectionIds.length;
  const beats = sectionIds.map((id, i) => ({ id, at: beatAt(i, n) }));
  const track = (prop: string, offset: number): Track => ({
    target: "camera",
    prop,
    keys: beats.map((b, i) => ({
      at: b.at,
      value: [0, 0, -SECTION_SPACING * i + offset],
      ease: "linear",
    })),
  });
  return {
    version: 1,
    beats,
    camera: { position: [0, 0, CAMERA_OFFSET_Z], lookAt: [0, 0, 0], fov: 60 },
    tracks: n > 0 ? [track("position", CAMERA_OFFSET_Z), track("lookAt", 0)] : [],
  };
}
