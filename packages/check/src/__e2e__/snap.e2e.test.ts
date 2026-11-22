import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  centre,
  closeBrowser,
  displayed,
  type Opened,
  open,
  PHONE,
  progress,
  scrollLength,
  step,
  touchSwipe,
} from "./harness.js";

const opened: Opened[] = [];
afterEach(async () => {
  for (const o of opened.splice(0)) await o.context.close();
});
afterAll(closeBrowser);

const BEATS = [0, 0.25, 0.5, 0.75, 1];

async function openSnap(params: Record<string, string>, testMode = true): Promise<Opened> {
  const o = await open("snap", params, undefined, testMode);
  opened.push(o);
  if (testMode) {
    const { x, y } = centre(o.page);
    await o.page.mouse.move(x, y);
  }
  return o;
}

async function wheelProgress(o: Opened, delta: number, expected: number): Promise<void> {
  await o.page.mouse.wheel(0, delta * (await scrollLength(o.page)));
  await expect.poll(() => progress(o.page)).toBeCloseTo(expected, 2);
}

async function settle(o: Opened, expected: number): Promise<void> {
  await step(o.page, 600);
  expect(await progress(o.page)).toBeCloseTo(expected, 3);
}

describe("snap modes driven by real wheel input", () => {
  it("directional: a tiny nudge snaps back, a flick reaches the next beat, a long push the next beat ahead", async () => {
    const o = await openSnap({ mode: "directional" });
    await wheelProgress(o, 0.02, 0.02);
    await settle(o, 0);
    await wheelProgress(o, 0.08, 0.08);
    await settle(o, 0.25);
    await wheelProgress(o, 0.15, 0.4);
    await settle(o, 0.5);
  });

  it("directional: snaps backwards in the direction of travel", async () => {
    const o = await openSnap({ mode: "directional" });
    await o.page.keyboard.press("ArrowDown");
    await o.page.keyboard.press("ArrowDown");
    await expect.poll(() => progress(o.page)).toBeCloseTo(0.5, 3);
    await wheelProgress(o, -0.05, 0.45);
    await settle(o, 0.25);
  });

  it("nearest: lands on the closest beat whatever the direction", async () => {
    const o = await openSnap({ mode: "nearest" });
    await wheelProgress(o, 0.3, 0.3);
    await settle(o, 0.25);
    await wheelProgress(o, 0.13, 0.38);
    await settle(o, 0.5);
  });

  it("strong: one gesture never passes more than one beat", async () => {
    const o = await openSnap({ mode: "strong" });
    await wheelProgress(o, 0.6, 0.6);
    await settle(o, 0.25);
  });

  it("none: progress rests where the input stopped", async () => {
    const o = await openSnap({ mode: "none" });
    await wheelProgress(o, 0.3, 0.3);
    await settle(o, 0.3);
  });

  it("per-beat snap:false lets progress rest near that beat", async () => {
    const o = await openSnap({ mode: "directional", nosnap: "2" });
    await wheelProgress(o, 0.4, 0.4);
    await settle(o, 0.4);
    await wheelProgress(o, 0.35, 0.75);
    await settle(o, 0.75);
  });

  it("uses the same settings with a real touch swipe on a phone", async () => {
    const o = await open("snap", { mode: "nearest", coarse: "touch" }, PHONE);
    opened.push(o);
    const length = await scrollLength(o.page);
    await touchSwipe(o.context, o.page, 0, -length * 0.3);
    await expect.poll(() => progress(o.page)).toBeCloseTo(0.3, 2);
    await settle(o, 0.25);
  });

  it("every beat stays reachable by keyboard", async () => {
    const o = await openSnap({ mode: "none" });
    for (const beat of BEATS.slice(1)) {
      await o.page.keyboard.press("ArrowDown");
      await expect.poll(() => progress(o.page)).toBeCloseTo(beat, 3);
    }
  });
});

describe("reduced motion", () => {
  interface Series {
    samples: number[];
  }

  async function sample(o: Opened): Promise<void> {
    await o.page.evaluate(() => {
      const w = window as unknown as { __series: Series };
      w.__series = { samples: [] };
      const loop = (): void => {
        w.__series.samples.push(window.__e2e.displayed());
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }

  const displayedOf = (o: Opened): Promise<number> => displayed(o.page);

  const clearSeries = (o: Opened): Promise<void> =>
    o.page.evaluate(() => {
      (window as unknown as { __series: Series }).__series.samples = [];
    });

  const series = (o: Opened): Promise<number[]> =>
    o.page.evaluate(() => (window as unknown as { __series: Series }).__series.samples);

  const isIntermediate = (v: number, from: number, to: number): boolean => {
    const lo = Math.min(from, to) + 0.002;
    const hi = Math.max(from, to) - 0.002;
    return v > lo && v < hi;
  };

  async function snapJump(reduced: boolean): Promise<number[]> {
    const o = await openSnap({ mode: "nearest", delay: "1.5" }, false);
    await o.page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await o.page.reload();
    await o.page.waitForFunction(() => "__e2e" in window);
    await sample(o);
    const { x, y } = centre(o.page);
    await o.page.mouse.move(x, y);
    await o.page.mouse.wheel(0, 0.3 * (await scrollLength(o.page)));
    await expect.poll(() => displayedOf(o), { timeout: 15_000 }).toBeCloseTo(0.3, 3);
    await clearSeries(o);
    await expect.poll(() => displayedOf(o), { timeout: 15_000 }).toBeCloseTo(0.25, 3);
    return (await series(o)).filter((v) => isIntermediate(v, 0.28, 0.25));
  }

  it("snaps instantly with reduced motion and glides without it", async () => {
    expect(await snapJump(true)).toEqual([]);
    expect((await snapJump(false)).length).toBeGreaterThan(0);
  });

  async function navJump(reduced: boolean): Promise<number[]> {
    const o = await openSnap({ mode: "none" }, false);
    await o.page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await o.page.reload();
    await o.page.waitForFunction(() => "__e2e" in window);
    await sample(o);
    await o.page.getByRole("link", { name: "Section 5" }).click();
    await expect.poll(() => displayedOf(o), { timeout: 15_000 }).toBeCloseTo(1, 3);
    return (await series(o)).filter((v) => isIntermediate(v, 0, 1));
  }

  it("jumps straight to a section from the nav with reduced motion and glides without it", async () => {
    expect(await navJump(true)).toEqual([]);
    expect((await navJump(false)).length).toBeGreaterThan(0);
  });
});
