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
      allow?: { roll?: boolean; spin?: boolean; fastMoves?: boolean };
      snap?: { mode?: string; coarse?: { mode?: string } };
    };
    camera(): {
      position: { x: number; y: number; z: number };
      quaternion: { x: number; y: number; z: number; w: number };
    };
  };
};

export const BEAT_EPSILON = 0.005;

export async function waitReady(page: Page, timeoutMs = 15_000): Promise<boolean> {
  try {
    await page.waitForFunction(() => "__doodley" in window, undefined, { timeout: timeoutMs });
    return await page.evaluate(async () => {
      await (window as unknown as Win).__doodley?.ready;
      return true;
    });
  } catch {
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

export function choreography(page: Page) {
  return page.evaluate(() => (window as unknown as Win).__doodley?.choreography() ?? {});
}

/** Sets the scroller position and waits for the browser to deliver the scroll event. */
export function scrollTo(page: Page, fraction: number): Promise<void> {
  return page.evaluate(async (f) => {
    const el = document.querySelector<HTMLElement>("[data-doodley-scroller]");
    if (!el) return;
    el.scrollTop = f * (el.scrollHeight - el.clientHeight);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, fraction);
}

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
