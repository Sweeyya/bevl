/**
 * Section renders a 3D <group> at the camera pose for its anchor position,
 * and also renders a hidden <div> in the HTML DOM for the accessibility layer
 * and the checker to find.
 */

import type { ReactNode } from "react";
import { useContext } from "react";
import { DoodleyContext } from "../context.js";

interface SectionProps {
  id: string;
  title: string;
  /** Scroll anchor (0-1). Falls back to computed anchor from DoodleyContext. */
  anchor?: number;
  children?: ReactNode;
}

/** DOM id for the hidden HTML anchor element: "section-<id>" */
function domId(id: string): string {
  return `section-${id}`;
}

export function Section({ id, title, anchor, children }: SectionProps): JSX.Element {
  const ctx = useContext(DoodleyContext);

  // Find the anchor: prop takes precedence, then section config, then 0
  let resolvedAnchor = anchor;
  if (resolvedAnchor === undefined && ctx) {
    const config = ctx.sections.find((s) => s.id === id);
    resolvedAnchor = config?.anchor;
  }
  if (resolvedAnchor === undefined) resolvedAnchor = 0;

  const pose = ctx ? ctx.cameraPath.lerp(resolvedAnchor) : null;

  return (
    <>
      {/* Hidden HTML element for accessibility layer and checker */}
      <div
        id={domId(id)}
        data-doodley-section={id}
        data-doodley-title={title}
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
      {/* 3D group positioned at the camera pose for this anchor */}
      {pose ? (
        <group position={[pose.position.x, pose.position.y, pose.position.z]}>{children}</group>
      ) : (
        <group>{children}</group>
      )}
    </>
  );
}
