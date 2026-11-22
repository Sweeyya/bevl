// Rule: render/no-nan
// Pass: the camera and every beat's camera pose have no NaN
import {
  cameraPose,
  couldNotRun,
  finding,
  NOT_READY,
  sectionPoses,
  step,
  waitReady,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "render/no-nan",
  group: "render",
  severity: "error",
  description: "The camera and every beat's camera pose must not contain NaN.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    await step(ctx.page, 1);
    const cam = await cameraPose(ctx.page);
    if (!cam) return [couldNotRun(ctx, this.id, "the bridge has no camera")];
    const values = [
      ...Object.values(cam.position),
      ...Object.values(cam.quaternion),
      ...Object.values(cam.up),
      cam.fov,
      ...(await sectionPoses(ctx.page)).flatMap((s) => [
        ...Object.values(s.cameraPose.position),
        ...Object.values(s.cameraPose.quaternion),
      ]),
    ];
    if (!values.some((v) => Number.isNaN(v))) return [];
    return [
      finding(
        ctx,
        this.id,
        "error",
        `Camera has NaN in its pose on ${ctx.viewport.name}.`,
        "Check your camera path math. A division by zero or an empty path produces NaN. Ensure your DoodleyConfig has at least one section.",
      ),
    ];
  },
};

export default rule;
