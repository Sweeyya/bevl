import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeBrowser, type Opened, open, progress, step } from "./harness.js";

const opened: Opened[] = [];
afterEach(async () => {
  for (const o of opened.splice(0)) await o.context.close();
});
afterAll(closeBrowser);

interface Readout {
  spinnerY: number;
  opacity: number;
  liftY: number;
  cameraZ: number;
}

const read = (o: Opened): Promise<Readout> =>
  o.page.evaluate(() => {
    const scene = window.__e2e.scene as unknown as {
      getObjectByName(n: string): {
        rotation: { y: number };
        position: { y: number };
        material: { opacity: number };
      };
    };
    return {
      spinnerY: scene.getObjectByName("spinner").rotation.y,
      opacity: scene.getObjectByName("ghost").material.opacity,
      liftY: scene.getObjectByName("lifter").position.y,
      cameraZ: window.__bevl?.camera().position.z ?? Number.NaN,
    };
  });

describe("custom choreography", () => {
  it("drives a named object's properties and a registered behavior as progress moves", async () => {
    const o = await open("tracks");
    opened.push(o);
    const { page } = o;
    await step(page, 100);
    const start = await read(o);
    expect(start).toMatchObject({ spinnerY: 0, opacity: 1, liftY: 0 });

    await page.keyboard.press("ArrowDown");
    await expect.poll(() => progress(page)).toBeCloseTo(0.5, 3);
    await step(page, 100);
    const mid = await read(o);
    expect(mid.spinnerY).toBeCloseTo(1.5, 3);
    expect(mid.opacity).toBeCloseTo(0.5, 3);
    expect(mid.liftY).toBeCloseTo(2, 3);
    expect(mid.cameraZ).not.toBeCloseTo(start.cameraZ, 1);

    await page.keyboard.press("End");
    await expect.poll(() => progress(page)).toBeCloseTo(1, 3);
    await step(page, 100);
    const end = await read(o);
    expect(end.spinnerY).toBeCloseTo(3, 3);
    expect(end.opacity).toBeCloseTo(0, 3);
    expect(end.liftY).toBeCloseTo(4, 3);

    await page.keyboard.press("Home");
    await expect.poll(() => progress(page)).toBeCloseTo(0, 3);
    await step(page, 100);
    expect(await read(o)).toMatchObject({ spinnerY: 0, opacity: 1, liftY: 0 });
  });
});
