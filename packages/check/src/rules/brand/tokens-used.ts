// Rule: brand/tokens-used
// Pass: the brand's primary, secondary and accent colors each appear in a material
//       (within ΔE 10) or in a computed CSS color of the page. Skipped with no brand.
import type { Rule } from "../../rule.js";
import { deltaE } from "./color.js";

const MAX_DELTA_E = 10;
const ROLES = ["primary", "secondary", "accent"] as const;

interface Bridge {
  brand(): { colors: Record<string, unknown> } | null;
  materials(): { colors: string[] }[];
}

const rule: Rule = {
  id: "brand/tokens-used",
  group: "brand",
  severity: "warn",
  description: "The brand primary, secondary and accent colors must each be used somewhere.",
  async run(ctx) {
    const data = await ctx.page
      .evaluate(() => {
        const bridge = (window as unknown as { __toros?: Bridge }).__toros;
        const brand = bridge?.brand();
        if (!brand || !bridge) return null;
        const hex = (css: string): string | null => {
          const m = css.match(/[\d.]+/g)?.map(Number);
          if (!m || m.length < 3 || (m[3] ?? 1) === 0) return null;
          return `#${m
            .slice(0, 3)
            .map((v) => Math.round(v).toString(16).padStart(2, "0"))
            .join("")}`;
        };
        const css = new Set<string>();
        for (const el of document.querySelectorAll("*")) {
          const s = getComputedStyle(el);
          for (const value of [s.color, s.backgroundColor, s.borderTopColor]) {
            const h = hex(value);
            if (h) css.add(h);
          }
        }
        return {
          colors: brand.colors,
          used: [...bridge.materials().flatMap((m) => m.colors), ...css],
        };
      })
      .catch(() => null);
    if (!data) return [];

    const unused = ROLES.flatMap((role) => {
      const color = data.colors[role];
      if (typeof color !== "string") return [];
      return data.used.some((u) => deltaE(u, color) <= MAX_DELTA_E) ? [] : [`${role} ${color}`];
    });
    if (unused.length === 0) return [];
    return [
      {
        rule: "brand/tokens-used",
        severity: "warn",
        viewport: ctx.viewport.name,
        message: `Brand colors never used in a material or in the page: ${unused.join(", ")}.`,
        fix: 'Use them: <BrandMaterial role="primary|secondary|accent" /> on a visible object, or use the color in the HTML layer. Or remove the color from src/brand.tokens.json.',
      },
    ];
  },
};

export default rule;
