import { isEditable, isInteractive } from "./dom.js";
import type { ProgressController } from "./progress.js";

export type KeyAction = "next" | "prev" | "first" | "last";

export interface KeyLike {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export function keyToAction(e: KeyLike): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case "ArrowDown":
    case "PageDown":
      return "next";
    case "ArrowUp":
    case "PageUp":
      return "prev";
    case " ":
    case "Spacebar":
      return e.shiftKey ? "prev" : "next";
    case "Home":
      return "first";
    case "End":
      return "last";
    default:
      return null;
  }
}

/** Always on: keyboard users can always reach every beat. */
export function attachKeyboard(target: EventTarget, controller: ProgressController): () => void {
  const onKey = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.defaultPrevented || isEditable(e.target)) return;
    const action = keyToAction(e);
    if (action === null) return;
    if ((e.key === " " || e.key === "Spacebar") && isInteractive(e.target)) return;
    e.preventDefault();
    if (action === "next") controller.nextBeat("keyboard");
    else if (action === "prev") controller.prevBeat("keyboard");
    else if (action === "first") controller.goToBeat(0, "keyboard");
    else controller.goToBeat(controller.lastBeatIndex(), "keyboard");
  };
  target.addEventListener("keydown", onKey);
  return () => target.removeEventListener("keydown", onKey);
}
