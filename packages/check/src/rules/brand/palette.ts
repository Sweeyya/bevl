// Rule: brand/palette
// Pass: every non-neutral material color is within MAX_DELTA_E of a brand palette color.
// Skipped when the site passes no brand tokens.
import type { Rule } from "../../rule.js";
import { deltaE, isNeutral } from "./color.js";

const MAX_DELTA_E = 10;

interface BrandBridge {
  brand(): { colors: Record<string, unknown> } | null;
  materials(): { name: string; colors: string[] }[];
}

const rule: Rule = {
  id: "brand/palette",
  group: "brand",
  severity: "warn",
  description: "Every non-neutral material color must be close to a brand token color.",
  async run(ctx) {
    const data = await ctx.page
      .evaluate(() => {
        const bridge = (window as unknown as { __bevl?: BrandBridge }).__bevl;
        const brand = bridge?.brand();
        return brand && bridge ? { colors: brand.colors, materials: bridge.materials() } : null;
      })
      .catch(() => null);
    if (!data) return [];

    const palette = Object.entries(data.colors)
      .flatMap(([key, value]) =>
        key === "extra" && value && typeof value === "object"
          ? Object.values(value as Record<string, unknown>)
          : [value],
      )
      .filter((v): v is string => typeof v === "string");

    const off = new Set<string>();
    for (const material of data.materials) {
      for (const color of material.colors) {
        if (isNeutral(color)) continue;
        if (!palette.some((p) => deltaE(color, p) <= MAX_DELTA_E)) {
          off.add(`${material.name} ${color}`);
        }
      }
    }
    if (off.size === 0) return [];
    return [
      {
        rule: "brand/palette",
        severity: "warn",
        viewport: ctx.viewport.name,
        message: `Material colors outside the brand palette: ${[...off].join(", ")}.`,
        fix: 'Use <BrandMaterial role="primary|secondary|surface|accent" /> or set the material color to a color from src/brand.tokens.json.',
      },
    ];
  },
};

export default rule;
