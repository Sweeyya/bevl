import { Canvas, useThree } from "@react-three/fiber";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fontStack, resolveBrand } from "../brand.js";
import type { BridgeState } from "../bridge.js";
import { exposeBridge, installBridge, removeBridge } from "../bridge.js";
import { defaultChoreography } from "../choreography/default.js";
import { cameraPoseAt } from "../choreography/pose.js";
import { sectionPositions } from "../choreography/scene.js";
import { validateChoreography } from "../choreography/schema.js";
import type { Choreography } from "../choreography/types.js";
import { TorosContext } from "../context.js";
import type {
  BrandTokens,
  CameraState,
  Quat,
  SceneStats,
  SectionState,
  TorosBridge,
  TorosConfig,
} from "../contract.js";
import { resolveInputs } from "../input/resolve.js";
import { useProgressInput } from "../input/useProgressInput.js";
import { collectMaterials } from "../materials.js";
import { prefersReducedMotion, useReducedMotion } from "../motion/preference.js";
import { isTestModeAllowed } from "../testmode.js";
import { collectTextMeshes } from "../textMeshes.js";
import { estimateTextureMb } from "../textureMemory.js";
import { Fallback, hasWebGL } from "./Fallback.js";
import { HtmlLayer, HtmlLayerDriver } from "./HtmlLayer.js";
import { ScrollCamera } from "./ScrollCamera.js";

interface TorosSiteProps {
  config: TorosConfig;
  /** Brand tokens (src/brand.tokens.json). Colors, fonts and the canvas background follow them. */
  brand?: BrandTokens | undefined;
  children?: ReactNode;
  /** DOM rendered over the canvas (nav, HUD). Gets TorosContext. */
  overlay?: ReactNode;
  /** Replaces the built-in static page shown when WebGL is unavailable. */
  fallback?: ReactNode;
  /**
   * Put section text on a brand surface panel so it stays readable over the 3D scene. On by
   * default when `brand` is given. Style it with the CSS variables --toros-panel-bg, -text,
   * -border, -radius, -padding, -shadow, -width and -align (flex-start, center, flex-end).
   */
  panel?: boolean;
}

const BRAND_HEADING_CSS =
  "[data-toros-scroller] :is(h1,h2,h3,h4,h5,h6){font-family:var(--toros-font-heading)}";

function panelVars({ colors, radiusBase, spacingBase }: BrandTokens): Record<string, string> {
  return {
    "--toros-panel-bg": `color-mix(in srgb, ${colors.surface} 94%, transparent)`,
    "--toros-panel-text": colors.text,
    "--toros-panel-border": `2px solid ${colors.accent}`,
    "--toros-panel-radius": `${radiusBase * 2}px`,
    "--toros-panel-padding": `${spacingBase * 3}px ${spacingBase * 4}px`,
    "--toros-panel-shadow": "0 12px 40px rgba(0,0,0,0.35)",
    "--toros-panel-width": "32rem",
    "--toros-panel-align": "center",
  };
}

