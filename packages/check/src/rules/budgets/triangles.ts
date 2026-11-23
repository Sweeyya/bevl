// Rule: budgets/triangles
// Pass: triangle count is under budget at every section
import { couldNotRun, NOT_READY, stats, step, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const BUDGET_DESKTOP = 500_000;
const BUDGET_PHONE = 150_000;
const WARN_FRACTION = 0.9;

const rule: Rule = {
  id: "budgets/triangles",
  group: "budgets",
  severity: "error",
  description: "Triangle count must stay under budget.",
  async run(ctx) {
    const budget = ctx.viewport.isMobile ? BUDGET_PHONE : BUDGET_DESKTOP;

    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    await step(ctx.page, 1);
    const triangles = (await stats(ctx.page))?.triangles;
    if (triangles === undefined)
      return [couldNotRun(ctx, this.id, "the bridge reports no scene stats")];

    if (triangles > budget) {
      return [
        {
          rule: "budgets/triangles",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Triangle count ${triangles.toLocaleString()} exceeds budget of ${budget.toLocaleString()} on ${ctx.viewport.name}.`,
          fix: `Reduce geometry complexity. Use lower-poly models, merge static meshes, or use instancing. Run \`toros optimize\` on your GLB files.`,
          evidence: { data: { triangles, budget } },
        },
      ];
    }

    if (triangles > budget * WARN_FRACTION) {
      return [
        {
          rule: "budgets/triangles",
          severity: "warn",
          viewport: ctx.viewport.name,
          message: `Triangle count ${triangles.toLocaleString()} is above 90% of the ${budget.toLocaleString()} budget on ${ctx.viewport.name}.`,
          fix: `Consider reducing geometry complexity before adding more content.`,
          evidence: { data: { triangles, budget } },
        },
      ];
    }

    return [];
  },
};

export default rule;
