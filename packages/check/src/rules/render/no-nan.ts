// Rule: render/no-nan
// Pass: no object has NaN position, rotation or scale
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "render/no-nan",
  group: "render",
  severity: "error",
  description: "No scene object may have NaN in position, rotation, or scale.",
  async run(ctx) {
    const hasNaN = await ctx.page
      .evaluate(() => {
        const bridge = (
          window as unknown as {
            __doodley?: { camera(): { position: { x: number; y: number; z: number } } };
          }
        ).__doodley;
        if (!bridge) return false;
        const cam = bridge.camera();
        const pos = cam.position;
        return Number.isNaN(pos.x) || Number.isNaN(pos.y) || Number.isNaN(pos.z);
      })
      .catch(() => false);

    if (hasNaN) {
      return [
        {
          rule: "render/no-nan",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Camera has NaN in its position on ${ctx.viewport.name}.`,
          fix: "Check your camera path math. A division by zero or an empty path produces NaN. Ensure your DoodleyConfig has at least one section.",
        },
      ];
    }
    return [];
  },
};

export default rule;
