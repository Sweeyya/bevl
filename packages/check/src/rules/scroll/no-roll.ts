// Rule: scroll/no-roll
// Pass: camera up direction stays within 2° of world up throughout scroll
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

const MAX_ROLL_DEG = 2;
const SCROLL_STEPS = 40;

const rule: Rule = {
  id: "scroll/no-roll",
  group: "scroll",
  severity: "error",
  description: `Camera up direction must stay within ${MAX_ROLL_DEG}° of world up.`,
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    if ((await choreography(ctx.page)).allow?.roll) return [];
    const poses = await sweep(ctx.page, SCROLL_STEPS).catch(() => null);
    if (!poses) return [couldNotRun(ctx, this.id, NO_SCROLL)];

    let worstRoll = 0;
    for (const { quaternion: q } of poses) {
      const sinRoll = 2 * (q.w * q.z + q.x * q.y);
      const cosRoll = 1 - 2 * (q.y * q.y + q.z * q.z);
      worstRoll = Math.max(worstRoll, Math.abs(Math.atan2(sinRoll, cosRoll) * (180 / Math.PI)));
    }
    if (worstRoll <= MAX_ROLL_DEG) return [];
    return [
      finding(
        ctx,
        this.id,
        "error",
        `Camera rolled ${worstRoll.toFixed(1)}° on ${ctx.viewport.name} (max ${MAX_ROLL_DEG}°).`,
        "Ensure enforceNoRoll is applied every frame in ScrollCamera. Check that your camera path quaternions have no roll component.",
        { worstRoll, maxRoll: MAX_ROLL_DEG },
      ),
    ];
  },
};

export default rule;
