import type { ProgressController } from "./progress.js";

export interface InputOptions {
  wheelMultiplier?: number | undefined;
  touchMultiplier?: number | undefined;
  /** Pixels of gesture that move progress from 0 to 1. Default: the element's scroll length. */
  lengthPx?: (() => number) | undefined;
  /** Where keyboard listeners go. Default: the element's window. */
  keyboardTarget?: EventTarget | undefined;
}

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const INTERACTIVE = `a, button, ${EDITABLE}`;

function closestMatch(target: EventTarget | null, selector: string): boolean {
  const el = target as { closest?: (s: string) => unknown } | null;
  return typeof el?.closest === "function" && el.closest(selector) != null;
}

export function isEditable(target: EventTarget | null): boolean {
  return closestMatch(target, EDITABLE);
}

export function isInteractive(target: EventTarget | null): boolean {
  return closestMatch(target, INTERACTIVE);
}

export function scrollLength(el: HTMLElement): number {
  return Math.max(el.scrollHeight - el.clientHeight, el.clientHeight, 1);
}

export function gestureLength(el: HTMLElement, opts: InputOptions): number {
  return opts.lengthPx ? opts.lengthPx() : scrollLength(el);
}

/** True when the delta would move progress; false at the ends so the page can take the gesture. */
export function canConsume(controller: ProgressController, delta: number): boolean {
  if (delta === 0 || !Number.isFinite(delta)) return false;
  return delta < 0 ? controller.target > 0 : controller.target < 1;
}