const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };
/** The config's choreography if valid, otherwise the default (errors go to console.error). */
function buildChoreography(config: TorosConfig): Choreography {
  const ids = config.sections.map((s) => s.id);
  const fallback = defaultChoreography(ids);
  if (!config.choreography) return fallback;
  const result = validateChoreography(config.choreography, ids);
  if (result.ok) return result.value;
  for (const error of result.errors) console.error(`[toros] invalid choreography: ${error}`);
  return fallback;
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

function parseTestParams(config: TorosConfig): { testMode: boolean; seed: number } {
  if (typeof window === "undefined") return { testMode: false, seed: 1 };
  const p = new URLSearchParams(window.location.search);
  const allowed = isTestModeAllowed(config.testMode, window.location.hostname);
  return { testMode: allowed && p.has("toros-test"), seed: Number(p.get("seed") ?? "1") || 1 };
}

function makeBridgeState(choreography: Choreography, brand: BrandTokens | null): BridgeState {
  return {
    getBrand: () => brand,
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
    getReducedMotion: prefersReducedMotion,
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
  const { camera, gl, advance, scene } = useThree();
  const eventsRef = useRef<import("../contract.js").TorosEvent[]>([]);
  const initialFrameDone = useRef(false);

  // Wire live getters on every render so they always reflect current state
  const state = bridgeStateRef.current;
  state.advance = (ms, render = true) => {
    const draw = gl.render;
    if (!render) gl.render = (() => {}) as typeof gl.render;
    try {
      advance(ms / 1000);
    } finally {
      gl.render = draw;
    }
  };
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
      textureMbEstimate: estimateTextureMb(scene),
    };
  };
  state.getMaterials = () => collectMaterials(scene);
  state.getTextMeshes = () => collectTextMeshes(scene);
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

export function TorosSite({
  config,
  brand,
  children,
  overlay,
  fallback,
  panel = true,
}: TorosSiteProps): JSX.Element {
  const [webgl] = useState(hasWebGL);
  const { testMode } = parseTestParams(config);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [{ choreography, positions }] = useState(() => {
    const built = buildChoreography(config);
    const ids = config.sections.map((s) => s.id);
    return { choreography: built, positions: sectionPositions(built, ids) };
  });

  // Create bridge state once; install the bridge synchronously so window.__toros
  // is available as soon as the component mounts (before any useEffect runs).
  const bridgeStateRef = useRef<BridgeState | null>(null);
  const bridgeRef = useRef<TorosBridge | null>(null);
  if (bridgeStateRef.current === null) {
    bridgeStateRef.current = makeBridgeState(choreography, brand ?? null);
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
  const htmlLayerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState(() => new Map<string, ReactNode>());
  const registerHtml = useCallback((id: string, node: ReactNode | null) => {
    setHtmlContent((prev) => {
      const next = new Map(prev);
      if (node === null) next.delete(id);
      else next.set(id, node);
      return next;
    });
  }, []);
  const reducedMotion = useReducedMotion();
  const nativeScroll = resolveInputs(choreography.input, isCoarsePointer()).includes("scroll");

  if (!webgl) return <Fallback config={config}>{fallback}</Fallback>;

  const initialPose = cameraPoseAt(choreography, 0);
  const tokens = resolveBrand(brand);
  const brandStyle = brand
    ? ({
        fontFamily: "var(--toros-font-body)",
        color: tokens.colors.text,
        "--toros-text": tokens.colors.text,
        "--toros-font-heading": fontStack(tokens.fonts.heading),
        "--toros-font-body": fontStack(tokens.fonts.body),
        ...(panel ? panelVars(tokens) : {}),
      } as CSSProperties)
    : {};

  return (
    <TorosContext.Provider
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
        reducedMotion,
        brand: brand ?? null,
        registerHtml,
      }}
    >
      <div
        ref={setScroller}
        data-toros-scroller
        style={{
          width: "100vw",
          height: "100vh",
          overflow: nativeScroll ? "auto" : "hidden",
          position: "relative",
          ...brandStyle,
        }}
      >
        {brand && <style>{BRAND_HEADING_CSS}</style>}
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
          style={{ position: "fixed", inset: 0, zIndex: 0, background: tokens.colors.background }}
        >
          <ScrollCamera />
          <HtmlLayerDriver layer={htmlLayerRef} />
          {testMode && (
            <BridgeInstaller
              bridgeStateRef={bridgeStateRef as React.MutableRefObject<BridgeState>}
              getProgress={getProgress}
              choreography={choreography}
            />
          )}
          {children}
        </Canvas>

        <HtmlLayer layerRef={htmlLayerRef} content={htmlContent} />

        <div
          style={{
            height: `${config.sections.length * 100}vh`,
            position: "relative",
            zIndex: 1,
          }}
        />
        {overlay}
      </div>
    </TorosContext.Provider>
  );
}
