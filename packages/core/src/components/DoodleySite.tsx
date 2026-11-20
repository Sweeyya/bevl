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

const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };

// Sections are placed at z = 0, -10, -20, ...
// Camera is placed 6 units in front of each section (z = +6, -4, -14, ...)
const SECTION_SPACING = 10;
const CAMERA_OFFSET_Z = 6;

function buildCameraPath(config: DoodleyConfig): CameraPath {
  const poses: Pose[] = config.sections.map((_, i) => ({
    position: { x: 0, y: 0, z: -i * SECTION_SPACING + CAMERA_OFFSET_Z },
    quaternion: IDENTITY_QUAT,
  }));
  if (poses.length === 0) {
    poses.push({ position: { x: 0, y: 0, z: CAMERA_OFFSET_Z }, quaternion: IDENTITY_QUAT });
  }
  return new CameraPath(poses);
}

export function DoodleySite({ config, children }: DoodleySiteProps): JSX.Element {
  const [scrollProgress, setScrollProgress] = useState(0);
  const cameraPathRef = useRef<CameraPath>(buildCameraPath(config));
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: Event) => {
    const el = e.currentTarget as HTMLDivElement;
    const max = el.scrollHeight - el.clientHeight;
    setScrollProgress(max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max)));
  }, []);

  const attachRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (scrollerRef.current) {
        scrollerRef.current.removeEventListener("scroll", handleScroll);
      }
      scrollerRef.current = el;
      if (el) el.addEventListener("scroll", handleScroll, { passive: true });
    },
    [handleScroll],
  );

  return (
    <DoodleyContext.Provider
      value={{
        scrollProgress,
        sections: config.sections,
        cameraPath: cameraPathRef.current,
        sectionSpacing: SECTION_SPACING,
      }}
    >
      <div
        ref={attachRef}
        style={{ width: "100vw", height: "100vh", overflow: "auto", position: "relative" }}
      >
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, CAMERA_OFFSET_Z], fov: 60 }}
          style={{ position: "fixed", inset: 0, zIndex: 0, background: "#111" }}
        >
          <ScrollCamera />
          {children}
        </Canvas>

        {/* Hidden HTML anchors for the checker */}
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

        {/* Scroll spacer: one viewport per section. Must accept pointer events so the container scrolls. */}
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
