import { describe, expect, it } from "vitest";
import { normalizeWheel, pxToProgress } from "../input/normalize.js";
import { ProgressController } from "../input/progress.js";
import { resolveInputs } from "../input/resolve.js";

describe("ProgressController", () => {
  it("clamps targets to [0, 1]", () => {
    const c = new ProgressController();
    c.setTarget(2);
    expect(c.target).toBe(1);
    c.setTarget(-1);
    expect(c.target).toBe(0);
    c.setTarget(Number.NaN);
    expect(c.target).toBe(0);
    c.nudge(0.3);
    c.nudge(0.3);
    expect(c.target).toBeCloseTo(0.6, 12);
    c.nudge(5);
    expect(c.target).toBe(1);
  });

  it("smoothing is frame-rate independent", () => {
    const k = 6;
    const dt = 1 / 30;
    const one = new ProgressController();
    one.setTarget(1);
    one.tick(dt, k);
    const two = new ProgressController();
    two.setTarget(1);
    two.tick(dt / 2, k);
    two.tick(dt / 2, k);
    expect(Math.abs(one.value - two.value)).toBeLessThan(1e-9);
    const a = 1 - Math.exp((-dt / 2) * k);
    expect(Math.abs(two.value - (1 - (1 - a) ** 2))).toBeLessThan(1e-9);
  });

  it("k = 0 and instant mode show the target exactly", () => {
    const c = new ProgressController();
    c.setTarget(0.4);
    expect(c.tick(1 / 60, 0)).toBe(false);
    expect(c.value).toBe(0.4);
    const t = new ProgressController();
    t.instant = true;
    t.setTarget(0.7);
    expect(t.value).toBe(0.7);
  });

  it("settles and snaps", () => {
    const c = new ProgressController();
    c.setTarget(1);
    expect(c.tick(1 / 60, 6)).toBe(true);
    expect(c.value).toBeGreaterThan(0);
    expect(c.value).toBeLessThan(1);
    c.snap();
    expect(c.value).toBe(1);
    const s = new ProgressController();
    s.setTarget(1);
    for (let i = 0; i < 600; i++) s.tick(1 / 60, 6);
    expect(s.value).toBe(1);
  });

  it("navigates beats", () => {
    const c = new ProgressController([1, 0, 0.5]);
    c.nextBeat();
    expect(c.target).toBe(0.5);
    c.nextBeat();
    expect(c.target).toBe(1);
    c.nextBeat();
    expect(c.target).toBe(1);
    c.prevBeat();
    expect(c.target).toBe(0.5);
    c.setTarget(0.3);
    c.prevBeat();
    expect(c.target).toBe(0);
    c.prevBeat();
    expect(c.target).toBe(0);
    c.goToBeat(2);
    expect(c.target).toBe(1);
    c.goToBeat(99);
    expect(c.target).toBe(1);
    c.goToBeat(-3);
    expect(c.target).toBe(0);
  });

  it("falls back to [0, 1] with no beats", () => {
    const c = new ProgressController();
    c.nextBeat();
    expect(c.target).toBe(1);
    c.prevBeat();
    expect(c.target).toBe(0);
  });

  it("notifies listeners with the source", () => {
    const c = new ProgressController();
    const seen: string[] = [];
    const off = c.listen((t, s) => seen.push(`${s}:${t}`));
    c.setTarget(0.5, "wheel");
    c.setTarget(0.5, "wheel");
    off();
    c.setTarget(1);
    expect(seen).toEqual(["wheel:0.5"]);
  });
});

describe("normalizeWheel", () => {
  it("keeps pixel deltas", () => {
    expect(normalizeWheel({ deltaX: 3, deltaY: 40, deltaMode: 0 }, 800)).toEqual({ x: 3, y: 40 });
  });
  it("scales lines by 100/6 px", () => {
    const r = normalizeWheel({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 800);
    expect(r.y).toBeCloseTo(50, 12);
  });
  it("scales pages by viewport height", () => {
    expect(normalizeWheel({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 800).y).toBe(800);
  });
  it("ignores ctrl+wheel pinch zoom", () => {
    expect(normalizeWheel({ deltaX: 5, deltaY: 50, deltaMode: 0, ctrlKey: true }, 800)).toEqual({
      x: 0,
      y: 0,
    });
  });
  it("converts px to progress", () => {
    expect(pxToProgress(100, 400)).toBe(0.25);
    expect(pxToProgress(100, 0)).toBe(0);
  });
});

describe("resolveInputs", () => {
  it("defaults to native scroll", () => {
    expect(resolveInputs(undefined, false)).toEqual(["scroll"]);
    expect(resolveInputs(undefined, true)).toEqual(["scroll"]);
    expect(resolveInputs({ fine: ["drag"] }, true)).toEqual(["scroll"]);
  });
  it("picks by pointer type and dedupes", () => {
    const spec = { fine: ["wheel", "drag", "wheel"] as const, coarse: ["swipe-x"] as const };
    const s = { fine: [...spec.fine], coarse: [...spec.coarse] };
    expect(resolveInputs(s, false)).toEqual(["wheel", "drag"]);
    expect(resolveInputs(s, true)).toEqual(["swipe-x"]);
  });
  it("drops virtual wheel and touch when native scroll is on", () => {
    expect(resolveInputs({ fine: ["wheel", "scroll", "tap-advance"] }, false)).toEqual([
      "scroll",
      "tap-advance",
    ]);
    expect(resolveInputs({ coarse: ["touch", "scroll"] }, true)).toEqual(["scroll"]);
  });
});
