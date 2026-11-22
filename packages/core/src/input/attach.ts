import type { InputKind } from "../choreography/types.js";
import type { InputOptions } from "./dom.js";
import { attachKeyboard } from "./keyboard.js";
import { attachDrag, attachSwipeX, attachTapAdvance, attachTouch, attachWheel } from "./pointer.js";
import type { ProgressController } from "./progress.js";
import { attachScroll } from "./scroll.js";

type Attacher = (el: HTMLElement, controller: ProgressController, opts: InputOptions) => () => void;

const ATTACHERS: Record<InputKind, Attacher> = {
  scroll: attachScroll,
  wheel: attachWheel,
  touch: attachTouch,
  drag: attachDrag,
  "swipe-x": attachSwipeX,
  "tap-advance": attachTapAdvance,
};

/** Attaches the listed inputs plus the keyboard, which is always on. */
export function attachInputs(
  el: HTMLElement,
  controller: ProgressController,
  kinds: readonly InputKind[],
  opts: InputOptions = {},
): () => void {
  const detachers = [...new Set(kinds)].map((k) => ATTACHERS[k](el, controller, opts));
  const keyTarget = opts.keyboardTarget ?? el.ownerDocument?.defaultView ?? el;
  detachers.push(attachKeyboard(keyTarget, controller));
  return () => {
    for (const d of detachers) d();
  };
}
