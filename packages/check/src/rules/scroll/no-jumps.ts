// Rule: scroll/no-jumps
// Pass: camera never moves more than maxStepMeters in one scroll step
import type { Rule } from "../../rule.js";

const MAX_STEP_METERS = 1.5;
const SCROLL_STEPS = 40;

const rule: Rule = {
  id: "scroll/no-jumps",
  group: "scroll",
  severity: "error",
  description: "Camera must not teleport — max move per scroll step is 1.5m.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(
        async ({ steps, maxStep }) => {
          const bridge = (
            window as unknown as {
              __doodley?: {
                ready: Promise<void>;
                step(ms: number): unknown;
                camera(): { position: { x: number; y: number; z: number } };
              };
            }
          ).__doodley;
          if (!bridge) return null;

          await bridge.ready;

          const scroller = (document.querySelector<HTMLElement>("[data-doodley-scroller]") ??
            document.scrollingElement ??
            document.documentElement) as HTMLElement;

          const max = scroller.scrollHeight - scroller.clientHeight;
          if (max <= 0) return null;

          let prev = bridge.camera().position;
          let worstJump = 0;

          for (let i = 1; i <= steps; i++) {
            scroller.scrollTop = (i / steps) * max;
            bridge.step(1000 / 60);
            const cur = bridge.camera().position;
            const dx = cur.x - prev.x;
            const dy = cur.y - prev.y;
            const dz = cur.z - prev.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > worstJump) worstJump = dist;
            prev = cur;
          }

          return { worstJump, exceeded: worstJump > maxStep };
        },
        { steps: SCROLL_STEPS, maxStep: MAX_STEP_METERS },
      )
      .catch(() => null);

    if (result?.exceeded) {
      return [
        {
          rule: "scroll/no-jumps",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Camera jumped ${result.worstJump.toFixed(2)}m in one step on ${ctx.viewport.name} (max ${MAX_STEP_METERS}m).`,
          fix: "Check your camera path math. Ensure clampStep is applied every frame and your section spacing is not too large relative to scroll speed.",
          evidence: { data: { worstJump: result.worstJump, maxStep: MAX_STEP_METERS } },
        },
      ];
    }
    return [];
  },
};

export default rule;
