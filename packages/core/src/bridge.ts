/**
 * window.__doodley test bridge.
 * Populated by DoodleySite when ?doodley-test is in the URL.
 * Only active in test mode — never shipped to production users.
 */

import type {
  CameraState,
  DoodleyBridge,
  DoodleyEvent,
  MascotState,
  MaterialState,
  SceneStats,
  SectionState,
  TextMeshState,
} from "./contract.js";

/** Mutable refs updated by BridgeInstaller after the canvas mounts */
export interface BridgeState {
  advance: (ms: number) => void;
  getSections: () => SectionState[];
  getCamera: () => CameraState;
  getScroll: () => number;
  getStats: () => SceneStats;
  getMaterials: () => MaterialState[];
  getTextMeshes: () => TextMeshState[];
  getMascot: () => MascotState | null;
  getEvents: () => DoodleyEvent[];
  pushEvent: (e: DoodleyEvent) => void;
  resolveReady: () => void;
}

const FRAME_MS = 1000 / 60;

export function installBridge(state: BridgeState): void {
  let time = 0;
  let frame = 0;

  let _resolve = () => {};
  const ready = new Promise<void>((resolve) => {
    _resolve = resolve;
    // Override resolveReady so BridgeInstaller can call it once fonts are loaded
    state.resolveReady = resolve;
  });
  // Also set it now so if it's called before the promise body runs (unlikely but safe)
  state.resolveReady = _resolve;

  const bridge: DoodleyBridge = {
    ready,
    step(ms: number) {
      const steps = Math.max(1, Math.round(ms / FRAME_MS));
      for (let i = 0; i < steps; i++) {
        state.advance(FRAME_MS);
        time += FRAME_MS;
        frame += 1;
      }
      return { time, frame };
    },
    sections: () => state.getSections(),
    camera: () => state.getCamera(),
    scroll: () => state.getScroll(),
    stats: () => state.getStats(),
    materials: () => state.getMaterials(),
    textMeshes: () => state.getTextMeshes(),
    mascot: () => state.getMascot(),
    events: () => state.getEvents(),
  };

  (window as unknown as { __doodley: DoodleyBridge }).__doodley = bridge;
}

export function removeBridge(): void {
  delete (window as unknown as { __doodley?: unknown }).__doodley;
}
