// Rule: brand/not-default-look
// Pass: the site has brand tokens (not the parser defaults), or at least one material has a real color.
import { couldNotRun, NOT_READY, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";
import { isNeutral } from "./color.js";

const PARSER_DEFAULTS = {
  primary: "#000000",
  secondary: "#333333",
  accent: "#0066ff",
  background: "#ffffff",
  surface: "#f5f5f5",
  text: "#111111",
};

interface Bridge {
  brand(): { colors: Record<string, unknown> } | null;
  materials(): { colors: string[] }[];
}

const rule: Rule = {
  id: "brand/not-default-look",
  group: "brand",
  severity: "warn",
  description: "A site with no brand tokens must not use only grayscale and white materials.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const data = await ctx.page.evaluate(() => {
      const bridge = (window as unknown as { __toros?: Bridge }).__toros;
      return { brand: bridge?.brand() ?? null, materials: bridge?.materials() ?? [] };
    });
    const colors = data.materials.flatMap((m) => m.colors);
    if (colors.length === 0) return [];
    const unbranded =
      data.brand === null ||
      Object.entries(PARSER_DEFAULTS).every(([role, hex]) => data.brand?.colors[role] === hex);
    if (!unbranded || !colors.every(isNeutral)) return [];
    return [
      {
        rule: "brand/not-default-look",
        severity: "warn",
        viewport: ctx.viewport.name,
        message:
          "No brand is applied and every material is gray or white, so the site has no look of its own.",
        fix: "Run `toros taste deal --brief toros.brief.json --apply` to give the site one of Toros's art directions, or apply the brand file with `toros apply-brand`.",
      },
    ];
  },
};

export default rule;
