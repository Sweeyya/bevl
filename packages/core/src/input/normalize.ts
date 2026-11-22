export interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey?: boolean;
}

export const LINE_HEIGHT_PX = 100 / 6;

/** Wheel deltas in pixels. Ctrl+wheel is pinch zoom and returns zero. */
export function normalizeWheel(e: WheelLike, viewportHeight: number): { x: number; y: number } {
  if (e.ctrlKey) return { x: 0, y: 0 };
  const scale = e.deltaMode === 1 ? LINE_HEIGHT_PX : e.deltaMode === 2 ? viewportHeight : 1;
  return { x: e.deltaX * scale, y: e.deltaY * scale };
}

export function pxToProgress(px: number, scrollLengthPx: number): number {
  return scrollLengthPx > 0 ? px / scrollLengthPx : 0;
}
