import { type Browser, type BrowserContext, chromium, type Page } from "playwright";
import { inject } from "vitest";

export type InputParams = Record<string, string>;

let browser: Browser | undefined;

export async function launch(): Promise<Browser> {
  browser ??= await chromium.launch();
  return browser;
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = undefined;
}

export const DESKTOP = { viewport: { width: 1280, height: 720 } } as const;
export const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
} as const;

export interface Opened {
  context: BrowserContext;
  page: Page;
}

export async function open(
  fixture: string,
  params: InputParams = {},
  options: Parameters<Browser["newContext"]>[0] = DESKTOP,
  testMode = true,
): Promise<Opened> {
  const context = await (await launch()).newContext(options);
  const page = await context.newPage();
  const query = new URLSearchParams({ fixture, ...params });
  const test = testMode ? "&bevl-test" : "";
  await page.goto(`${inject("baseUrl")}/?${query}${test}`);
  if (testMode) {
    await page.waitForFunction(() => "__bevl" in window);
    await page.evaluate(() => window.__bevl?.ready);
  } else {
    await page.waitForFunction(() => "__e2e" in window);
  }
  return { context, page };
}

declare global {
  interface Window {
    __bevl?: {
      ready: Promise<void>;
      step(ms: number): unknown;
      scroll(): number;
      camera(): { position: { x: number; y: number; z: number } };
      motion(): { reducedMotion: boolean };
    };
    __e2e: {
      scene: { getObjectByName(n: string): unknown };
      displayed(): number;
    };
  }
}

export const displayed = (page: Page): Promise<number> =>
  page.evaluate(() => window.__e2e.displayed());

export const progress = (page: Page): Promise<number> =>
  page.evaluate(() => window.__bevl?.scroll() ?? Number.NaN);

export async function step(page: Page, ms: number): Promise<void> {
  await page.evaluate((t) => window.__bevl?.step(t), ms);
}

export const scrollLength = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const el = document.querySelector("[data-bevl-scroller]");
    return el ? el.scrollHeight - el.clientHeight : 0;
  });

export function centre(page: Page): { x: number; y: number } {
  const v = page.viewportSize();
  return { x: (v?.width ?? 0) / 2, y: (v?.height ?? 0) / 2 };
}

/** Real touch events through CDP. dy < 0 moves the finger up. */
export async function touchSwipe(
  context: BrowserContext,
  page: Page,
  dx: number,
  dy: number,
  steps = 8,
): Promise<void> {
  const cdp = await context.newCDPSession(page);
  const { x, y } = centre(page);
  const send = (
    type: "touchStart" | "touchMove" | "touchEnd",
    px?: number,
    py?: number,
  ): Promise<unknown> =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: px === undefined || py === undefined ? [] : [{ x: px, y: py }],
    });
  await send("touchStart", x, y);
  for (let i = 1; i <= steps; i++)
    await send("touchMove", x + (dx * i) / steps, y + (dy * i) / steps);
  await send("touchEnd");
  await cdp.detach();
}

/** Records, per event type, whether each event was default-prevented by the page. */
export async function recordPrevented(page: Page, types: string[]): Promise<void> {
  await page.evaluate((list) => {
    const w = window as unknown as { __prevented: Record<string, boolean[]> };
    w.__prevented = {};
    for (const t of list) {
      w.__prevented[t] = [];
      window.addEventListener(t, (e) => w.__prevented[t]?.push(e.defaultPrevented), {
        passive: true,
        capture: false,
      });
    }
  }, types);
}

export const prevented = (page: Page, type: string): Promise<boolean[]> =>
  page.evaluate(
    (t) => (window as unknown as { __prevented: Record<string, boolean[]> }).__prevented[t] ?? [],
    type,
  );
