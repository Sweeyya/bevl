import { Canvas, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { BridgeState } from "../bridge.js";
import { exposeBridge, installBridge, removeBridge } from "../bridge.js";
import { defaultChoreography } from "../choreography/default.js";
import { cameraPoseAt } from "../choreography/pose.js";
import { sectionPositions } from "../choreography/scene.js";
import { validateChoreography } from "../choreography/schema.js";
import type { Choreography } from "../choreography/types.js";
import { DoodleyContext } from "../context.js";
import type {
  CameraState,
  DoodleyBridge,
  DoodleyConfig,
  Quat,
  SceneStats,
  SectionState,
} from "../contract.js";
import { resolveInputs } from "../input/resolve.js";
import { useProgressInput } from "../input/useProgressInput.js";
import { ScrollCamera } from "./ScrollCamera.js";

interface DoodleySiteProps {
  config: DoodleyConfig;
  children?: ReactNode;
  /** DOM rendered over the canvas (nav, HUD). Gets DoodleyContext. */
  overlay?: ReactNode;
}

const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };
/** The config's choreography if valid, otherwise the default (errors go to console.error). */
function buildChoreography(config: DoodleyConfig): Choreography {
  const ids = config.sections.map((s) => s.id);
  const fallback = defaultChoreography(ids);
  if (!config.choreography) return fallback;
  const result = validateChoreography(config.choreography, ids);
  if (result.ok) return result.value;
  for (const error of result.errors) console.error(`[doodley] invalid choreography: ${error}`);
  return fallback;
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

function parseTestParams(): { testMode: boolean; seed: number } {
  if (typeof window === "undefined") return { testMode: false, seed: 1 };
  const p = new URLSearchParams(window.location.search);
  return { testMode: p.has("doodley-test"), seed: Number(p.get("seed") ?? "1") || 1 };
}

function makeBridgeState(choreography: Choreography): BridgeState {
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
    getChoreography: () => choreography,
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
  getProgress,
  choreography,
}: {
  bridgeStateRef: React.MutableRefObject<BridgeState>;
  getProgress: () => number;
  choreography: Choreography;
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
    choreography.beats.map((beat, index) => {
      const { position, quaternion } = cameraPoseAt(choreography, beat.at);
      return {
        id: beat.id,
        index,
        anchor: beat.at,
        cameraPose: { position, quaternion },
        domId: `section-${beat.id}`,
      };
    });
  state.getScroll = getProgress;

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

export function DoodleySite({ config, children, overlay }: DoodleySiteProps): JSX.Element {
  const { testMode } = parseTestParams();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [{ choreography, positions }] = useState(() => {
    const built = buildChoreography(config);
    const ids = config.sections.map((s) => s.id);
    return { choreography: built, positions: sectionPositions(built, ids) };
  });

  // Create bridge state once; install the bridge synchronously so window.__doodley
  // is available as soon as the component mounts (before any useEffect runs).
  const bridgeStateRef = useRef<BridgeState | null>(null);
  const bridgeRef = useRef<DoodleyBridge | null>(null);
  if (bridgeStateRef.current === null) {
    bridgeStateRef.current = makeBridgeState(choreography);
    if (testMode) bridgeRef.current = installBridge(bridgeStateRef.current);
  }

  useEffect(() => {
    if (!testMode || !bridgeRef.current) return;
    exposeBridge(bridgeRef.current);
    return () => removeBridge();
  }, [testMode]);

  const { controller, getProgress, tick } = useProgressInput({
    el: scroller,
    spec: choreography.input,
    beats: choreography.beats.map((b) => b.at),
    snappable: choreography.beats.map((b) => b.snap !== false),
    snap: choreography.snap,
    testMode,
  });
  const nativeScroll = resolveInputs(choreography.input, isCoarsePointer()).includes("scroll");

  const initialPose = cameraPoseAt(choreography, 0);

  return (
    <DoodleyContext.Provider
      value={{
        getProgress,
        tick,
        goToBeat: (index, instant) => {
          controller.goToBeat(index, "nav");
          if (instant) controller.snap();
        },
        sections: config.sections,
        choreography,
        sectionPositions: positions,
      }}
    >
      <div
        ref={setScroller}
        data-doodley-scroller
        style={{
          width: "100vw",
          height: "100vh",
          overflow: nativeScroll ? "auto" : "hidden",
          position: "relative",
        }}
      >
        <Canvas
          frameloop={testMode ? "never" : "demand"}
          camera={{
            position: [initialPose.position.x, initialPose.position.y, initialPose.position.z],
            quaternion: [
              initialPose.quaternion.x,
              initialPose.quaternion.y,
              initialPose.quaternion.z,
              initialPose.quaternion.w,
            ],
            fov: initialPose.fov,
          }}
          style={{ position: "fixed", inset: 0, zIndex: 0, background: "#111" }}
        >
          <ScrollCamera />
          {testMode && (
            <BridgeInstaller
              bridgeStateRef={bridgeStateRef as React.MutableRefObject<BridgeState>}
              getProgress={getProgress}
              choreography={choreography}
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
        {overlay}
      </div>
    </DoodleyContext.Provider>
  );
}
