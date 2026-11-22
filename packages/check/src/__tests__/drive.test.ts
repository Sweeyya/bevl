import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BEAT_EPSILON,
  beatAnchors,
  couldNotRun,
  finding,
  onBeat,
  progress,
  scrollTo,
  step,
  sweep,
  waitReady,
} from "../drive.js";
import { FakeSite, restoreGlobals, snapshotGlobals } from "./helpers/fake-site.js";

beforeEach(snapshotGlobals);
afterEach(restoreGlobals);

describe("onBeat", () => {
  it("matches within the epsilon only", () => {
    expect(onBeat([0, 0.5], 0.5 + BEAT_EPSILON)).toBe(true);
    expect(onBeat([0, 0.5], 0.5 + BEAT_EPSILON * 2)).toBe(false);
  });
});

describe("finding and couldNotRun", () => {
  const ctx = new FakeSite().context();
  it("builds a finding with evidence only when data is given", () => {
    expect(finding(ctx, "a/b", "warn", "m", "Fix: f")).toEqual({
      rule: "a/b",
      severity: "warn",
      viewport: "desktop",
      message: "m",
      fix: "Fix: f",
    });
    expect(finding(ctx, "a/b", "warn", "m", "Fix: f", { x: 1 }).evidence).toEqual({
      data: { x: 1 },
    });
  });
  it("couldNotRun is an error with a Fix", () => {
    const f = couldNotRun(ctx, "a/b", "why");
    expect(f.severity).toBe("error");
    expect(f.message).toBe("Could not run a/b on desktop: why.");
    expect(f.fix).toMatch(/^Fix:/);
  });
});

describe("waitReady", () => {
  it("is true once the bridge is ready", async () => {
    expect(await waitReady(new FakeSite().page())).toBe(true);
  });
  it("is false without a bridge and stays false for that page", async () => {
    const site = new FakeSite({ bridge: false });
    const page = site.page();
    expect(await waitReady(page, 10)).toBe(false);
    site.install();
    (globalThis as unknown as { window: Record<string, unknown> }).window.__doodley = {
      ready: Promise.resolve(),
    };
    expect(await waitReady(page, 10)).toBe(false);
  });
});

describe("scrollTo, step, progress", () => {
  it("scrolls to a fraction of the scrollable height and reads progress", async () => {
    const site = new FakeSite();
    expect(await scrollTo(site.page(), 0.25)).toBe(true);
    expect(site.scrollTop).toBe(250);
    expect(await progress(site.page())).toBe(0.25);
  });
  it("returns false with no scroller or no scrollable height", async () => {
    expect(await scrollTo(new FakeSite({ scroller: false }).page(), 0.5)).toBe(false);
    expect(await scrollTo(new FakeSite({ maxScroll: 0 }).page(), 0.5)).toBe(false);
  });
  it("steps frames of 1/60 s", async () => {
    const site = new FakeSite();
    await step(site.page(), 3);
    expect(site.frames).toBe(3);
  });
  it("reads beat anchors", async () => {
    expect(await beatAnchors(new FakeSite({ beats: [0, 0.4] }).page())).toEqual([0, 0.4]);
  });
});

describe("sweep", () => {
  it("returns one pose per step including both ends", async () => {
    const poses = await sweep(new FakeSite().page(), 4);
    expect(poses).toHaveLength(5);
    expect(poses?.[4]?.position.z).toBe(-10);
  });
  it("returns null when it cannot scroll or has no camera", async () => {
    expect(await sweep(new FakeSite({ scroller: false }).page(), 4)).toBeNull();
    expect(await sweep(new FakeSite({ bridge: false }).page(), 4)).toBeNull();
  });
});
