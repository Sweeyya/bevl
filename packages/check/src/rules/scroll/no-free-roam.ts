// Rule: scroll/no-free-roam
// Pass: W, A, S, D and mouse drag leave the camera on the choreography path
import {
  angleDeg,
  cameraPose,
  distance,
  progress,
  scrollTo,
  step,
  waitReady,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const MAX_OFFSET_M = 0.01;
const MAX_OFFSET_DEG = 0.5;
const SETTLE_FRAMES = 30;

const rule: Rule = {
  id: "scroll/no-free-roam",
  group: "scroll",
  severity: "error",
  description: "W, A, S, D and drag must not move the camera off the path.",
  async run(ctx) {
    const { page, viewport } = ctx;
    if (!(await waitReady(page))) return [];

    await scrollTo(page, 0);
    await step(page, SETTLE_FRAMES);
    const before = await cameraPose(page);
    const p0 = await progress(page);

    const offPath = async (): Promise<{ moved: number; turned: number }> => {
      await step(page, SETTLE_FRAMES);
      const now = await cameraPose(page);
      return {
        moved: distance(before.position, now.position),
        turned: angleDeg(before.quaternion, now.quaternion),
      };
    };
    const isOff = (d: { moved: number; turned: number }): boolean =>
      d.moved > MAX_OFFSET_M || d.turned > MAX_OFFSET_DEG;

    let result = { moved: 0, turned: 0 };
    for (const key of ["w", "a", "s", "d"]) {
      for (let i = 0; i < 3; i++) await page.keyboard.press(key);
      result = await offPath();
      if (isOff(result)) break;
    }

    if (!isOff(result)) {
      const cx = viewport.width / 2;
      const cy = viewport.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 150, cy + 80, { steps: 8 });
      await page.mouse.up();
      await scrollTo(page, p0);
      const p1 = await progress(page);
      if (Math.abs(p1 - p0) > 1e-3) {
        return [
          {
            rule: "scroll/no-free-roam",
            severity: "error",
            viewport: viewport.name,
            message: `Could not return to progress ${p0.toFixed(3)} after the drag on ${viewport.name} (got ${p1.toFixed(3)}), so the camera path could not be compared.`,
            fix: "Fix: make sure scrolling back to the top returns progress to 0 and that no input handler keeps changing progress.",
          },
        ];
      }
      result = await offPath();
    }

    const { moved, turned } = result;
    if (!isOff(result)) return [];
    return [
      {
        rule: "scroll/no-free-roam",
        severity: "error",
        viewport: viewport.name,
        message: `W, A, S, D or drag moved the camera ${moved.toFixed(2)} m and ${turned.toFixed(1)}° off the path on ${viewport.name}.`,
        fix: "Fix: remove keydown, mousemove and pointer handlers (or behaviors that read them) that change the camera. Only scroll progress may move it.",
        evidence: { data: { movedMeters: moved, turnedDeg: turned } },
      },
    ];
  },
};

export default rule;
