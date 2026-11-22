import { describe, expect, it } from "vitest";
import { defaultChoreography } from "../choreography/default.js";
import { validateChoreography } from "../choreography/schema.js";
import { ProgressController } from "../input/progress.js";
import { resolveSnapIndex, resolveSnapSettings } from "../input/snap.js";

const beats = [0, 0.5, 1];
const all = [true, true, true];

describe("resolveSnapIndex", () => {
  it("snaps back when the user has not crossed the commit threshold", () => {
    expect(resolveSnapIndex(beats, all, 0, 0.05, "directional", 0.15)).toBe(0);
  });
  it("advances to the next beat once past the threshold, even if the previous is closer", () => {
    expect(resolveSnapIndex(beats, all, 0, 0.1, "directional", 0.15)).toBe(1);
    expect(resolveSnapIndex(beats, all, 0, 0.1, "nearest", 0.15)).toBe(0);
  });
  it("goes backward directionally", () => {
    expect(resolveSnapIndex(beats, all, 1, 0.9, "directional", 0.15)).toBe(1);
  });
  it("directional may pass several beats, strong may not", () => {
    expect(resolveSnapIndex(beats, all, 0, 0.9, "directional", 0.15)).toBe(2);
    expect(resolveSnapIndex(beats, all, 0, 0.9, "strong", 0.15)).toBe(1);
  });
  it("returns null for none and for beats that opt out", () => {
    expect(resolveSnapIndex(beats, all, 0, 0.4, "none", 0.15)).toBeNull();
    expect(resolveSnapIndex(beats, [true, false, true], 0, 0.4, "directional", 0.15)).toBeNull();
  });
  it("never traps: moving past the last beat stays on it", () => {
    expect(resolveSnapIndex(beats, all, 1, 1, "directional", 0.15)).toBe(2);
  });
});

describe("resolveSnapSettings", () => {
  it("uses defaults, coarse overrides, and zero delay in test mode", () => {
    expect(resolveSnapSettings(undefined, false, false)).toEqual({
      mode: "directional",
      delay: 0.12,
      commit: 0.15,
    });
    expect(
      resolveSnapSettings({ mode: "nearest", coarse: { mode: "strong" } }, true, false).mode,
    ).toBe("strong");
    expect(
      resolveSnapSettings({ mode: "nearest", coarse: { mode: "strong" } }, false, false).mode,
    ).toBe("nearest");
    expect(resolveSnapSettings(undefined, false, true).delay).toBe(0);
  });
});

describe("ProgressController snapping", () => {
  const make = () => {
    const c = new ProgressController(beats);
    c.snapConfig = { mode: "directional", delay: 0.1, commit: 0.15 };
    return c;
  };
  it("waits for the delay, then settles on the beat", () => {
    const c = make();
    c.setTarget(0.2, "wheel");
    c.tick(0.05, 6);
    expect(c.target).toBe(0.2);
    c.tick(0.06, 6);
    expect(c.target).toBe(0.5);
  });
  it("more input resets the delay", () => {
    const c = make();
    c.setTarget(0.2, "wheel");
    c.tick(0.09, 6);
    c.setTarget(0.25, "wheel");
    c.tick(0.09, 6);
    expect(c.target).toBe(0.25);
  });
  it("keyboard and nav moves are not re-snapped", () => {
    const c = make();
    c.nextBeat("keyboard");
    c.tick(1, 6);
    expect(c.target).toBe(0.5);
  });
  it("a later gesture starts from the beat it settled on", () => {
    const c = make();
    c.setTarget(0.2, "wheel");
    c.tick(0.2, 6);
    c.setTarget(0.45, "wheel");
    c.tick(0.2, 6);
    expect(c.target).toBe(0.5);
    c.setTarget(0.4, "wheel");
    c.tick(0.2, 6);
    expect(c.target).toBe(0);
  });
  it("does nothing without snapConfig", () => {
    const c = new ProgressController(beats);
    c.setTarget(0.2, "wheel");
    c.tick(1, 6);
    expect(c.target).toBe(0.2);
  });
  it("respects beats with snap off", () => {
    const c = make();
    c.setBeats(beats, [true, false, true]);
    c.setTarget(0.2, "wheel");
    c.tick(0.2, 6);
    expect(c.target).toBe(0.2);
  });
  it("jumps instantly when snapInstantly is set", () => {
    const c = make();
    c.snapInstantly = true;
    c.setTarget(0.2, "wheel");
    c.tick(0.2, 6);
    expect(c.value).toBe(0.5);
  });
});

describe("snap schema", () => {
  const ids = ["a", "b"];
  it("accepts snap settings and per-beat snap", () => {
    const base = defaultChoreography(ids);
    const spec = {
      ...base,
      snap: { mode: "strong", delay: 0.2, coarse: { mode: "nearest" } },
      beats: base.beats.map((b, i) => (i === 0 ? { ...b, snap: false } : b)),
    };
    expect(validateChoreography(spec, ids).ok).toBe(true);
  });
  it("rejects bad modes with a Fix", () => {
    const result = validateChoreography(
      { ...defaultChoreography(ids), snap: { mode: "sticky" } },
      ids,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("Fix:");
  });
});
