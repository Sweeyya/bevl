import { type ReactNode, useMemo } from "react";
import { Path, Shape } from "three";
import { useBrand } from "../brand.js";
import { useWorldPlan } from "../world/context.js";
import type { WorldKind } from "../world/plan.js";

interface ScreenFrameProps {
  /** Overrides the recipe's default screen width, in scene units. */
  width?: number;
  height?: number;
  /** Overrides the recipe's default opacity of the screen face (fly-through is see-through by default). */
  opacity?: number;
  /** Which recipe to size for. Inferred from the choreography by default. */
  recipe?: WorldKind;
  /** Per-section 3D content, placed on the face of the screen. */
  children?: ReactNode;
}

const DEPTH = 0.14;
const EDGE = 0.045;

function roundedRect<T extends Path>(target: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.quadraticCurveTo(x + w, y, x + w, y + r);
  target.lineTo(x + w, y + h - r);
  target.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  target.lineTo(x + r, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - r);
  target.lineTo(x, y + r);
  target.quadraticCurveTo(x, y, x + r, y);
  return target;
}

/**
 * The surface a section lives on. Put it inside `<Section>`: the section group already faces the
 * camera's stop, and this fills it with a rounded brand-surface panel, and an accent edge that glows. Children sit just in front of the face.
 */
export function ScreenFrame({
  width,
  height,
  opacity,
  recipe,
  children,
}: ScreenFrameProps): JSX.Element {
  const { colors, radiusBase } = useBrand();
  const plan = useWorldPlan(recipe);
  const w = width ?? plan.frame.width;
  const h = height ?? plan.frame.height;
  const alpha = opacity ?? plan.frame.opacity;
  const corner = Math.min(0.1 + radiusBase * 0.02, h / 4);
  const { face, edge } = useMemo(() => {
    const ring = roundedRect(new Shape(), w, h, corner);
    ring.holes.push(
      roundedRect(new Path(), w - EDGE * 2, h - EDGE * 2, Math.max(corner - EDGE, 0.02)),
    );
    const inner = EDGE * 2 - 0.02;
    return {
      face: roundedRect(new Shape(), w - inner, h - inner, Math.max(corner - EDGE, 0.02)),
      edge: ring,
    };
  }, [w, h, corner]);
  const see = alpha < 1;
  return (
    <group>
      <mesh position={[0, 0, -DEPTH]}>
        <extrudeGeometry args={[face, { depth: DEPTH, bevelEnabled: false, curveSegments: 6 }]} />
        <meshStandardMaterial
          name="brand-surface"
          color={colors.surface}
          emissive={colors.surface}
          emissiveIntensity={0.6}
          roughness={0.85}
          metalness={0}
          transparent={see}
          opacity={alpha}
          depthWrite={!see}
        />
      </mesh>
      <mesh position={[0, 0, -DEPTH]}>
        <extrudeGeometry
          args={[edge, { depth: DEPTH + 0.03, bevelEnabled: false, curveSegments: 6 }]}
        />
        <meshStandardMaterial
          name="brand-accent"
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
      <group position={[0, 0, 0.05]}>{children}</group>
    </group>
  );
}
