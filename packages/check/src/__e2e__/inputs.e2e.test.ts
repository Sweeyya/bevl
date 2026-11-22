import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  centre,
  closeBrowser,
  DESKTOP,
  type Opened,
  open,
  PHONE,
  prevented,
  progress,
  recordPrevented,
  scrollLength,
  touchSwipe,
} from "./harness.js";

const opened: Opened[] = [];
async function openTracked(...args: Parameters<typeof open>): Promise<Opened> {
  const o = await open(...args);
  opened.push(o);
  return o;
}

afterEach(async () => {
  for (const o of opened.splice(0)) await o.context.close();
});
afterAll(closeBrowser);

const near = (actual: number, expected: number): void => expect(actual).toBeCloseTo(expected, 2);

async function waitProgress(o: Opened, expected: number): Promise<void> {
  await expect.poll(() => progress(o.page)).toBeCloseTo(expected, 2);
}

describe("wheel only", () => {
  it("moves progress, leaves the native scrollbar out of it, and passes through at the ends", async () => {
    const { page } = await openTracked("inputs", { fine: "wheel" });
    const length = await scrollLength(page);
    const scroller = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[data-doodley-scroller]");
      return el ? getComputedStyle(el).overflowY : "";
    });
    expect(scroller).toBe("hidden");

    await recordPrevented(page, ["wheel"]);
    const { x, y } = centre(page);
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, length * 0.3);
    await waitProgress({ page } as Opened, 0.3);
    await page.mouse.wheel(0, length * 0.3);
    await waitProgress({ page } as Opened, 0.6);
    expect(
      await page.evaluate(() => document.querySelector("[data-doodley-scroller]")?.scrollTop),
    ).toBe(0);

    await page.mouse.wheel(0, length * 2);
    await waitProgress({ page } as Opened, 1);
    await page.mouse.wheel(0, 100);
    await expect.poll(async () => (await prevented(page, "wheel")).length).toBe(4);
    expect(await prevented(page, "wheel")).toEqual([true, true, true, false]);

    await page.mouse.wheel(0, -length * 2);
    await waitProgress({ page } as Opened, 0);
    await page.mouse.wheel(0, -100);
    await expect.poll(async () => (await prevented(page, "wheel")).length).toBe(6);
    expect((await prevented(page, "wheel")).slice(4)).toEqual([true, false]);
  });
});

describe("touch on a phone", () => {
  it("is a coarse pointer and moves progress with real touch events", async () => {
    const o = await openTracked("inputs", { coarse: "touch" }, PHONE);
    const { page, context } = o;
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    const length = await scrollLength(page);

    await touchSwipe(context, page, 0, -length * 0.4);
    await waitProgress(o, 0.4);
    await touchSwipe(context, page, 0, length * 0.2);
    await waitProgress(o, 0.2);
  });

  it("does not trap the gesture at either end", async () => {
    const o = await openTracked("inputs", { coarse: "touch" }, PHONE);
    const { page, context } = o;
    const length = await scrollLength(page);
    await recordPrevented(page, ["touchmove"]);

    await touchSwipe(context, page, 0, -length * 2, 4);
    await waitProgress(o, 1);
    const before = (await prevented(page, "touchmove")).length;
    await touchSwipe(context, page, 0, -200, 4);
    const all = await prevented(page, "touchmove");
    expect(all.slice(before).some(Boolean)).toBe(false);
    near(await progress(page), 1);

    await touchSwipe(context, page, 0, length * 2, 4);
    await waitProgress(o, 0);
    const mark = (await prevented(page, "touchmove")).length;
    await touchSwipe(context, page, 0, 200, 4);
    expect((await prevented(page, "touchmove")).slice(mark).some(Boolean)).toBe(false);
  });

  it("settles on a beat after a swipe", async () => {
    const o = await openTracked("snap", { coarse: "touch", mode: "directional" }, PHONE);
    const { page, context } = o;
    const length = await scrollLength(page);
    await touchSwipe(context, page, 0, -length * 0.08);
    await waitProgress(o, 0.08);
    await page.evaluate(() => window.__doodley?.step(600));
    await waitProgress(o, 0.25);
  });
});

