import { describe, expect, it } from "vitest";
import { attachInputs } from "../input/attach.js";
import { attachKeyboard, keyToAction } from "../input/keyboard.js";
import { attachSwipeX, attachTapAdvance, attachWheel } from "../input/pointer.js";
import { ProgressController } from "../input/progress.js";
import { attachScroll, syncScroll } from "../input/scroll.js";

type Handler = (e: unknown) => void;

class FakeEl {
  scrollTop = 0;
  scrollHeight = 1400;
  clientHeight = 400;
  style = { touchAction: "" };
  listeners = new Map<string, Set<Handler>>();
  addEventListener(type: string, fn: Handler): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(fn);
  }
  removeEventListener(type: string, fn: Handler): void {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type: string, init: Record<string, unknown> = {}): { prevented: boolean } {
    const result = { prevented: false };
    const e = {
      defaultPrevented: false,
      cancelable: true,
      preventDefault() {
        result.prevented = true;
        e.defaultPrevented = true;
      },
      ...init,
    };
    for (const fn of this.listeners.get(type) ?? []) fn(e);
    return result;
  }
  count(): number {
    let n = 0;
    for (const s of this.listeners.values()) n += s.size;
    return n;
  }
}

const node = (selectorMatch: string | null) => ({
  closest: (sel: string) => (selectorMatch && sel.includes(selectorMatch) ? {} : null),
});

const asEl = (f: FakeEl) => f as unknown as HTMLElement;

describe("keyboard", () => {
  it("maps keys to actions", () => {
    expect(keyToAction({ key: "ArrowDown" })).toBe("next");
    expect(keyToAction({ key: "PageDown" })).toBe("next");
    expect(keyToAction({ key: " " })).toBe("next");
    expect(keyToAction({ key: "ArrowUp" })).toBe("prev");
    expect(keyToAction({ key: "PageUp" })).toBe("prev");
    expect(keyToAction({ key: " ", shiftKey: true })).toBe("prev");
    expect(keyToAction({ key: "Home" })).toBe("first");
    expect(keyToAction({ key: "End" })).toBe("last");
    expect(keyToAction({ key: "a" })).toBeNull();
    expect(keyToAction({ key: "ArrowDown", ctrlKey: true })).toBeNull();
    expect(keyToAction({ key: "ArrowDown", metaKey: true })).toBeNull();
    expect(keyToAction({ key: "ArrowDown", altKey: true })).toBeNull();
  });

  it("moves between beats and prevents default", () => {
    const t = new FakeEl();
    const c = new ProgressController([0, 0.25, 0.5, 1]);
    const off = attachKeyboard(t as unknown as EventTarget, c);
    expect(t.dispatch("keydown", { key: "ArrowDown", target: node(null) }).prevented).toBe(true);
    expect(c.target).toBe(0.25);
    t.dispatch("keydown", { key: "End", target: node(null) });
    expect(c.target).toBe(1);
    t.dispatch("keydown", { key: "PageUp", target: node(null) });
    expect(c.target).toBe(0.5);
    t.dispatch("keydown", { key: "Home", target: node(null) });
    expect(c.target).toBe(0);
    off();
    expect(t.count()).toBe(0);
  });

  it("ignores keys typed in form fields", () => {
    const t = new FakeEl();
    const c = new ProgressController([0, 1]);
    attachKeyboard(t as unknown as EventTarget, c);
    for (const field of ["input", "textarea", "select", "[contenteditable]"]) {
      const r = t.dispatch("keydown", { key: "ArrowDown", target: node(field) });
      expect(r.prevented).toBe(false);
    }
    expect(c.target).toBe(0);
  });

  it("leaves Space alone on buttons and links", () => {
    const t = new FakeEl();
    const c = new ProgressController([0, 1]);
    attachKeyboard(t as unknown as EventTarget, c);
    expect(t.dispatch("keydown", { key: " ", target: node("button") }).prevented).toBe(false);
    expect(c.target).toBe(0);
  });
});

