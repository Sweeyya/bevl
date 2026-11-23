import { describe, expect, it } from "vitest";
import { ProgressController } from "../input/progress.js";
import { attachScroll, syncScroll } from "../input/scroll.js";
import { GLIDE, glideDuration, resolveSnapSettings } from "../input/snap.js";

const DT = 1 / 60;
const beats = [0, 0.5, 1];

function make(duration?: number): ProgressController {
  const c = new ProgressController(beats);
  c.snapConfig = { mode: "directional", delay: 0.25, commit: 0.15, duration };
  return c;
}

function run(c: ProgressController, seconds: number): number[] {
  const values: number[] = [];
  for (let t = 0; t < seconds; t += DT) {
    c.tick(DT, 6);
    values.push(c.value);
  }
  return values;
}

describe("glideDuration", () => {
  it("scales with distance and is clamped", () => {
    expect(glideDuration(0)).toBe(GLIDE.base);
    expect(glideDuration(0.5)).toBeCloseTo(0.8, 10);
    expect(glideDuration(-0.5)).toBeCloseTo(0.8, 10);
    expect(glideDuration(10)).toBe(GLIDE.max);
    expect(glideDuration(0.5, 2)).toBe(2);
  });
  it("resolves snap.duration with coarse overrides", () => {
    expect(resolveSnapSettings({ duration: 1, coarse: { duration: 0.5 } }, true).duration).toBe(
      0.5,
    );
    expect(resolveSnapSettings({ duration: 1 }, false).duration).toBe(1);
    expect(resolveSnapSettings(undefined, false).duration).toBeUndefined();
  });
});

describe("programmatic glide", () => {
  it("moves monotonically, starts without a jump and lands exactly on the beat", () => {
    const c = make();
    c.nextBeat("keyboard");
    const values = run(c, 2);
    let prev = 0;
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(values[0]).toBeLessThan(0.01);
    expect(c.value).toBe(0.5);
    expect(c.tick(DT, 6)).toBe(false);
  });

  it("takes the scaled duration for the distance", () => {
    const near = make();
    near.setTarget(0.5, "nav");
    const far = make();
    far.setTarget(1, "nav");
    const arrival = (c: ProgressController): number => {
      let t = 0;
      while (c.tick(DT, 6) && t < 5) t += DT;
      return t;
    };
    expect(arrival(near)).toBeCloseTo(glideDuration(0.5), 1);
    expect(arrival(far)).toBeCloseTo(glideDuration(1), 1);
    expect(arrival(far)).toBe(0);
  });

  it("honours snap.duration, and 0 jumps", () => {
    const c = make(0.5);
    c.setTarget(1, "nav");
    run(c, 0.4);
    expect(c.value).toBeLessThan(1);
    run(c, 0.2);
    expect(c.value).toBe(1);
    const j = make(0);
    j.setTarget(1, "nav");
    expect(j.value).toBe(1);
  });

  it("snap settles glide from the displayed value over a fixed duration", () => {
    const c = make();
    c.setTarget(0.2, "wheel");
    run(c, 0.25);
    const from = c.value;
    expect(c.target).toBe(0.5);
    expect(from).toBeLessThan(0.2 + 1e-9);
    const values = run(c, 2);
    expect(values[0]).toBeGreaterThanOrEqual(from);
    expect((values[0] ?? 0) - from).toBeLessThan(0.01);
    expect(c.value).toBe(0.5);
  });

  it("user input cancels the glide and continues from the displayed value", () => {
    const c = make();
    c.setTarget(1, "nav");
    run(c, 0.3);
    const here = c.value;
    expect(here).toBeGreaterThan(0);
    expect(here).toBeLessThan(1);
    c.nudge(0.01, "wheel");
    expect(c.value).toBe(here);
    expect(c.target).toBeCloseTo(here + 0.01, 12);
    c.tick(DT, 6);
    expect(Math.abs(c.value - here)).toBeLessThan(0.01);
    const t = make();
    t.setTarget(1, "keyboard");
    run(t, 0.3);
    const at = t.value;
    t.setTarget(0.1, "scroll");
    expect(t.value).toBe(at);
  });

  it("is deterministic however the time is stepped", () => {
    const a = make();
    const b = make();
    a.setTarget(1, "nav");
    b.setTarget(1, "nav");
    for (let i = 0; i < 30; i++) a.tick(1 / 30, 6);
    for (let i = 0; i < 60; i++) b.tick(1 / 60, 6);
    expect(a.value).toBeCloseTo(b.value, 10);
  });

  it("jumps for k <= 0, test mode and reduced motion", () => {
    const k0 = make();
    k0.setTarget(1, "nav");
    expect(k0.tick(DT, 0)).toBe(false);
    expect(k0.value).toBe(1);
    const t = make();
    t.instant = true;
    t.setTarget(1, "keyboard");
    expect(t.value).toBe(1);
    const r = make();
    r.snapInstantly = true;
    r.setTarget(0.2, "wheel");
    run(r, 0.3);
    expect(r.value).toBe(0.5);
  });

  it("keeps exponential smoothing for continuous input", () => {
    const c = make();
    c.setTarget(0.1, "wheel");
    c.tick(DT, 6);
    expect(c.value).toBeCloseTo(0.1 * (1 - Math.exp(-DT * 6)), 12);
  });
});

class FakeScroller {
  scrollTop = 0;
  scrollHeight = 1100;
  clientHeight = 100;
  private handlers: (() => void)[] = [];
  addEventListener(_t: string, fn: () => void): void {
    this.handlers.push(fn);
  }
  removeEventListener(): void {}
  fire(): void {
    for (const h of this.handlers) h();
  }
}

describe("scroll follows the displayed value", () => {
  it("moves scrollTop with each tick and ignores its own scroll events", () => {
    const el = new FakeScroller();
    const c = make();
    attachScroll(el as unknown as HTMLElement, c);
    c.setTarget(1, "nav");
    expect(el.scrollTop).toBe(0);
    c.tick(0.3, 6);
    expect(el.scrollTop).toBe(Math.round(c.value * 1000));
    expect(el.scrollTop).toBeGreaterThan(0);
    expect(el.scrollTop).toBeLessThan(1000);
    const target = c.target;
    el.fire();
    expect(c.target).toBe(target);
    run(c, 2);
    expect(el.scrollTop).toBe(1000);
  });

  it("treats a foreign scroll position as user input and stops fighting it", () => {
    const el = new FakeScroller();
    const c = make();
    attachScroll(el as unknown as HTMLElement, c);
    c.setTarget(1, "nav");
    c.tick(0.3, 6);
    el.scrollTop = 200;
    el.fire();
    expect(c.target).toBeCloseTo(0.2, 10);
    const before = c.value;
    c.tick(DT, 6);
    expect(el.scrollTop).toBe(200);
    expect(c.value).not.toBe(before);
  });

  it("syncScroll still clamps", () => {
    const el = new FakeScroller();
    syncScroll(el as unknown as HTMLElement, 2);
    expect(el.scrollTop).toBe(1000);
  });
});
