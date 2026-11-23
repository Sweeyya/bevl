// Rule: budgets/texture-mb
// Pass: estimated texture memory is under budget
import { waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const BUDGET_DESKTOP_MB = 64;
const BUDGET_PHONE_MB = 24;

const rule: Rule = {
  id: "budgets/texture-mb",
  group: "budgets",
  severity: "error",
  description: "Texture memory must stay under budget.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [];
    const budget = ctx.viewport.isMobile ? BUDGET_PHONE_MB : BUDGET_DESKTOP_MB;
    const mb = await ctx.page.evaluate(
      () =>
        (
          window as unknown as { __bevl?: { stats(): { textureMbEstimate: number } } }
        ).__bevl?.stats().textureMbEstimate ?? 0,
    );
    if (mb <= budget) return [];
    return [
      {
        rule: "budgets/texture-mb",
        severity: "error",
        viewport: ctx.viewport.name,
        message: `Textures use about ${mb.toFixed(0)} MB, over the ${budget} MB budget on ${ctx.viewport.name}.`,
        fix: "Fix: resize textures to the size they appear on screen (2048 px or less), use KTX2 or WebP compression, and drop maps that are not visible.",
        evidence: { data: { textureMb: mb, budget } },
      },
    ];
  },
};

export default rule;
