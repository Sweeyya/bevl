// Rule: scroll/no-jumps
// Pass: camera never moves more than maxStepMeters in one scroll step
import {
  choreography,
  couldNotRun,
  finding,
  NO_SCROLL,
  NOT_READY,
  sweep,
  waitReady,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const MAX_STEP_METERS = 1.5;
const SCROLL_STEPS = 40;

const rule: Rule = {
  id: "scroll/no-jumps",
  group: "scroll",
  severity: "error",
  description: "Camera must not teleport — max move per scroll step is 1.5m.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    if ((await choreography(ctx.page)).allow?.fastMoves) return [];
    const poses = await sweep(ctx.page, SCROLL_STEPS).catch(() => null);
    if (!poses) return [couldNotRun(ctx, this.id, NO_SCROLL)];

    let worstJump = 0;
    for (let i = 1; i < poses.length; i++) {
      const a = poses[i - 1]?.position;
      const b = poses[i]?.position;
      if (a && b) worstJump = Math.max(worstJump, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    }
    if (worstJump <= MAX_STEP_METERS) return [];
    return [
      finding(
        ctx,
        this.id,
        "error",
        `Camera jumped ${worstJump.toFixed(2)}m in one step on ${ctx.viewport.name} (max ${MAX_STEP_METERS}m).`,
        "Check your camera path math. Ensure clampStep is applied every frame and your section spacing is not too large relative to scroll speed.",
        { worstJump, maxStep: MAX_STEP_METERS },
      ),
    ];
  },
};

export default rule;
