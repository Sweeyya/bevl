import type { Page } from "playwright";
import type { RuleContext } from "../../rule.js";

type Pose = {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
};

export interface FakeSiteOptions {
  beats?: number[];
  bridge?: boolean;
  scroller?: boolean;
  maxScroll?: number;
  allow?: { roll?: boolean; spin?: boolean; fastMoves?: boolean };
  behaviors?: string[];
  beatSnap?: Array<boolean | undefined>;
  /** Maps scroll progress to the camera pose. Default: flies along -Z. */
  pose?: (progress: number) => Pose;
  /** The live camera, when it should differ from the choreography pose. */
  camera?: (progress: number) => Pose;
  /** Maps progress after each stepped frame, to model snapping. Default: none. */
  settle?: (progress: number) => number;
  stats?: { triangles: number; drawCalls: number };
  brand?: { colors: Record<string, string> } | null;
  materials?: { name: string; colors: string[] }[];
  /** Section DOM anchors that exist. Default: all. */
  domIds?: string[];
  /** Keys the page ignores. */
  deadKeys?: string[];
  /** Moves progress for a wheel gesture. Default: scrolls by deltaY. */
  onWheel?: (site: FakeSite, deltaY: number) => void;
  consoleErrors?: string[];
  title?: string;
  /** Replaces evaluate entirely, for code that needs a real browser. */
  evaluate?: (fn: unknown, arg: unknown) => unknown;
  screenshot?: Buffer | Error;
  browser?: { newContext(): Promise<unknown> } | null;
  viewport?: { name?: string; isMobile?: boolean };
}

export const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
export const flyForward = (p: number): Pose => ({
  position: { x: 0, y: 0, z: -10 * p },
  quaternion: IDENTITY,
});

export class FakeSite {
  scrollTop = 0;
  progress = 0;
  frames = 0;
  readonly beats: number[];
  readonly max: number;
  private readonly window: Record<string, unknown> = {};
  private readonly document: Record<string, unknown>;

  constructor(readonly opts: FakeSiteOptions = {}) {
    this.beats = opts.beats ?? [0, 0.5, 1];
    this.max = opts.maxScroll ?? 1000;
    const site = this;
    const scroller = {
      get scrollTop() {
        return site.scrollTop;
      },
      set scrollTop(v: number) {
        site.scrollTop = v;
        site.progress = v / site.max;
      },
      scrollHeight: this.max + 800,
      clientHeight: 800,
    };
    const ids = opts.domIds ?? this.beats.map((_, i) => `s${i}`);
    this.document = {
      title: opts.title ?? "Site",
      querySelector: (sel: string) =>
        sel === "[data-toros-scroller]" && opts.scroller !== false ? scroller : null,
      getElementById: (id: string) => (ids.includes(id.replace("section-", "")) ? {} : null),
      scrollingElement: null,
      documentElement: { scrollTop: 0, scrollHeight: 0, clientHeight: 0 },
    };
    this.window.__torosConsoleErrors = opts.consoleErrors ?? [];
    if (opts.bridge !== false) this.window.__toros = this.makeBridge();
  }

  private makeBridge() {
    const pose = this.opts.pose ?? flyForward;
    return {
      ready: Promise.resolve(),
      step: (ms: number) => {
        this.frames += Math.max(1, Math.round(ms / (1000 / 60)));
        if (this.opts.settle) this.moveTo(this.opts.settle(this.progress));
        return { time: 0, frame: this.frames };
      },
      scroll: () => this.progress,
      sections: () =>
        this.beats.map((anchor, index) => ({
          id: `s${index}`,
          index,
          anchor,
          cameraPose: pose(anchor),
          domId: `section-s${index}`,
        })),
      choreography: () => ({
        allow: this.opts.allow ?? {},
        behaviors: this.opts.behaviors ?? [],
        beats: this.beats.map((_, i) => ({ snap: this.opts.beatSnap?.[i] })),
      }),
      camera: () => ({
        ...(this.opts.camera ?? pose)(this.progress),
        up: { x: 0, y: 1, z: 0 },
        fov: 60,
      }),
      stats: () => this.opts.stats ?? { triangles: 100, drawCalls: 10 },
      brand: () => this.opts.brand ?? null,
      materials: () => this.opts.materials ?? [],
    };
  }

  moveTo(progress: number): void {
    this.progress = progress;
    this.scrollTop = progress * this.max;
  }

  press(key: string): void {
    if (this.opts.deadKeys?.includes(key)) return;
    const sorted = [...this.beats].sort((a, b) => a - b);
    const nearest = sorted.findIndex((b) => Math.abs(b - this.progress) < 0.01);
    const at = Math.max(nearest, 0);
    const target =
      key === "Home"
        ? 0
        : key === "End"
          ? sorted.length - 1
          : key === "ArrowDown"
            ? Math.min(sorted.length - 1, at + 1)
            : key === "ArrowUp"
              ? Math.max(0, at - 1)
              : at;
    this.moveTo(sorted[target] ?? 0);
  }

  wheel(deltaY: number): void {
    if (this.opts.onWheel) this.opts.onWheel(this, deltaY);
    else this.moveTo(Math.min(1, Math.max(0, this.progress + deltaY / 2000)));
  }

  install(): void {
    Object.assign(globalThis, {
      window: this.window,
      document: this.document,
      requestAnimationFrame: (cb: (t: number) => void) => {
        cb(0);
        return 0;
      },
    });
  }

  page(): Page {
    const page = {
      evaluate: async (fn: (arg: unknown) => unknown, arg: unknown) => {
        this.install();
        if (this.opts.evaluate) return this.opts.evaluate(fn, arg);
        return fn(arg);
      },
      waitForFunction: async (fn: (arg: unknown) => unknown, arg: unknown) => {
        this.install();
        if (!fn(arg)) throw new Error("timeout");
      },
      screenshot: async () => {
        if (this.opts.screenshot instanceof Error) throw this.opts.screenshot;
        return this.opts.screenshot ?? Buffer.from("png");
      },
      goto: async () => undefined,
      keyboard: { press: async (key: string) => this.press(key) },
      mouse: { move: async () => undefined, wheel: async (_x: number, y: number) => this.wheel(y) },
      viewportSize: () => ({ width: 1000, height: 800 }),
      context: () => ({ browser: () => this.opts.browser ?? null }),
    };
    return page as unknown as Page;
  }

  context(): RuleContext {
    return {
      page: this.page(),
      viewport: {
        name: this.opts.viewport?.name ?? "desktop",
        width: 1000,
        height: 800,
        isMobile: this.opts.viewport?.isMobile ?? false,
      },
      url: "http://127.0.0.1/",
      projectDir: ".",
    };
  }
}

const globals = ["window", "document", "requestAnimationFrame"] as const;
const saved = new Map<string, PropertyDescriptor | undefined>();

export function snapshotGlobals(): void {
  for (const g of globals) saved.set(g, Object.getOwnPropertyDescriptor(globalThis, g));
}

export function restoreGlobals(): void {
  for (const g of globals) {
    const d = saved.get(g);
    if (d) Object.defineProperty(globalThis, g, d);
    else delete (globalThis as Record<string, unknown>)[g];
  }
}
