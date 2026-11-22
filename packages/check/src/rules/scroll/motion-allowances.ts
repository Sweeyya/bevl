// Rule: scroll/motion-allowances
// Info only: lists every opt-out from the gentle-motion rules in the choreography
import { choreography, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const NAMES = ["roll", "spin", "fastMoves"] as const;

const rule: Rule = {
  id: "scroll/motion-allowances",
  group: "scroll",
  severity: "info",
  description:
    "Reports each allow.roll, allow.spin and allow.fastMoves opt-out. Never lowers the score.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [];
    const { allow } = (await choreography(ctx.page)) as {
      allow?: Partial<Record<(typeof NAMES)[number], boolean>>;
    };
    return NAMES.filter((n) => allow?.[n] === true).map((n) => ({
      rule: "scroll/motion-allowances",
      severity: "info" as const,
      viewport: ctx.viewport.name,
      message: `Choreography opts out of a gentle-motion rule: allow.${n} is true on ${ctx.viewport.name}.`,
      fix: `Fix: remove allow.${n} unless this motion is intended. The matching check is skipped while it is set.`,
      evidence: { data: { allowance: n } },
    }));
  },
};

export default rule;