describe("mouse drag", () => {
  it("moves progress while dragging and ignores touch pointers", async () => {
    const o = await openTracked("inputs", { fine: "drag" });
    const { page } = o;
    const length = await scrollLength(page);
    const { x, y } = centre(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - length * 0.3, { steps: 10 });
    await page.mouse.up();
    await waitProgress(o, 0.3);
    await page.mouse.move(x, y);
    await page.mouse.move(x, y + 100, { steps: 5 });
    near(await progress(page), 0.3);
  });

  it("does not start on a button", async () => {
    const o = await openTracked("inputs", { fine: "drag" });
    const { page } = o;
    const box = await page.getByTestId("button").boundingBox();
    if (!box) throw new Error("no button");
    const bx = box.x + box.width / 2;
    const by = box.y + box.height / 2;
    await page.mouse.move(bx, by);
    await page.mouse.down();
    await page.mouse.move(bx, by - 200, { steps: 6 });
    await page.mouse.up();
    near(await progress(page), 0);
  });

  it("is not used by touch pointers", async () => {
    const o = await openTracked("inputs", { coarse: "drag" }, PHONE);
    await touchSwipe(o.context, o.page, 0, -300);
    near(await progress(o.page), 0);
  });
});

describe("horizontal swipe", () => {
  it("moves progress on horizontal swipes only", async () => {
    const o = await openTracked("inputs", { coarse: "swipe-x" }, PHONE);
    const { page, context } = o;
    const length = await scrollLength(page);
    expect(
      await page.evaluate(
        () => document.querySelector<HTMLElement>("[data-doodley-scroller]")?.style.touchAction,
      ),
    ).toBe("pan-y pinch-zoom");
    await recordPrevented(page, ["touchmove"]);

    await touchSwipe(context, page, 0, -length * 0.3);
    near(await progress(page), 0);
    expect((await prevented(page, "touchmove")).some(Boolean)).toBe(false);

    await touchSwipe(context, page, -length * 0.3, 0);
    await waitProgress(o, 0.3);
    await touchSwipe(context, page, length * 0.1, 0);
    await waitProgress(o, 0.2);
  });
});

describe("tap advance", () => {
  it("goes to the next beat and ignores links and buttons", async () => {
    const o = await openTracked("inputs", { fine: "tap-advance" });
    const { page } = o;
    const { x, y } = centre(page);
    await page.mouse.click(x, y);
    await waitProgress(o, 0.5);
    await page.getByTestId("link").click();
    await page.getByTestId("button").click();
    near(await progress(page), 0.5);
    await page.mouse.click(x, y);
    await waitProgress(o, 1);
    await page.mouse.click(x, y);
    near(await progress(page), 1);
  });

  it("does not treat a drag as a tap", async () => {
    const o = await openTracked("inputs", { fine: "tap-advance" });
    const { page } = o;
    const { x, y } = centre(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y, { steps: 4 });
    await page.mouse.up();
    near(await progress(page), 0);
  });

  it("works with a finger on a phone", async () => {
    const o = await openTracked("inputs", { coarse: "tap-advance" }, PHONE);
    const { x, y } = centre(o.page);
    await o.page.touchscreen.tap(x, y);
    await waitProgress(o, 0.5);
  });
});

describe("coarse vs fine selection", () => {
  const params = { fine: "wheel", coarse: "swipe-x" };
  const state = (page: Opened["page"]) =>
    page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[data-doodley-scroller]");
      return {
        coarse: matchMedia("(pointer: coarse)").matches,
        overflow: el ? getComputedStyle(el).overflowY : "",
        touchAction: el?.style.touchAction ?? "",
      };
    });

  it("uses the fine list on a desktop pointer", async () => {
    const { page } = await openTracked("inputs", params, DESKTOP);
    expect(await state(page)).toEqual({ coarse: false, overflow: "hidden", touchAction: "" });
  });

  it("uses the coarse list on a touch device", async () => {
    const { page } = await openTracked("inputs", params, PHONE);
    expect(await state(page)).toEqual({
      coarse: true,
      overflow: "hidden",
      touchAction: "pan-y pinch-zoom",
    });
  });

  it("keeps native scroll when scroll is listed for the pointer", async () => {
    const { page } = await openTracked("inputs", { fine: "scroll", coarse: "swipe-x" }, DESKTOP);
    expect((await state(page)).overflow).toBe("auto");
    const length = await scrollLength(page);
    const { x, y } = centre(page);
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, length * 0.5);
    await expect.poll(() => progress(page)).toBeCloseTo(0.5, 2);
  });
});
