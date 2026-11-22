// Rule: scroll/no-roll
// Pass: camera up direction stays within 2° of world up throughout scroll
import type { Rule } from "../../rule.js";

const MAX_ROLL_DEG = 2;
const SCROLL_STEPS = 40;

const rule: Rule = {
  id: "scroll/no-roll",
  group: "scroll",
  severity: "error",
  description: `Camera up direction must stay within ${MAX_ROLL_DEG}° of world up.`,
  async run(ctx) {
    const result = await ctx.page
      .evaluate(
        async ({ steps, maxRoll }) => {
          const bridge = (
            window as unknown as {
              __doodley?: {
                ready: Promise<void>;
                step(ms: number): unknown;
                choreography(): { allow?: { roll?: boolean } };
                camera(): { quaternion: { x: number; y: number; z: number; w: number } };
              };
            }
          ).__doodley;
          if (!bridge) return null;

          await bridge.ready;
          if (bridge.choreography().allow?.roll) return null;

          const scroller = (document.querySelector<HTMLElement>("[data-doodley-scroller]") ??
            document.scrollingElement ??
            document.documentElement) as HTMLElement;

          const max = scroller.scrollHeight - scroller.clientHeight;
          if (max <= 0) return null;

          let worstRoll = 0;

          for (let i = 0; i <= steps; i++) {
            scroller.scrollTop = (i / steps) * max;
            await new Promise((r) => requestAnimationFrame(r));
            bridge.step(1000 / 60);
            const q = bridge.camera().quaternion;
            const sinRoll = 2 * (q.w * q.z + q.x * q.y);
            const cosRoll = 1 - 2 * (q.y * q.y + q.z * q.z);
            const rollDeg = Math.abs(Math.atan2(sinRoll, cosRoll) * (180 / Math.PI));
            if (rollDeg > worstRoll) worstRoll = rollDeg;
          }

          return { worstRoll, exceeded: worstRoll > maxRoll };
        },
        { steps: SCROLL_STEPS, maxRoll: MAX_ROLL_DEG },
      )
      .catch(() => null);

    if (result?.exceeded) {
      return [
        {
          rule: "scroll/no-roll",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Camera rolled ${result.worstRoll.toFixed(1)}° on ${ctx.viewport.name} (max ${MAX_ROLL_DEG}°).`,
          fix: "Ensure enforceNoRoll is applied every frame in ScrollCamera. Check that your camera path quaternions have no roll component.",
          evidence: { data: { worstRoll: result.worstRoll, maxRoll: MAX_ROLL_DEG } },
        },
      ];
    }
    return [];
  },
};

export default rule;
