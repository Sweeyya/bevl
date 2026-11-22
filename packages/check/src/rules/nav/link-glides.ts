// Rule: nav/link-glides
// Pass: clicking a nav link glides the camera to that section with no jump over the move limit
import { distance, scrollTo, step, waitReady } from "../../drive.js";
import { listNavControls, NAV_CONTROLS } from "../../nav.js";
import type { Rule } from "../../rule.js";

const MAX_STEP_M = 1.5;
const EPSILON_M = 0.01;
const SETTLE_FRAMES = 30;
const GLIDE_FRAMES = 90;
const ARRIVE_EPSILON = 0.005;

const rule: Rule = {
  id: "nav/link-glides",
  group: "nav",
  severity: "error",
  description: "Clicking a nav link must glide to the section without a camera jump.",
  async run(ctx) {
    const { page, viewport } = ctx;
    if (!(await waitReady(page))) return [];
    const controls = (await listNavControls(page)).filter((c) => c.visible && c.sectionId);
    const anchors = await page.evaluate(
      () =>
        (
          window as unknown as {
            __doodley?: { sections(): Array<{ id: string; anchor: number }> };
          }
        ).__doodley?.sections() ?? [],
    );
    const problems: string[] = [];

    for (const control of controls) {
      const anchor = anchors.find((s) => s.id === control.sectionId)?.anchor ?? 0;
      await scrollTo(page, anchor < 0.5 ? 1 : 0);
      await step(page, SETTLE_FRAMES);
      const clicked = await page
        .locator(NAV_CONTROLS)
        .nth(control.index)
        .click({ timeout: 3000 })
        .then(
          () => true,
          () => false,
        );
      if (!clicked) {
        problems.push(`"${control.text}" could not be clicked`);
        continue;
      }
      const result = await page.evaluate(
        ({ frames }) => {
          const bridge = (
            window as unknown as {
              __doodley: {
                step(ms: number): unknown;
                scroll(): number;
                camera(): { position: { x: number; y: number; z: number } };
              };
            }
          ).__doodley;
          const poses = [bridge.camera().position];
          for (let i = 0; i < frames; i++) {
            bridge.step(1000 / 60);
            poses.push(bridge.camera().position);
          }
          return { poses, progress: bridge.scroll() };
        },
        { frames: GLIDE_FRAMES },
      );
      let worst = 0;
      for (let i = 1; i < result.poses.length; i++) {
        const a = result.poses[i - 1];
        const b = result.poses[i];
        if (a && b) worst = Math.max(worst, distance(a, b));
      }
      if (worst > MAX_STEP_M + EPSILON_M)
        problems.push(`"${control.text}" jumped the camera ${worst.toFixed(2)} m in one step`);
      else if (Math.abs(result.progress - anchor) > ARRIVE_EPSILON)
        problems.push(
          `"${control.text}" ended at progress ${result.progress.toFixed(3)}, not ${anchor.toFixed(3)}`,
        );
    }

    if (problems.length === 0) return [];
    return [
      {
        rule: "nav/link-glides",
        severity: "error",
        viewport: viewport.name,
        message: `Nav links do not glide on ${viewport.name}: ${problems.join("; ")}.`,
        fix: "Fix: make nav links call goToBeat(index) from the Doodley context and do not set the camera directly. The camera must move at most 1.5 m per step and end on the section's beat.",
        evidence: { data: { problems } },
      },
    ];
  },
};

export default rule;
