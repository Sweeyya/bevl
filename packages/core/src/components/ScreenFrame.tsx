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

function rect<T extends Path>(target: T, w: number, h: number): T {
  const x = -w / 2;
  const y = -h / 2;
  target.moveTo(x, y);
  target.lineTo(x + w, y);
  target.lineTo(x + w, y + h);
  target.lineTo(x, y + h);
  target.lineTo(x, y);
  return target;
}

/**
 * The surface a section lives on. Put it inside `<Section>`: the section group already faces the
 * camera's stop, and this fills it with a square brand-surface panel and an accent edge that glows. Children sit just in front of the face.
 */
export function ScreenFrame({
  width,
  height,
  opacity,
  recipe,
  children,
}: ScreenFrameProps): JSX.Element {
  const { colors } = useBrand();
  const plan = useWorldPlan(recipe);
  const w = width ?? plan.frame.width;
  const h = height ?? plan.frame.height;
  const alpha = opacity ?? plan.frame.opacity;
  const { face, edge } = useMemo(() => {
    const ring = rect(new Shape(), w, h);
    ring.holes.push(rect(new Path(), w - EDGE * 2, h - EDGE * 2));
    const inner = EDGE * 2 - 0.02;
    return { face: rect(new Shape(), w - inner, h - inner), edge: ring };
  }, [w, h]);
  const see = alpha < 1;
  return (
    <group>
      <mesh position={[0, 0, -DEPTH]}>
        <extrudeGeometry args={[face, { depth: DEPTH, bevelEnabled: false, curveSegments: 1 }]} />
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
          args={[edge, { depth: DEPTH + 0.03, bevelEnabled: false, curveSegments: 1 }]}
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
