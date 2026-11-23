import { afterEach, describe, expect, it } from "vitest";
import { type BridgeState, installBridge, removeBridge } from "../bridge.js";

function makeState(calls: Array<[number, boolean | undefined]>): BridgeState {
  return {
    advance: (t: number, render?: boolean) => calls.push([t, render]),
    getSections: () => [],
    getCamera: () => ({
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      up: { x: 0, y: 1, z: 0 },
      fov: 60,
      sectionId: null,
    }),
    getChoreography: () => ({}),
    getScroll: () => 0,
    getStats: () => ({
      triangles: 0,
      drawCalls: 0,
      geometries: 0,
      textures: 0,
      textureMbEstimate: 0,
    }),
    getBrand: () => null,
    getMaterials: () => [],
    getTextMeshes: () => [],
    getMascot: () => null,
    getEvents: () => [],
    pushEvent: () => {},
    resolveReady: () => {},
  } as unknown as BridgeState;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("bridge step", () => {
  it("draws only the last frame of a multi-frame step", () => {
    (globalThis as { window?: unknown }).window = {};
    const calls: Array<[number, boolean | undefined]> = [];
    const bridge = installBridge(makeState(calls));
    const result = bridge.step(5 * (1000 / 60));
    expect(result.frame).toBe(5);
    expect(calls.map(([, render]) => render)).toEqual([false, false, false, false, true]);
    removeBridge();
  });

  it("draws a single-frame step", () => {
    (globalThis as { window?: unknown }).window = {};
    const calls: Array<[number, boolean | undefined]> = [];
    const bridge = installBridge(makeState(calls));
    bridge.step(1000 / 60);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toBe(true);
    removeBridge();
  });

  it("keeps time absolute and increasing", () => {
    (globalThis as { window?: unknown }).window = {};
    const calls: Array<[number, boolean | undefined]> = [];
    const bridge = installBridge(makeState(calls));
    bridge.step(3 * (1000 / 60));
    bridge.step(2 * (1000 / 60));
    const times = calls.map(([t]) => t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(5);
    removeBridge();
  });
});
