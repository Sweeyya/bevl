// Rule: scroll/reaches-every-section
// Pass: scrolling to each beat anchor brings progress to that anchor, puts the camera at the
//       choreography's pose for that beat, and the section's DOM anchor exists
import {
  BEAT_EPSILON,
  cameraPose,
  couldNotRun,
  finding,
  NO_SCROLL,
  NOT_READY,
  progress,
  scrollTo,
  sectionPoses,
  step,
  waitReady,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const SETTLE_FRAMES = 30;
const POSITION_TOLERANCE = 0.05;
const ORIENTATION_TOLERANCE = 1e-3;

const rule: Rule = {
  id: "scroll/reaches-every-section",
  group: "scroll",
  severity: "error",
  description: "Scrolling must reach every beat and put the camera at that beat's pose.",
  async run(ctx) {
    const { page } = ctx;
    if (!(await waitReady(page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const sections = await sectionPoses(page).catch(() => []);
    if (sections.length === 0) return [couldNotRun(ctx, this.id, "the bridge reports no sections")];

    const missing: string[] = [];
    for (const s of sections) {
      if (!(await scrollTo(page, s.anchor).catch(() => false))) {
        return [couldNotRun(ctx, this.id, NO_SCROLL)];
      }
      await step(page, SETTLE_FRAMES);
      const [p, cam, hasDom] = await Promise.all([
        progress(page),
        cameraPose(page),
        page.evaluate((id) => document.getElementById(id) !== null, `section-${s.id}`),
      ]);
      const want = s.cameraPose;
      const dot = cam
        ? Math.abs(
            cam.quaternion.x * want.quaternion.x +
              cam.quaternion.y * want.quaternion.y +
              cam.quaternion.z * want.quaternion.z +
              cam.quaternion.w * want.quaternion.w,
          )
        : 0;
      const dist = cam
        ? Math.hypot(
            cam.position.x - want.position.x,
            cam.position.y - want.position.y,
            cam.position.z - want.position.z,
          )
        : Number.POSITIVE_INFINITY;
      const reached =
        Math.abs(p - s.anchor) <= BEAT_EPSILON &&
        dist <= POSITION_TOLERANCE &&
        1 - dot <= ORIENTATION_TOLERANCE;
      if (!reached || !hasDom) missing.push(s.id);
    }
    if (missing.length === 0) return [];
    return [
      finding(
        ctx,
        this.id,
        "error",
        `Sections not reached on ${ctx.viewport.name}: ${missing.join(", ")}`,
        'Fix: make sure scrolling to each beat brings progress and the camera to that beat, and every section has a DOM anchor with id="section-<id>". Check that the scroll container is tall enough for every beat.',
        { missing },
      ),
    ];
  },
};

export default rule;
