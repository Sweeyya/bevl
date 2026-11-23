/** How far a section's HTML is shown at `progress`: 1 near its beat, fading to 0 over half the gap to the nearest neighbour. */
export function sectionVisibility(progress: number, beats: number[], index: number): number {
  const at = beats[index];
  if (at === undefined) return 0;
  let gap = Number.POSITIVE_INFINITY;
  for (const [i, other] of beats.entries()) {
    if (i !== index) gap = Math.min(gap, Math.abs(other - at));
  }
  const span = Number.isFinite(gap) && gap > 0 ? gap : 1;
  const v = (span - Math.abs(progress - at)) / (span / 2);
  return Math.min(1, Math.max(0, v));
}

/** Index of the beat closest to `progress`; ties go to the earlier beat. */
export function activeSection(progress: number, beats: number[]): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [i, at] of beats.entries()) {
    const d = Math.abs(progress - at);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

const SHIFT_PX = 24;

export interface SectionStyle {
  opacity: number;
  translateY: number;
  active: boolean;
}

/** Style for one section; reduced motion drops the shift and keeps only the fade. */
export function sectionStyle(
  progress: number,
  beats: number[],
  index: number,
  reducedMotion: boolean,
): SectionStyle {
  const v = sectionVisibility(progress, beats, index);
  const active = activeSection(progress, beats) === index;
  if (reducedMotion) return { opacity: v, translateY: 0, active };
  return { opacity: v, translateY: (1 - v) * SHIFT_PX, active };
}
