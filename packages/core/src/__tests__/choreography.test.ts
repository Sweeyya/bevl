import { describe, expect, it } from "vitest";
import { setProp } from "../choreography/apply.js";
import { getBehavior, registerBehavior } from "../choreography/behaviors.js";
import { defaultChoreography } from "../choreography/default.js";
import { cameraPoseAt } from "../choreography/pose.js";
import { cameraFrameAt, sectionPositions } from "../choreography/scene.js";

const IDS = ["hero", "features", "contact"];

describe("defaultChoreography", () => {
  const choreo = defaultChoreography(IDS);

  it("spaces beats evenly", () => {
    expect(choreo.beats).toEqual([
      { id: "hero", at: 0 },
      { id: "features", at: 0.5 },
      { id: "contact", at: 1 },
    ]);
    expect(defaultChoreography(["only"]).beats).toEqual([{ id: "only", at: 0 }]);
  });

  it("matches the old linear camera: z = 6 - 10 * i, looking down -Z", () => {
    expect(cameraFrameAt(choreo, 0).position).toEqual([0, 0, 6]);
    expect(cameraFrameAt(choreo, 0.5).position).toEqual([0, 0, -4]);
    expect(cameraFrameAt(choreo, 1).position).toEqual([0, 0, -14]);
    expect(cameraFrameAt(choreo, 0.25).position[2]).toBeCloseTo(1, 10);
    const pose = cameraPoseAt(choreo, 0.25);
    expect(pose.quaternion.w).toBeCloseTo(1, 10);
    expect(pose.quaternion.y).toBeCloseTo(0, 10);
    expect(pose.fov).toBe(60);
  });

  it("places sections at z = 0, -10, -20", () => {
    expect(sectionPositions(choreo, IDS).map((p) => p.position)).toEqual([
      [0, 0, -0],
      [0, 0, -10],
      [0, 0, -20],
    ]);
  });

  it("uses the reserved sections layout when present", () => {
    const placed = sectionPositions(
      { ...choreo, layouts: { sections: { arrange: "ring", radius: 4, facing: "inward" } } },
      IDS,
    );
    expect(placed[0]).toEqual({ position: [0, 0, 4], lookAt: [0, 0, 0] });
  });
});

describe("cameraPoseAt", () => {
  it("turns the camera to face lookAt", () => {
    const pose = cameraPoseAt(
      { version: 1, beats: [], camera: { position: [0, 0, 0], lookAt: [10, 0, 0] } },
      0,
    );
    const q = pose.quaternion;
    const forwardX = -2 * (q.x * q.z + q.w * q.y);
    expect(forwardX).toBeCloseTo(1, 6);
  });
});

describe("setProp", () => {
  it("sets vectors, single axes, colors and plain fields", () => {
    const calls: unknown[][] = [];
    const vec = { x: 0, set: (...a: unknown[]) => calls.push(a) };
    const obj = { position: vec, rotation: { y: 0 }, material: { opacity: 1, color: vec } };
    expect(setProp(obj, "position", [1, 2, 3])).toBe(true);
    expect(setProp(obj, "rotation.y", 2)).toBe(true);
    expect(setProp(obj, "material.opacity", 0.5)).toBe(true);
    expect(setProp(obj, "material.color", "#ff0000")).toBe(true);
    expect(calls).toEqual([[1, 2, 3], ["#ff0000"]]);
    expect(obj.rotation.y).toBe(2);
    expect(obj.material.opacity).toBe(0.5);
    expect(setProp(obj, "missing.prop", 1)).toBe(false);
    expect(setProp(obj, "material.nope", 1)).toBe(false);
  });
});

describe("behaviors", () => {
  it("registers and looks up by name", () => {
    const fn = () => {};
    registerBehavior("test-behavior", fn);
    expect(getBehavior("test-behavior")).toBe(fn);
    expect(getBehavior("nope")).toBeUndefined();
  });
});
