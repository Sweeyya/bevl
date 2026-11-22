// Rule: scroll/no-spin
// Pass: camera turns less than 15 degrees per scroll step
import { angleDeg, cameraPose, choreography, scrollTo, step, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const MAX_TURN_DEG = 15;
const TOLERANCE_DEG = 0.1;
const SCROLL_STEPS = 40;

const rule: Rule = {
  id: "scroll/no-spin",
  group: "scroll",
  severity: "error",
  description: `Camera must turn less than ${MAX_TURN_DEG}° per scroll step.`,
  async run(ctx) {
    const { page } = ctx;
    if (!(await waitReady(page))) return [];
    if (((await choreography(page)) as { allow?: { spin?: boolean } }).allow?.spin) return [];

    await scrollTo(page, 0);
    await step(page, 1);
    let prev = await cameraPose(page);
    let worst = 0;
    for (let i = 1; i <= SCROLL_STEPS; i++) {
      await scrollTo(page, i / SCROLL_STEPS);
      await step(page, 1);
      const cur = await cameraPose(page);
      worst = Math.max(worst, angleDeg(prev.quaternion, cur.quaternion));
      prev = cur;
    }
    if (worst <= MAX_TURN_DEG + TOLERANCE_DEG) return [];
    return [
      {
        rule: "scroll/no-spin",
        severity: "error",
        viewport: ctx.viewport.name,
        message: `Camera turned ${worst.toFixed(1)}° in one scroll step on ${ctx.viewport.name} (max ${MAX_TURN_DEG}°).`,
        fix: "Fix: remove behaviors or tracks that rotate the camera quickly, spread the turn over more scroll distance, or set allow.spin only if the spin is intended.",
        evidence: { data: { worstTurnDeg: worst, maxTurnDeg: MAX_TURN_DEG } },
      },
    ];
  },
};

export default rule;
