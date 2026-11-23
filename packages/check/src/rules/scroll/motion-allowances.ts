// Rule: scroll/motion-allowances
// Info only: lists every opt-out from the gentle-motion rules in the choreography
import { choreography, couldNotRun, NOT_READY, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const NAMES = ["roll", "spin", "fastMoves", "reducedMotion"] as const;

const rule: Rule = {
  id: "scroll/motion-allowances",
  group: "scroll",
  severity: "info",
  description:
    'Reports each allow.* opt-out and reducedMotion.mode "none". Never lowers the score.',
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const { allow, reducedMotion } = await choreography(ctx.page);
    const keepsMotion = reducedMotion?.mode === "none";
    const found = [
      ...NAMES.filter((n) => allow?.[n] === true).map((n) => ({
        message: `allow.${n} is true`,
        fix: `remove allow.${n} unless this motion is intended. The matching check is skipped while it is set.`,
        allowance: n,
      })),
      ...(keepsMotion
        ? [
            {
              message: 'reducedMotion.mode is "none"',
              fix: 'remove reducedMotion.mode "none" so reduced-motion users get the soft-fade default. Set allow.reducedMotion to keep full motion on purpose.',
              allowance: "reducedMotion.mode",
            },
          ]
        : []),
    ];
    return found.map((f) => ({
      rule: "scroll/motion-allowances",
      severity: "info" as const,
      viewport: ctx.viewport.name,
      message: `Choreography opts out of a gentle-motion rule: ${f.message} on ${ctx.viewport.name}.`,
      fix: `Fix: ${f.fix}`,
      evidence: { data: { allowance: f.allowance } },
    }));
  },
};

export default rule;
