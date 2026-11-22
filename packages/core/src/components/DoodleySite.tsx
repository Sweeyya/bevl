import { Canvas, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BridgeState } from "../bridge.js";
import { installBridge, removeBridge } from "../bridge.js";
import { buildCameraPathForMode, sectionPositionsForMode } from "../camera/modes.js";
import type { CameraPath } from "../camera/path.js";
import { DoodleyContext } from "../context.js";
import type {
  CameraMode,
  CameraState,
  DoodleyConfig,
  Quat,
  SceneStats,
  SectionState,
  Vec3,
} from "../contract.js";
import { ScrollCamera } from "./ScrollCamera.js";

interface DoodleySiteProps {
  config: DoodleyConfig;
  children?: ReactNode;
}

const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };
const SECTION_SPACING = 10;
const CAMERA_OFFSET_Z = 6;

function buildPathAndPositions(config: DoodleyConfig): {
  cameraPath: ReturnType<typeof buildCameraPathForMode>;
  sectionPositions: Vec3[];
  cameraMode: CameraMode;
} {
  const mode: CameraMode = config.cameraMode ?? "linear";
  const cfg = {
    mode,
    sectionCount: Math.max(1, config.sections.length),
    linearSpacing: SECTION_SPACING,
    linearOffset: CAMERA_OFFSET_Z,
  };
  return {
    cameraPath: buildCameraPathForMode(cfg),
    sectionPositions: sectionPositionsForMode(cfg),
    cameraMode: mode,
  };
}

function parseTestParams(): { testMode: boolean; seed: number } {
  if (typeof window === "undefined") return { testMode: false, seed: 1 };
  const p = new URLSearchParams(window.location.search);
  return { testMode: p.has("doodley-test"), seed: Number(p.get("seed") ?? "1") || 1 };
}

function makeBridgeState(): BridgeState {
  return {
    advance: () => {},
    getSections: () => [],
    getCamera: () => ({
      position: { x: 0, y: 0, z: 0 },
      quaternion: IDENTITY_QUAT,
      up: { x: 0, y: 1, z: 0 },
      fov: 60,
      sectionId: null,
    }),
    getScroll: () => 0,
    getStats: () => ({
      triangles: 0,
      drawCalls: 0,
      geometries: 0,
      textures: 0,
      textureMbEstimate: 0,
    }),
    getMaterials: () => [],
    getTextMeshes: () => [],
    getMascot: () => null,
    getEvents: () => [],
    pushEvent: () => {},
    resolveReady: () => {},
  };
}

/** Lives inside the Canvas — wires useThree state into the bridge and renders the first frame */
function BridgeInstaller({
  bridgeStateRef,
  scrollProgress,
  sections,
  cameraPath,
}: {
  bridgeStateRef: React.MutableRefObject<BridgeState>;
  scrollProgress: number;
  sections: DoodleyConfig["sections"];
  cameraPath: CameraPath;
}): null {
  const { camera, gl, advance } = useThree();
  const eventsRef = useRef<import("../contract.js").DoodleyEvent[]>([]);
  const initialFrameDone = useRef(false);

  // Wire live getters on every render so they always reflect current state
  const state = bridgeStateRef.current;
  state.advance = (ms) => advance(ms / 1000);
  state.getCamera = (): CameraState => ({
    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    quaternion: {
      x: camera.quaternion.x,
      y: camera.quaternion.y,
      z: camera.quaternion.z,
      w: camera.quaternion.w,
    },
    up: { x: camera.up.x, y: camera.up.y, z: camera.up.z },
    fov: "fov" in camera ? (camera as { fov: number }).fov : 60,
    sectionId: null,
  });
  state.getStats = (): SceneStats => {
    const info = gl.info;
    const textures = info.memory?.textures ?? 0;
    return {
      triangles: info.render?.triangles ?? 0,
      drawCalls: info.render?.calls ?? 0,
      geometries: info.memory?.geometries ?? 0,
      textures,
      textureMbEstimate: textures * 4,
    };
  };
  state.getMaterials = () => [];
  state.getTextMeshes = () => [];
  state.getMascot = () => null;
  state.getEvents = () => eventsRef.current;
  state.pushEvent = (e) => eventsRef.current.push(e);
  state.getSections = (): SectionState[] =>
    sections.map((s, i) => ({
      id: s.id,
      index: i,
      anchor: i / Math.max(1, sections.length - 1),
      cameraPose: cameraPath.lerp(i / Math.max(1, sections.length - 1)),
      domId: `section-${s.id}`,
    }));
  state.getScroll = () => scrollProgress;

  useEffect(() => {
    // Render the first frame so the canvas isn't black in test mode
    if (!initialFrameDone.current) {
      initialFrameDone.current = true;
      advance(0);
    }
    // Resolve ready after fonts load
    const resolve = () => state.resolveReady();
    if (document.fonts) {
      document.fonts.ready.then(resolve).catch(resolve);
    } else {
      resolve();
    }
  }, [advance, state]);

  return null;
}

export function DoodleySite({ config, children }: DoodleySiteProps): JSX.Element {
  const { testMode } = parseTestParams();
  const [scrollProgress, setScrollProgress] = useState(0);
  const pathRef = useRef(buildPathAndPositions(config));
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Create bridge state once; install the bridge synchronously so window.__doodley
  // is available as soon as the component mounts (before any useEffect runs).
  const bridgeStateRef = useRef<BridgeState | null>(null);
  if (bridgeStateRef.current === null) {
    bridgeStateRef.current = makeBridgeState();
    if (testMode) installBridge(bridgeStateRef.current);
  }

  useEffect(() => {
    if (!testMode) return;
    return () => removeBridge();
  }, [testMode]);

  const handleScroll = useCallback((e: Event) => {
    const el = e.currentTarget as HTMLDivElement;
    const max = el.scrollHeight - el.clientHeight;
    setScrollProgress(max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max)));
  }, []);

  const attachRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (scrollerRef.current) scrollerRef.current.removeEventListener("scroll", handleScroll);
      scrollerRef.current = el;
      if (el) el.addEventListener("scroll", handleScroll, { passive: true });
    },
    [handleScroll],
  );

  const { cameraPath, sectionPositions, cameraMode } = pathRef.current;
  const initialPose = cameraPath.lerp(0);

  return (
    <DoodleyContext.Provider
      value={{
        scrollProgress,
        sections: config.sections,
        cameraPath,
        sectionSpacing: SECTION_SPACING,
        cameraMode,
        sectionPositions,
      }}
    >
      <div
        ref={attachRef}
        data-doodley-scroller
        style={{ width: "100vw", height: "100vh", overflow: "auto", position: "relative" }}
      >
        <Canvas
          frameloop={testMode ? "never" : "demand"}
          camera={{
            position: [initialPose.position.x, initialPose.position.y, initialPose.position.z],
            fov: 60,
          }}
          style={{ position: "fixed", inset: 0, zIndex: 0, background: "#111" }}
        >
          <ScrollCamera />
          {testMode && (
            <BridgeInstaller
              bridgeStateRef={bridgeStateRef as React.MutableRefObject<BridgeState>}
              scrollProgress={scrollProgress}
              sections={config.sections}
              cameraPath={cameraPath}
            />
          )}
          {children}
        </Canvas>

        {config.sections.map((s) => (
          <div
            key={s.id}
            id={`section-${s.id}`}
            data-doodley-section={s.id}
            data-doodley-title={s.title}
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        ))}

        <div
          style={{
            height: `${config.sections.length * 100}vh`,
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>
    </DoodleyContext.Provider>
  );
}
