import { useBrand } from "../brand.js";
import { mix, useFlatTone } from "../world/context.js";
import { type Mood, moodOf } from "../world/plan.js";

interface BackdropLightsProps {
  /** Defaults to the mood of the brand background. */
  mood?: Mood;
  /** Scales every light. */
  intensity?: number;
  /** Adds a light at the origin, for recipes where the camera stands inside (room, sphere-of-screens). */
  inside?: boolean;
}

/**
 * three.js divides diffuse light by pi, so a light of intensity 1 lights a surface to about a
 * third of its colour. Every intensity below is multiplied by pi so a surface keeps its brand colour.
 */
const PI = Math.PI;

export function BackdropLights({
  mood,
  intensity = 1,
  inside = false,
}: BackdropLightsProps): JSX.Element {
  const { colors } = useBrand();
  useFlatTone();
  const m = mood ?? moodOf(colors.background);
  const dark = m === "dark";
  const soft = (c: string): string => mix(c, "#ffffff", 0.8);
  return (
    <>
      <hemisphereLight
        args={[soft(colors.secondary), mix(colors.background, colors.surface, 0.5)]}
        intensity={(dark ? 0.3 : 0.45) * PI * intensity}
      />
      <directionalLight
        color={soft(colors.accent)}
        position={[4, 8, 6]}
        intensity={(dark ? 0.45 : 0.4) * PI * intensity}
      />
      <directionalLight
        color={soft(colors.primary)}
        position={[-6, 3, 4]}
        intensity={0.15 * PI * intensity}
      />
      <directionalLight
        color={soft(colors.secondary)}
        position={[-3, 5, -8]}
        intensity={0.25 * PI * intensity}
      />
      {inside && (
        <pointLight
          color={soft(colors.accent)}
          position={[0, 2.5, 0]}
          decay={0}
          intensity={(dark ? 0.25 : 0.2) * PI * intensity}
        />
      )}
    </>
  );
}