describe("swipe-x", () => {
  const down = { isPrimary: true, button: 0, pointerId: 1, clientX: 200, clientY: 200 };

  it("only consumes horizontal moves", () => {
    const el = new FakeEl();
    const c = new ProgressController();
    const off = attachSwipeX(asEl(el), c);
    expect(el.style.touchAction).toBe("pan-y pinch-zoom");
    el.dispatch("pointerdown", { ...down, target: node(null) });
    el.dispatch("pointermove", { pointerId: 1, clientX: 195, clientY: 300 });
    expect(c.target).toBe(0);
    el.dispatch("pointermove", { pointerId: 1, clientX: 95, clientY: 310 });
    expect(c.target).toBe(0.1);
    el.dispatch("pointerup", { pointerId: 1 });
    el.dispatch("pointermove", { pointerId: 1, clientX: 0, clientY: 310 });
    expect(c.target).toBe(0.1);
    off();
    expect(el.style.touchAction).toBe("");
    expect(el.count()).toBe(0);
  });

  it("ignores gestures starting on interactive elements", () => {
    const el = new FakeEl();
    const c = new ProgressController();
    attachSwipeX(asEl(el), c);
    el.dispatch("pointerdown", { ...down, target: node("a") });
    el.dispatch("pointermove", { pointerId: 1, clientX: 0, clientY: 200 });
    expect(c.target).toBe(0);
  });
});

describe("wheel", () => {
  it("consumes only when progress can move", () => {
    const el = new FakeEl();
    const c = new ProgressController();
    attachWheel(asEl(el), c, { wheelMultiplier: 2 });
    expect(el.dispatch("wheel", { deltaX: 0, deltaY: -50, deltaMode: 0 }).prevented).toBe(false);
    expect(el.dispatch("wheel", { deltaX: 0, deltaY: 50, deltaMode: 0 }).prevented).toBe(true);
    expect(c.target).toBe(0.1);
    const zoom = el.dispatch("wheel", { deltaX: 0, deltaY: 50, deltaMode: 0, ctrlKey: true });
    expect(zoom.prevented).toBe(false);
    expect(c.target).toBe(0.1);
  });
});

describe("tap-advance", () => {
  it("advances on a tap but not after a drag or on links", () => {
    const el = new FakeEl();
    const c = new ProgressController([0, 0.5, 1]);
    attachTapAdvance(asEl(el), c);
    el.dispatch("pointerdown", { clientX: 10, clientY: 10 });
    el.dispatch("click", { clientX: 12, clientY: 12, target: node(null) });
    expect(c.target).toBe(0.5);
    el.dispatch("pointerdown", { clientX: 10, clientY: 10 });
    el.dispatch("click", { clientX: 30, clientY: 10, target: node(null) });
    expect(c.target).toBe(0.5);
    el.dispatch("click", { clientX: 0, clientY: 0, target: node("a") });
    expect(c.target).toBe(0.5);
  });
});

describe("scroll", () => {
  it("reads scrollTop and follows other inputs without feedback", () => {
    const el = new FakeEl();
    const c = new ProgressController([0, 0.5, 1]);
    attachScroll(asEl(el), c);
    el.scrollTop = 250;
    el.dispatch("scroll");
    expect(c.target).toBe(0.25);
    c.nextBeat("keyboard");
    expect(el.scrollTop).toBe(500);
    const seen: string[] = [];
    c.listen((_t, s) => seen.push(s));
    el.dispatch("scroll");
    expect(seen).toEqual([]);
    expect(c.target).toBe(0.5);
    syncScroll(asEl(el), 2);
    expect(el.scrollTop).toBe(1000);
  });
});

describe("attachInputs", () => {
  it("always attaches the keyboard and detaches everything", () => {
    const el = new FakeEl();
    const keys = new FakeEl();
    const c = new ProgressController([0, 1]);
    const off = attachInputs(asEl(el), c, [], { keyboardTarget: keys as unknown as EventTarget });
    keys.dispatch("keydown", { key: "ArrowDown", target: node(null) });
    expect(c.target).toBe(1);
    off();
    expect(keys.count()).toBe(0);
    const off2 = attachInputs(asEl(el), c, ["scroll", "drag", "tap-advance"], {
      keyboardTarget: keys as unknown as EventTarget,
    });
    expect(el.count()).toBeGreaterThan(0);
    off2();
    expect(el.count()).toBe(0);
  });
});
