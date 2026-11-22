export type Lab = [number, number, number];

export function hexToLab(hex: string): Lab | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1], 16);
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((n >> 16) & 255);
  const g = lin((n >> 8) & 255);
  const b = lin(n & 255);
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const fy = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const fz = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 distance between two hex colors; Infinity when either is not a hex color. */
export function deltaE(a: string, b: string): number {
  const la = hexToLab(a);
  const lb = hexToLab(b);
  if (!la || !lb) return Number.POSITIVE_INFINITY;
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

/** Near-black, near-white and near-gray colors are shared by every brand. */
export function isNeutral(hex: string): boolean {
  const lab = hexToLab(hex);
  if (!lab) return false;
  const chroma = Math.hypot(lab[1], lab[2]);
  return chroma < 8 || lab[0] < 12 || lab[0] > 94;
}
