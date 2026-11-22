export type Rgb = [number, number, number];

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on the background. */
export function suggestedColor(background: Rgb): "#000000" | "#ffffff" {
  return contrastRatio([0, 0, 0], background) >= contrastRatio([255, 255, 255], background)
    ? "#000000"
    : "#ffffff";
}

/** Large text (24 px, or 18.66 px bold) needs 3:1, everything else 4.5:1. */
export function requiredRatio(fontSizePx: number, fontWeight: number): number {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
}
