import type { ProgressController } from "./progress.js";

const expectedTop = new WeakMap<HTMLElement, number>();

function maxScroll(el: HTMLElement): number {
  return el.scrollHeight - el.clientHeight;
}

/** Moves the native scrollbar to progress p without feeding the change back as a scroll input. */
export function syncScroll(el: HTMLElement, p: number): void {
  const max = maxScroll(el);
  if (max <= 0) return;
  const top = Math.round(Math.min(1, Math.max(0, p)) * max);
  if (Math.abs(el.scrollTop - top) < 1) return;
  expectedTop.set(el, top);
  el.scrollTop = top;
}

export function attachScroll(el: HTMLElement, controller: ProgressController): () => void {
  const onScroll = (): void => {
    const expected = expectedTop.get(el);
    if (expected !== undefined) {
      expectedTop.delete(el);
      if (Math.abs(el.scrollTop - expected) <= 1) return;
    }
    const max = maxScroll(el);
    controller.setTarget(max <= 0 ? 0 : el.scrollTop / max, "scroll");
  };
  el.addEventListener("scroll", onScroll, { passive: true });
  const unlisten = controller.listen((target, source) => {
    if (source !== "scroll") syncScroll(el, target);
  });
  return () => {
    el.removeEventListener("scroll", onScroll);
    unlisten();
  };
}
