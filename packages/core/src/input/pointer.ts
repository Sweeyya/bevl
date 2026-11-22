import { canConsume, gestureLength, type InputOptions, isInteractive } from "./dom.js";
import { normalizeWheel, pxToProgress } from "./normalize.js";
import type { ProgressController } from "./progress.js";

const TAP_SLOP_PX = 6;

type Detach = () => void;

function listen<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  type: K,
  fn: (e: HTMLElementEventMap[K]) => void,
  passive: boolean,
): Detach {
  el.addEventListener(type, fn, { passive });
  return () => el.removeEventListener(type, fn);
}

function combine(detachers: Detach[]): Detach {
  return () => {
    for (const d of detachers) d();
  };
}

export function attachWheel(
  el: HTMLElement,
  controller: ProgressController,
  opts: InputOptions = {},
): Detach {
  const mult = opts.wheelMultiplier ?? 1;
  return listen(
    el,
    "wheel",
    (e) => {
      const { y } = normalizeWheel(e, el.clientHeight);
      const delta = pxToProgress(y * mult, gestureLength(el, opts));
      if (!canConsume(controller, delta)) return;
      e.preventDefault();
      controller.nudge(delta, "wheel");
    },
    false,
  );
}

export function attachTouch(
  el: HTMLElement,
  controller: ProgressController,
  opts: InputOptions = {},
): Detach {
  const mult = opts.touchMultiplier ?? 1;
  let last: { x: number; y: number } | null = null;
  const end = (): void => {
    last = null;
  };
  return combine([
    listen(
      el,
      "touchstart",
      (e) => {
        const t = e.touches.length === 1 ? e.touches[0] : undefined;
        last = t ? { x: t.clientX, y: t.clientY } : null;
      },
      true,
    ),
    listen(
      el,
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (!last || !t || e.touches.length !== 1) return;
        const dx = t.clientX - last.x;
        const dy = t.clientY - last.y;
        last = { x: t.clientX, y: t.clientY };
        if (Math.abs(dy) < Math.abs(dx)) return;
        const delta = pxToProgress(-dy * mult, gestureLength(el, opts));
        if (!canConsume(controller, delta)) return;
        if (e.cancelable) e.preventDefault();
        controller.nudge(delta, "touch");
      },
      false,
    ),
    listen(el, "touchend", end, true),
    listen(el, "touchcancel", end, true),
  ]);
}

interface PointerGesture {
  id: number;
  x: number;
  y: number;
}

function capture(el: HTMLElement, id: number): void {
  try {
    el.setPointerCapture?.(id);
  } catch {
    // Pointer already released.
  }
}

/** Tracks one pointer and reports per-move deltas. */
function attachPointerGesture(
  el: HTMLElement,
  accept: (e: PointerEvent) => boolean,
  onMove: (dx: number, dy: number) => void,
): Detach {
  let g: PointerGesture | null = null;
  const end = (e: PointerEvent): void => {
    if (g && e.pointerId === g.id) g = null;
  };
  return combine([
    listen(
      el,
      "pointerdown",
      (e) => {
        if (!e.isPrimary || e.button !== 0 || isInteractive(e.target) || !accept(e)) return;
        g = { id: e.pointerId, x: e.clientX, y: e.clientY };
        capture(el, e.pointerId);
      },
      true,
    ),
    listen(
      el,
      "pointermove",
      (e) => {
        if (!g || e.pointerId !== g.id) return;
        const dx = e.clientX - g.x;
        const dy = e.clientY - g.y;
        g.x = e.clientX;
        g.y = e.clientY;
        onMove(dx, dy);
      },
      true,
    ),
    listen(el, "pointerup", end, true),
    listen(el, "pointercancel", end, true),
  ]);
}

export function attachDrag(
  el: HTMLElement,
  controller: ProgressController,
  opts: InputOptions = {},
): Detach {
  const mult = opts.touchMultiplier ?? 1;
  return attachPointerGesture(
    el,
    (e) => e.pointerType === "mouse",
    (_dx, dy) => controller.nudge(pxToProgress(-dy * mult, gestureLength(el, opts)), "drag"),
  );
}

/** Horizontal swipe. Vertical pans stay with the browser via touch-action. */
export function attachSwipeX(
  el: HTMLElement,
  controller: ProgressController,
  opts: InputOptions = {},
): Detach {
  const mult = opts.touchMultiplier ?? 1;
  const style = (el as { style?: CSSStyleDeclaration }).style;
  const previousTouchAction = style?.touchAction ?? "";
  if (style) style.touchAction = "pan-y pinch-zoom";
  const detach = attachPointerGesture(
    el,
    () => true,
    (dx, dy) => {
      if (Math.abs(dx) <= Math.abs(dy)) return;
      controller.nudge(pxToProgress(-dx * mult, gestureLength(el, opts)), "swipe-x");
    },
  );
  return () => {
    detach();
    if (style) style.touchAction = previousTouchAction;
  };
}

export function attachTapAdvance(el: HTMLElement, controller: ProgressController): Detach {
  let down: { x: number; y: number } | null = null;
  return combine([
    listen(
      el,
      "pointerdown",
      (e) => {
        down = { x: e.clientX, y: e.clientY };
      },
      true,
    ),
    listen(
      el,
      "click",
      (e) => {
        const start = down;
        down = null;
        if (e.defaultPrevented || isInteractive(e.target)) return;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return;
        controller.nextBeat("tap-advance");
      },
      true,
    ),
  ]);
}
