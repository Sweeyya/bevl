// Rule: a11y/reduced-motion
// Pass: with prefers-reduced-motion on, the camera travels under 10% as far as normally,
// the active section still changes with scroll, and the keyboard still reaches every beat
import type { Page } from "playwright";
import {
  angleDeg,
  beatAnchors,
  type CameraPose,
  cameraPose,
  choreography,
  couldNotRun,
  distance,
  finding,
  NO_SCROLL,
  NOT_READY,
  nextFrames,
  reducedMotionOn,
  scrollTo,
  step,
  waitReady,
  walkBeatsByKeyboard,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const MAX_REDUCED_SHARE = 0.1;
const MIN_ALLOWED_TRAVEL = 0.05;
const SETTLE_FRAMES = 120;
const MIN_STEPS = 40;

/** Camera travel along a sweep: metres moved plus radians turned. */
function travel(poses: CameraPose[]): number {
  let total = 0;
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1];
    const b = poses[i];
    if (a && b)
      total +=
        distance(a.position, b.position) + (angleDeg(a.quaternion, b.quaternion) * Math.PI) / 180;
  }
  return total;
}

const activeId = (page: Page): Promise<string | null> =>
  page.evaluate(
    () =>
      document.querySelector<HTMLElement>('[data-bevl-section][data-bevl-active="true"]')?.dataset
        .bevlSection ?? null,
  );

async function settledSweep(
  page: Page,
  steps: number,
  seen?: Set<string>,
): Promise<CameraPose[] | null> {
  if (!(await scrollTo(page, 0))) return null;
  await step(page, SETTLE_FRAMES);
  const poses: CameraPose[] = [];
  for (let i = 0; i <= steps; i++) {
    await scrollTo(page, i / steps);
    await step(page, 1);
    const pose = await cameraPose(page);
    if (!pose) return null;
    poses.push(pose);
    const id = seen ? await activeId(page) : null;
    if (seen && id) seen.add(id);
  }
  return poses;
}

const rule: Rule = {
  id: "a11y/reduced-motion",
  group: "a11y",
  severity: "error",
  description:
    "With reduced motion on, the camera must move less than 10% as far, sections must still change, and the keyboard must still reach every beat.",
  async run(ctx) {
    const { page } = ctx;
    if (!(await waitReady(page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const choreo = await choreography(page);
    if (choreo.allow?.reducedMotion) return [];
    const beats = [...(await beatAnchors(page))].sort((a, b) => a - b);
    if (beats.length === 0) return [couldNotRun(ctx, this.id, "the bridge reports no sections")];
    const steps = Math.max(MIN_STEPS, beats.length * 10);

    try {
      const normal = await settledSweep(page, steps).catch(() => null);
      if (!normal) return [couldNotRun(ctx, this.id, NO_SCROLL)];

      await page.emulateMedia({ reducedMotion: "reduce" });
      await nextFrames(page);
      if (!(await reducedMotionOn(page)))
        return [
          couldNotRun(ctx, this.id, "the page did not report reduced motion after emulating it"),
        ];

      const seen = new Set<string>();
      const reduced = await settledSweep(page, steps, seen).catch(() => null);
      if (!reduced) return [couldNotRun(ctx, this.id, NO_SCROLL)];
      const problems: string[] = [];

      const normalTravel = travel(normal);
      const reducedTravel = travel(reduced);
      const limit = Math.max(normalTravel * MAX_REDUCED_SHARE, MIN_ALLOWED_TRAVEL);
      if (reducedTravel > limit)
        problems.push(
          `the camera still travels ${reducedTravel.toFixed(2)} (normal ${normalTravel.toFixed(2)}, limit ${limit.toFixed(2)})`,
        );
      if (seen.size < beats.length)
        problems.push(
          `only ${seen.size} of ${beats.length} sections became active while scrolling`,
        );
      problems.push(...(await walkBeatsByKeyboard(page, beats)));

      if (problems.length === 0) return [];
      return [
        finding(
          ctx,
          this.id,
          "error",
          `Reduced motion is not respected on ${ctx.viewport.name}: ${problems.join("; ")}.`,
          'Fix: remove reducedMotion.mode "none" so the camera stays still and sections fade, or add reducedMotion.tracks whose camera movement is under 10% of the normal path. Set allow.reducedMotion only if full motion is intended.',
          { normalTravel, reducedTravel, limit, activeSections: seen.size, problems },
        ),
      ];
    } finally {
      await page.emulateMedia({ reducedMotion: null });
      await nextFrames(page);
      await step(page, SETTLE_FRAMES);
    }
  },
};

export default rule;
