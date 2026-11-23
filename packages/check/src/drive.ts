import type { Page } from "playwright";
import type { Finding } from "./report.js";
import type { RuleContext } from "./rule.js";

type Win = {
  __doodley?: {
    ready: Promise<void>;
    step(ms: number): unknown;
    scroll(): number;
    sections(): Array<{ id: string; anchor: number }>;
    choreography(): {
      allow?: { roll?: boolean; spin?: boolean; fastMoves?: boolean; reducedMotion?: boolean };
      reducedMotion?: { mode?: "fade" | "none" };
      snap?: { mode?: string; coarse?: { mode?: string } };
      beats?: Array<{ snap?: boolean }>;
      behaviors?: string[];
    };
    motion(): { reducedMotion: boolean };
    stats(): { drawCalls: number; triangles: number };
    camera(): {
      position: { x: number; y: number; z: number };
      quaternion: { x: number; y: number; z: number; w: number };
      up: { x: number; y: number; z: number };
      fov: number;
    };
  };
};

export const BEAT_EPSILON = 0.005;

const neverReady = new WeakSet<Page>();

export async function waitReady(page: Page, timeoutMs = 15_000): Promise<boolean> {
  if (neverReady.has(page)) return false;
  try {
    await page.waitForFunction(() => "__doodley" in window, undefined, { timeout: timeoutMs });
    return await page.evaluate(async () => {
      await (window as unknown as Win).__doodley?.ready;
      return true;
    });
  } catch {
    neverReady.add(page);
    return false;
  }
}

export function step(page: Page, frames: number): Promise<void> {
  return page.evaluate((n) => {
    (window as unknown as Win).__doodley?.step((n * 1000) / 60);
  }, frames);
}

export function progress(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as Win).__doodley?.scroll() ?? 0);
}

export async function beatAnchors(page: Page): Promise<number[]> {
  const sections = await page.evaluate(
    () => (window as unknown as Win).__doodley?.sections() ?? [],
  );
  return sections.map((s) => s.anchor);
}

export function choreography(
  page: Page,
): Promise<ReturnType<NonNullable<Win["__doodley"]>["choreography"]>> {
  return page.evaluate(() => (window as unknown as Win).__doodley?.choreography() ?? {});
}

export function reducedMotionOn(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as Win).__doodley?.motion().reducedMotion === true);
}

/** Waits two animation frames so React has applied a changed media query. */
export function nextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

export function stats(page: Page) {
  return page.evaluate(() => (window as unknown as Win).__doodley?.stats() ?? null);
}

/** Sets the scroller position and waits for the scroll event and a frame. False when there is nothing to scroll. */
export function scrollTo(page: Page, fraction: number): Promise<boolean> {
  return page.evaluate(async (f) => {
    const el = (document.querySelector<HTMLElement>("[data-doodley-scroller]") ??
      document.scrollingElement ??
      document.documentElement) as HTMLElement;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return false;
    el.scrollTop = f * max;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return true;
  }, fraction);
}

export type CameraPose = NonNullable<ReturnType<NonNullable<Win["__doodley"]>["camera"]>>;

export function cameraPose(page: Page): Promise<CameraPose | null> {
  return page.evaluate(() => (window as unknown as Win).__doodley?.camera() ?? null);
}

export function sectionPoses(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __doodley?: {
            sections(): Array<{ id: string; anchor: number; cameraPose: CameraPose }>;
          };
        }
      ).__doodley?.sections() ?? [],
  );
}

/** Scrolls from top to bottom in equal steps, one frame per step, and returns the camera pose at each. Null when it cannot scroll. */
export async function sweep(page: Page, steps: number): Promise<CameraPose[] | null> {
  const poses: CameraPose[] = [];
  for (let i = 0; i <= steps; i++) {
    if (!(await scrollTo(page, i / steps))) return null;
    await step(page, 1);
    const pose = await cameraPose(page);
    if (!pose) return null;
    poses.push(pose);
  }
  return poses;
}

/** Error finding for a rule that could not run, so a rule never passes silently. */
export function couldNotRun(ctx: RuleContext, rule: string, why: string): Finding {
  return finding(
    ctx,
    rule,
    "error",
    `Could not run ${rule} on ${ctx.viewport.name}: ${why}.`,
    "Fix: make sure the site loads in test mode (window.__doodley exists and ready resolves) and has a [data-doodley-scroller] taller than the viewport.",
  );
}

/** Presses Home, then ArrowDown to each beat, ArrowUp back, End and Home. Returns what went wrong. */
export async function walkBeatsByKeyboard(page: Page, beats: number[]): Promise<string[]> {
  const last = beats.length - 1;
  const problems: string[] = [];
  const press = async (key: string, index: number, label: string): Promise<void> => {
    await page.keyboard.press(key);
    await step(page, 20);
    const p = await progress(page);
    if (!onBeat(beats, p) || !onBeat([beats[index] ?? 0], p))
      problems.push(`${label}: expected beat ${index}, progress is ${p.toFixed(3)}`);
  };
  await press("Home", 0, "Home");
  for (let i = 1; i <= last; i++) await press("ArrowDown", i, `ArrowDown to beat ${i}`);
  for (let i = last - 1; i >= 0; i--) await press("ArrowUp", i, `ArrowUp to beat ${i}`);
  await press("End", last, "End");
  await press("Home", 0, "Home");
  return problems;
}

export const NOT_READY = "the test bridge did not become ready";
export const NO_SCROLL = "there is nothing to scroll";

export function onBeat(beats: number[], p: number): boolean {
  return beats.some((b) => Math.abs(b - p) <= BEAT_EPSILON);
}

export function finding(
  ctx: RuleContext,
  rule: string,
  severity: Finding["severity"],
  message: string,
  fix: string,
  data?: Record<string, unknown>,
): Finding {
  return {
    rule,
    severity,
    viewport: ctx.viewport.name,
    message,
    fix,
    ...(data ? { evidence: { data } } : {}),
  };
}

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };
export type Pose = { position: Vec3; quaternion: Quat };

export async function requireCameraPose(page: Page): Promise<Pose> {
  const pose = await cameraPose(page);
  if (!pose) throw new Error("The doodley bridge is missing");
  return { position: pose.position, quaternion: pose.quaternion };
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function angleDeg(a: Quat, b: Quat): number {
  const dot = Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w));
  return 2 * Math.acos(dot) * (180 / Math.PI);
}
