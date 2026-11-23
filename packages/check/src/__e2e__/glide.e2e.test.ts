import { afterAll, afterEach, describe, expect, it } from "vitest";
import { centre, closeBrowser, type Opened, open, scrollLength } from "./harness.js";

const opened: Opened[] = [];
afterEach(async () => {
  for (const o of opened.splice(0)) await o.context.close();
});
afterAll(closeBrowser);

const BEATS = [0, 0.25, 0.5, 0.75, 1];
const EPSILON = 0.003;

interface Sample {
  t: number;
  shown: number;
  bar: number;
}

async function openGlide(): Promise<Opened> {
  const o = await open("snap", { mode: "directional", fine: "scroll" }, undefined, false);
  opened.push(o);
  await o.page.evaluate(() => {
    const w = window as unknown as { __samples: Sample[] };
    const el = document.querySelector("[data-toros-scroller]") as HTMLElement;
    w.__samples = [];
    const loop = (t: number): void => {
      w.__samples.push({
        t,
        shown: window.__e2e.displayed(),
        bar: el.scrollTop / (el.scrollHeight - el.clientHeight),
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const { x, y } = centre(o.page);
  await o.page.mouse.move(x, y);
  return o;
}

const samples = (o: Opened): Promise<Sample[]> =>
  o.page.evaluate(() => (window as unknown as { __samples: Sample[] }).__samples);

const latest = async (o: Opened): Promise<Sample | undefined> => (await samples(o)).at(-1);

async function wheel(o: Opened, delta: number): Promise<void> {
  await o.page.mouse.wheel(0, delta * (await scrollLength(o.page)));
}

async function landed(o: Opened, timeout = 15_000): Promise<number> {
  let beat = Number.NaN;
  await expect
    .poll(
      async () => {
        const s = (await samples(o)).slice(-12);
        const last = s.at(-1);
        const stable = s.length === 12 && s.every((x) => x.shown === last?.shown);
        const hit = BEATS.find((b) => Math.abs(b - (last?.shown ?? -1)) < 1e-9);
        if (stable && hit !== undefined) beat = hit;
        return stable && hit !== undefined;
      },
      { timeout },
    )
    .toBe(true);
  return beat;
}

function frameDeltas(s: Sample[]): number[] {
  return s.slice(1).map((x, i) => x.shown - (s[i]?.shown ?? 0));
}

describe("glide, then snap, in a real browser", () => {
  it("eases from a small nudge onto a beat, with the scrollbar following the picture", async () => {
    const o = await openGlide();
    await wheel(o, 0.08);
    expect(await landed(o)).toBe(0.25);
    const all = await samples(o);
    const first = all.findIndex((x) => x.shown > 0);
    const s = all.slice(Math.max(0, first - 1));
    const deltas = frameDeltas(s);
    const lastGap = s.map((x) => Math.abs(x.bar - x.shown) > 0.01).lastIndexOf(true);
    const glide = s.slice(lastGap + 1);
    const biggest = Math.max(...deltas);
    if (process.env.GLIDE_METRICS) {
      const at = (cond: (x: Sample) => boolean): number => (s.find(cond)?.t ?? 0) - (s[0]?.t ?? 0);
      const lead = Math.max(...glide.map((x) => x.bar - x.shown));
      const end = s.findIndex((x) => x.shown === 0.25);
      console.info(
        JSON.stringify({
          msToLeaveZero: Math.round(at((x) => x.shown > 0)),
          maxFrameDelta: Number(biggest.toFixed(4)),
          maxScrollbarLead: Number(lead.toFixed(4)),
          maxScrollbarLeadIncludingNudge: Number(
            Math.max(...s.map((x) => x.bar - x.shown)).toFixed(4),
          ),
          msToSettle: Math.round((s[end]?.t ?? 0) - (s[0]?.t ?? 0)),
          frames: s.length,
        }),
      );
    }
    expect(Math.min(...deltas)).toBeGreaterThanOrEqual(0);
    expect(biggest).toBeLessThan(0.06);
    expect(glide.length).toBeGreaterThan(10);
    for (const x of glide) {
      expect(x.bar - x.shown).toBeLessThanOrEqual(EPSILON + biggest);
      expect(x.shown - x.bar).toBeLessThanOrEqual(EPSILON + 2 * biggest);
    }
  });

  it("a wheel input in the middle of a glide takes over without a jump", async () => {
    const o = await openGlide();
    await wheel(o, 0.08);
    await expect
      .poll(async () => ((await latest(o))?.shown ?? 0) > 0.12, { timeout: 15_000 })
      .toBe(true);
    const at = (await latest(o))?.shown ?? 0;
    expect(at).toBeLessThan(0.25);
    const before = (await samples(o)).length;
    await wheel(o, -0.05);
    const beat = await landed(o);
    expect(BEATS).toContain(beat);
    const after = (await samples(o)).slice(before - 1);
    const deltas = frameDeltas(after).map(Math.abs);
    expect(Math.max(...deltas)).toBeLessThan(0.06);
    const next = after.find((x) => x.shown !== at)?.shown ?? at;
    expect(Math.abs(next - at)).toBeLessThan(0.06);
  });
});
