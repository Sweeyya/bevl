import { afterEach, describe, expect, it } from "vitest";
import { clearBehaviors, registerBehavior } from "../choreography/behaviors.js";
import { defaultChoreography } from "../choreography/default.js";
import { validateChoreography } from "../choreography/schema.js";

const IDS = ["hero", "features", "contact"];

function errorsFor(input: unknown, ids = IDS): string[] {
  const result = validateChoreography(input, ids);
  if (result.ok) throw new Error("expected validation to fail");
  for (const e of result.errors) expect(e).toContain("Fix:");
  return result.errors;
}

function withPatch(patch: Record<string, unknown>): unknown {
  return { ...defaultChoreography(IDS), ...patch };
}

afterEach(() => clearBehaviors());

describe("validateChoreography", () => {
  it("accepts the default choreography", () => {
    const result = validateChoreography(defaultChoreography(IDS), IDS);
    expect(result.ok).toBe(true);
  });

  it("names a beat that matches no section and lists the valid ids", () => {
    const errors = errorsFor(
      withPatch({
        beats: [
          { id: "hero", at: 0 },
          { id: "features", at: 0.5 },
          { id: "pricng", at: 1 },
          { id: "contact", at: 1 },
        ],
      }),
    );
    expect(errors).toContain(
      'beats[2].id "pricng" does not match any section. Fix: use one of hero, features, contact.',
    );
  });

  it("requires a beat for every section", () => {
    const errors = errorsFor(withPatch({ beats: [{ id: "hero", at: 0 }] }));
    expect(errors.some((e) => e.startsWith('beats is missing section "features"'))).toBe(true);
  });

  it("rejects beats out of range or out of order", () => {
    const outOfRange = errorsFor(
      withPatch({
        beats: [
          { id: "hero", at: 0 },
          { id: "features", at: 0.5 },
          { id: "contact", at: 1.5 },
        ],
      }),
    );
    expect(outOfRange[0]).toMatch(/^beats\[2\]\.at: /);
    const unordered = errorsFor(
      withPatch({
        beats: [
          { id: "hero", at: 0.6 },
          { id: "features", at: 0.5 },
          { id: "contact", at: 1 },
        ],
      }),
    );
    expect(unordered[0]).toMatch(/^beats\[1\]\.at \(0\.5\) is before beats\[0\]\.at/);
  });

  it("rejects unsorted keyframes", () => {
    const errors = errorsFor(
      withPatch({
        tracks: [
          {
            target: "box",
            prop: "rotation.y",
            keys: [
              { at: 0.5, value: 1 },
              { at: 0.2, value: 0 },
            ],
          },
        ],
      }),
    );
    expect(errors[0]).toMatch(/^tracks\[0\]\.keys\[1\]\.at .*Fix: sort keys by at\.$/);
  });

  it("requires [x, y, z] for position and lookAt", () => {
    const errors = errorsFor(
      withPatch({ tracks: [{ target: "camera", prop: "lookAt", keys: [{ at: 0, value: 3 }] }] }),
    );
    expect(errors[0]).toMatch(/^tracks\[0\]\.keys\[0\]\.value .*Fix: use \[x, y, z\]/);
  });

  it("rejects unknown camera props and bad colors", () => {
    const camera = errorsFor(
      withPatch({ tracks: [{ target: "camera", prop: "zoom", keys: [{ at: 0, value: 1 }] }] }),
    );
    expect(camera[0]).toMatch(
      /^tracks\[0\]\.prop "zoom".*Fix: use one of position, lookAt, fov\.$/,
    );
    const color = errorsFor(
      withPatch({
        tracks: [{ target: "box", prop: "material.color", keys: [{ at: 0, value: "red" }] }],
      }),
    );
    expect(color[0]).toMatch(/^tracks\[0\]\.keys\[0\]\.value: /);
  });

  it("reports structural errors with the field path", () => {
    const errors = errorsFor({ version: 2, beats: [], camera: { position: [0, 0] }, extra: 1 });
    expect(errors.some((e) => e.startsWith("version: "))).toBe(true);
    expect(errors.some((e) => e.startsWith("camera.position"))).toBe(true);
    expect(errors.some((e) => e.includes('Fix: remove "extra"'))).toBe(true);
  });

  it("requires behaviors to be registered", () => {
    const errors = errorsFor(withPatch({ behaviors: ["spin"] }));
    expect(errors[0]).toMatch(/^behaviors\[0\] "spin" is not registered\. Fix: /);
    registerBehavior("spin", () => {});
    expect(validateChoreography(withPatch({ behaviors: ["spin"] }), IDS).ok).toBe(true);
  });

  it("requires points for alongPath layouts", () => {
    const errors = errorsFor(withPatch({ layouts: { sections: { arrange: "alongPath" } } }));
    expect(errors[0]).toMatch(/^layouts\.sections\.points/);
  });
});
