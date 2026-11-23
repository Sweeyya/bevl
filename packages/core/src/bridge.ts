/**
 * window.__doodley test bridge.
 * Populated by DoodleySite when ?doodley-test is in the URL.
 * Only active in test mode — never shipped to production users.
 */

import type { Choreography } from "./choreography/types.js";
import type {
  BrandTokens,
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
  /** Render one frame at the given absolute time in ms (R3F's frameloop="never" takes timestamps). */
  /** Run one frame at the given time. With render false the scene updates but is not drawn. */
  advance: (timeMs: number, render?: boolean) => void;
  getSections: () => SectionState[];
  getCamera: () => CameraState;
  getChoreography: () => Choreography;
  getReducedMotion: () => boolean;
  getScroll: () => number;
  getStats: () => SceneStats;
  getBrand: () => BrandTokens | null;
  getMaterials: () => MaterialState[];
  getTextMeshes: () => TextMeshState[];
  getMascot: () => MascotState | null;
  getEvents: () => DoodleyEvent[];
  pushEvent: (e: DoodleyEvent) => void;
  resolveReady: () => void;
}

const FRAME_MS = 1000 / 60;

export function installBridge(state: BridgeState): DoodleyBridge {
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
        time += FRAME_MS;
        state.advance(time, i === steps - 1);
        frame += 1;
      }
      return { time, frame };
    },
    sections: () => state.getSections(),
    camera: () => state.getCamera(),
    choreography: () => state.getChoreography(),
    motion: () => ({ reducedMotion: state.getReducedMotion() }),
    scroll: () => state.getScroll(),
    stats: () => state.getStats(),
    brand: () => state.getBrand(),
    materials: () => state.getMaterials(),
    textMeshes: () => state.getTextMeshes(),
    mascot: () => state.getMascot(),
    events: () => state.getEvents(),
  };

  exposeBridge(bridge);
  return bridge;
}

export function exposeBridge(bridge: DoodleyBridge): void {
  (window as unknown as { __doodley: DoodleyBridge }).__doodley = bridge;
}

export function removeBridge(): void {
  delete (window as unknown as { __doodley?: unknown }).__doodley;
}
