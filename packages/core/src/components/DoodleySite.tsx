/**
 * DoodleySite is the root component for a Doodley 3D site.
 *
 * - Wraps an R3F <Canvas> with frameloop="demand".
 * - Sets up a scroll listener that updates scroll progress (0-1) in a ref.
 * - Renders <ScrollCamera> to drive the camera from the path.
 * - Provides DoodleyContext to all children.
 */

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { CameraPath } from "../camera/path.js";
import { DoodleyContext } from "../context.js";
import type { DoodleyConfig, Pose, Quat } from "../contract.js";
import { ScrollCamera } from "./ScrollCamera.js";

interface DoodleySiteProps {
  config: DoodleyConfig;
  children?: ReactNode;
}

/** Identity quaternion — camera looks down -Z with no rotation */
const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * Builds camera poses from section anchors. Sections without an explicit
 * anchor are evenly spaced. The camera moves along a simple z-axis path
 * with configurable spacing.
 */
function buildCameraPath(config: DoodleyConfig): CameraPath {
  const sections = config.sections;
  const n = sections.length;

  // Compute anchors: evenly spaced if not provided
  const anchors = sections.map((s, i) => s.anchor ?? i / Math.max(1, n - 1));

  // Space sections along the z-axis: each section at z = -anchor * (n-1) * 5
  const poses: Pose[] = anchors.map((anchor) => ({
    position: { x: 0, y: 0, z: anchor * (n - 1) * -5 },
    quaternion: IDENTITY_QUAT,
  }));

  // Always have at least one pose
  if (poses.length === 0) {
    poses.push({ position: { x: 0, y: 0, z: 0 }, quaternion: IDENTITY_QUAT });
  }

  return new CameraPath(poses);
}

export function DoodleySite({ config, children }: DoodleySiteProps): JSX.Element {
  const [scrollProgress, setScrollProgress] = useState(0);
  const cameraPathRef = useRef<CameraPath>(buildCameraPath(config));

  const handleScroll = useCallback(() => {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setScrollProgress(0);
      return;
    }
    setScrollProgress(Math.min(1, Math.max(0, el.scrollTop / max)));
  }, []);

  // Attach scroll listener on mount
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listenerRef = useRef(false);
  const attachRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (el && !listenerRef.current) {
        window.addEventListener("scroll", handleScroll, { passive: true });
        listenerRef.current = true;
      }
    },
    [handleScroll],
  );

  return (
    <div ref={attachRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <DoodleyContext.Provider
        value={{
          scrollProgress,
          sections: config.sections,
          cameraPath: cameraPathRef.current,
        }}
      >
        <Canvas frameloop="demand" style={{ position: "fixed", inset: 0 }}>
          <ScrollCamera />
          {children}
        </Canvas>
      </DoodleyContext.Provider>
    </div>
  );
}
