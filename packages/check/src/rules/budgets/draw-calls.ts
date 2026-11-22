// Rule: budgets/draw-calls
// Pass: draw call count is under budget
import { couldNotRun, NOT_READY, stats, step, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const BUDGET_DESKTOP = 200;
const BUDGET_PHONE = 80;

const rule: Rule = {
  id: "budgets/draw-calls",
  group: "budgets",
  severity: "error",
  description: "Draw call count must stay under budget.",
  async run(ctx) {
    const budget = ctx.viewport.isMobile ? BUDGET_PHONE : BUDGET_DESKTOP;

    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    await step(ctx.page, 1);
    const drawCalls = (await stats(ctx.page))?.drawCalls;
    if (drawCalls === undefined)
      return [couldNotRun(ctx, this.id, "the bridge reports no scene stats")];

    if (drawCalls > budget) {
      return [
        {
          rule: "budgets/draw-calls",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Draw calls ${drawCalls} exceeds budget of ${budget} on ${ctx.viewport.name}.`,
          fix: "Merge geometries, use instanced meshes, or reduce the number of unique materials.",
          evidence: { data: { drawCalls, budget } },
        },
      ];
    }
    return [];
  },
};

export default rule;
