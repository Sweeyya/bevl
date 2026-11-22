// Rule: scroll/snap-no-trap
// Pass: from every beat, keyboard and wheel input can reach the next and the previous beat
import type { Page } from "playwright";
import {
  BEAT_EPSILON,
  beatAnchors,
  couldNotRun,
  NOT_READY,
  progress,
  step,
  waitReady,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const SETTLE_FRAMES = 20;
const GESTURE_FRAMES = 2;
const MAX_WHEELS = 40;
const WHEEL_VIEWPORTS = 1.2;
const PAINT_FRAMES = 4;

function paint(page: Page): Promise<void> {
  return page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
  }, PAINT_FRAMES);
}

async function goTo(page: Page, beats: number[], index: number): Promise<boolean> {
  await page.keyboard.press("Home");
  for (let i = 0; i < index; i++) {
    await page.keyboard.press("ArrowDown");
    await step(page, SETTLE_FRAMES);
  }
  await step(page, SETTLE_FRAMES);
  return Math.abs((await progress(page)) - (beats[index] ?? 0)) <= BEAT_EPSILON;
}

function pastHalfway(beats: number[], from: number, dir: 1 | -1, rest: number): boolean {
  const here = beats[from] ?? 0;
  const gap = Math.abs((beats[from + dir] ?? here) - here);
  return (rest - here) * dir >= 0.5 * gap;
}

async function leftBeat(page: Page, beats: number[], from: number, dir: 1 | -1): Promise<boolean> {
  return pastHalfway(beats, from, dir, await progress(page));
}

async function keyboardLeaves(page: Page, beats: number[], from: number, dir: 1 | -1) {
  await page.keyboard.press(dir === 1 ? "ArrowDown" : "ArrowUp");
  await step(page, SETTLE_FRAMES);
  return leftBeat(page, beats, from, dir);
}

async function wheelLeaves(page: Page, beats: number[], from: number, dir: 1 | -1) {
  const size = page.viewportSize() ?? { width: 1000, height: 800 };
  await page.mouse.move(size.width / 2, size.height / 2);
  for (let n = 0; n < MAX_WHEELS; n++) {
    await page.mouse.wheel(0, dir * WHEEL_VIEWPORTS * size.height);
    await paint(page);
    await step(page, GESTURE_FRAMES);
    if (pastHalfway(beats, from, dir, await progress(page))) break;
  }
  await paint(page);
  await step(page, SETTLE_FRAMES);
  return leftBeat(page, beats, from, dir);
}

const rule: Rule = {
  id: "scroll/snap-no-trap",
  group: "scroll",
  severity: "error",
  description: "Every beat must be leavable in both directions by keyboard and by wheel.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const beats = [...(await beatAnchors(ctx.page))].sort((a, b) => a - b);
    if (beats.length === 0) return [couldNotRun(ctx, this.id, "the bridge reports no sections")];
    const trapped: string[] = [];
    for (let i = 0; i < beats.length; i++) {
      for (const dir of [1, -1] as const) {
        if (beats[i + dir] === undefined) continue;
        const label = `beat ${i} ${dir === 1 ? "forward" : "back"}`;
        for (const [how, leaves] of [
          ["keyboard", keyboardLeaves],
          ["wheel", wheelLeaves],
        ] as const) {
          if (!(await goTo(ctx.page, beats, i))) {
            return [couldNotRun(ctx, this.id, `the keyboard could not reach beat ${i} to test it`)];
          }
          if (!(await leaves(ctx.page, beats, i, dir))) trapped.push(`${label} (${how})`);
        }
      }
    }
    if (trapped.length === 0) return [];
    return [
      {
        rule: "scroll/snap-no-trap",
        severity: "error",
        viewport: ctx.viewport.name,
        message: `Visitors get stuck on ${ctx.viewport.name}: ${trapped.join(", ")}.`,
        fix: 'Fix: make sure snapping never pulls progress back to the same beat. Lower snap.commit, raise input.wheelMultiplier, or use snap mode "directional".',
        evidence: { data: { trapped } },
      },
    ];
  },
};

export default rule;
