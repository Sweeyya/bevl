import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeBrowser, type Opened, open, progress, step } from "./harness.js";

const opened: Opened[] = [];
afterEach(async () => {
  for (const o of opened.splice(0)) await o.context.close();
});
afterAll(closeBrowser);

interface Reading {
  camera: { x: number; y: number; z: number };
  active: string | null;
  sections: { id: string; visible: boolean; z: number; opacity: number; transparent: boolean }[];
}

const IDS = ["s1", "s2", "s3"];

const read = (o: Opened): Promise<Reading> =>
  o.page.evaluate((ids) => {
    const scene = window.__e2e.scene as unknown as {
      getObjectByName(n: string): {
        visible: boolean;
        position: { z: number };
        children: { material: { opacity: number; transparent: boolean } }[];
      };
    };
    return {
      camera: window.__toros?.camera().position ?? { x: Number.NaN, y: 0, z: 0 },
      active:
        document.querySelector<HTMLElement>('[data-toros-section][data-toros-active="true"]')
          ?.dataset.torosSection ?? null,
      sections: ids.map((id) => {
        const g = scene.getObjectByName(`section-${id}`);
        const m = g.children[0]?.material;
        return {
          id,
          visible: g.visible,
          z: g.position.z,
          opacity: m?.opacity ?? Number.NaN,
          transparent: m?.transparent ?? false,
        };
      }),
    };
  }, IDS);

async function goTo(o: Opened, key: string, expected: number): Promise<Reading> {
  await o.page.keyboard.press(key);
  await expect.poll(() => progress(o.page)).toBeCloseTo(expected, 3);
  await step(o.page, 60);
  return read(o);
}

async function openReduced(params: Record<string, string> = {}, reduced = true): Promise<Opened> {
  const o = await open("reduced-motion", params);
  opened.push(o);
  await o.page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await o.page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await step(o.page, 60);
  return o;
}

const travelled = (a: Reading["camera"], b: Reading["camera"]): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe("reduced motion", () => {
  it("keeps the camera still, stages the sections and fades them", async () => {
    const o = await openReduced();
    expect(await o.page.evaluate(() => window.__toros?.motion().reducedMotion)).toBe(true);
    const start = await read(o);
    expect(start.active).toBe("s1");
    expect(start.sections.map((s) => s.visible)).toEqual([true, false, false]);

    const mid = await goTo(o, "ArrowDown", 0.5);
    const end = await goTo(o, "End", 1);
    for (const r of [mid, end]) expect(travelled(start.camera, r.camera)).toBeLessThan(1e-6);
    expect(mid.active).toBe("s2");
    expect(mid.sections.map((s) => s.visible)).toEqual([false, true, false]);
    expect(end.active).toBe("s3");
    expect(end.sections.map((s) => s.visible)).toEqual([false, false, true]);
    for (const r of [start, mid, end]) for (const s of r.sections) expect(s.z + 0).toBe(0);
    expect(mid.sections[1]?.opacity).toBeCloseTo(0.8, 3);
  });

  it("restores full motion and original opacities when the preference is turned off", async () => {
    const o = await openReduced();
    const frozen = await goTo(o, "End", 1);
    await o.page.emulateMedia({ reducedMotion: "no-preference" });
    await o.page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    await step(o.page, 120);
    const full = await read(o);
    expect(travelled(frozen.camera, full.camera)).toBeGreaterThan(5);
    expect(full.sections.map((s) => s.visible)).toEqual([true, true, true]);
    expect(full.sections.map((s) => s.z + 0)).toEqual([0, -10, -20]);
    for (const s of full.sections) {
      expect(s.opacity).toBeCloseTo(0.8, 5);
      expect(s.transparent).toBe(false);
    }
  });

  it('keeps full camera travel with mode "none"', async () => {
    const o = await openReduced({ mode: "none" });
    const start = await read(o);
    const end = await goTo(o, "End", 1);
    expect(travelled(start.camera, end.camera)).toBeGreaterThan(5);
    expect(end.sections.map((s) => s.visible)).toEqual([true, true, true]);
  });

  it("travels with no preference set", async () => {
    const o = await openReduced({}, false);
    const start = await read(o);
    const end = await goTo(o, "End", 1);
    expect(travelled(start.camera, end.camera)).toBeGreaterThan(5);
  });
});
