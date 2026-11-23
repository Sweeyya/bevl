import { type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import { BackSide, Color, DoubleSide, type InstancedMesh, Object3D } from "three";
import { useBrand } from "../brand.js";
import { mix, useFlatTone, useWorldPlan, WorldContext } from "../world/context.js";
import { type Mood, moodOf, pillarAngles, type WorldKind, type WorldPlan } from "../world/plan.js";

interface WorldProps {
  /** Which recipe to dress the scene for. Inferred from the choreography by default. */
  recipe?: WorldKind;
  /** Defaults to the mood of the brand background. */
  mood?: Mood;
  /** Extra 3D content, drawn inside the same fog. */
  children?: ReactNode;
}

interface Palette {
  floor: string;
  wall: string;
  rib: string;
  skyTop: string;
  skyBottom: string;
  fog: string;
}

const SKY_RADIUS = 300;
const SKY_FRAGMENT = `uniform vec3 top;uniform vec3 bottom;varying float h;
void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.2,0.8,h)),1.0);
#include <colorspace_fragment>
}`;
const VIGNETTE_FRAGMENT = `uniform vec3 tint;varying vec2 uv2;
void main(){float d=length(uv2*vec2(0.8,1.0));gl_FragColor=vec4(tint,smoothstep(0.7,1.5,d)*0.4);
#include <colorspace_fragment>
}`;

/** Surfaces use brand tokens as they are so `brand/palette` stays quiet; only gradients and fog are blended. */
function palette(c: ReturnType<typeof useBrand>["colors"], mood: Mood): Palette {
  const dark = mood === "dark";
  return {
    floor: dark ? c.background : c.surface,
    wall: dark ? c.surface : c.background,
    rib: c.primary,
    skyTop: dark ? mix(c.background, c.primary, 0.3) : mix(c.background, c.secondary, 0.22),
    skyBottom: dark ? c.background : mix(c.background, c.primary, 0.1),
    fog: mix(c.background, c.surface, 0.25),
  };
}

function Sky({ top, bottom }: { top: string; bottom: string }): JSX.Element {
  const uniforms = useMemo(
    () => ({ top: { value: new Color(top) }, bottom: { value: new Color(bottom) } }),
    [top, bottom],
  );
  return (
    <mesh renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 24, 16]} />
      <shaderMaterial
        name="sky"
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader="varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
        fragmentShader={SKY_FRAGMENT}
      />
    </mesh>
  );
}

function Vignette({ color }: { color: string }): JSX.Element {
  const uniforms = useMemo(() => ({ tint: { value: new Color(color) } }), [color]);
  return (
    <mesh renderOrder={1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        name="vignette"
        transparent
        depthTest={false}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader="varying vec2 uv2;void main(){uv2=position.xy;gl_Position=vec4(position.xy,0.0,1.0);}"
        fragmentShader={VIGNETTE_FRAGMENT}
      />
    </mesh>
  );
}

function Surface({ color, glow = 0.12 }: { color: string; glow?: number }): JSX.Element {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={glow}
      roughness={0.9}
      metalness={0}
      side={DoubleSide}
    />
  );
}

function Glow({ color, strength = 0.8 }: { color: string; strength?: number }): JSX.Element {
  return (
    <meshStandardMaterial
      name="brand-accent"
      color={color}
      emissive={color}
      emissiveIntensity={strength}
      toneMapped={false}
      side={DoubleSide}
      polygonOffset
      polygonOffsetFactor={-4}
      polygonOffsetUnits={-4}
    />
  );
}

const flat: [number, number, number] = [-Math.PI / 2, 0, 0];

function Pillars({
  angles,
  radius,
  bottom,
  top,
  color,
}: {
  angles: number[];
  radius: number;
  bottom: number;
  top: number;
  color: string;
}): JSX.Element {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    angles.forEach((a, i) => {
      o.position.set(Math.sin(a) * radius, (top + bottom) / 2, -Math.cos(a) * radius);
      o.rotation.set(0, -a, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [angles, radius, bottom, top]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, angles.length]} frustumCulled={false}>
      <boxGeometry args={[0.28, top - bottom, 0.22]} />
      <Surface color={color} />
    </instancedMesh>
  );
}

function Stripes({
  count,
  spacing,
  z0,
  width,
  y,
  color,
}: {
  count: number;
  spacing: number;
  z0: number;
  width: number;
  y: number;
  color: string;
}): JSX.Element {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(0, y, z0 - i * spacing);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, spacing, z0, y]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[width, 0.03, 0.14]} />
      <Glow color={color} strength={0.7} />
    </instancedMesh>
  );
}

function Room({ plan, p, accent }: { plan: WorldPlan; p: Palette; accent: string }): JSX.Element {
  const wallR = plan.radius + 0.7;
  const height = plan.ceilingY - plan.floorY;
  const angles = useMemo(() => pillarAngles(plan.positions), [plan.positions]);
  return (
    <group>
      <mesh position={[0, (plan.ceilingY + plan.floorY) / 2, 0]}>
        <cylinderGeometry args={[wallR, wallR, height, 64, 1, true]} />
        <Surface color={p.wall} />
      </mesh>
      <mesh position={[0, plan.floorY, 0]} rotation={flat}>
        <circleGeometry args={[wallR, 64]} />
        <Surface color={p.floor} />
      </mesh>
      <mesh position={[0, plan.ceilingY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[wallR, 64]} />
        <Surface color={p.wall} glow={0.45} />
      </mesh>
      <mesh position={[0, plan.floorY + 0.12, 0]} rotation={flat}>
        <ringGeometry args={[wallR - 0.5, wallR - 0.3, 64]} />
        <Glow color={accent} />
      </mesh>
      <mesh position={[0, plan.floorY + 0.12, 0]} rotation={flat}>
        <ringGeometry args={[plan.radius * 0.45, plan.radius * 0.48, 64]} />
        <Glow color={accent} strength={0.7} />
      </mesh>
      <mesh position={[0, plan.ceilingY - 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[wallR - 1.2, wallR - 1, 64]} />
        <Glow color={accent} strength={0.7} />
      </mesh>
      {[plan.floorY + 1.2, plan.ceilingY - 1.4].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[wallR - 0.03, wallR - 0.03, 0.07, 64, 1, true]} />
          <Glow color={accent} strength={0.7} />
        </mesh>
      ))}
      <Pillars
        angles={angles}
        radius={wallR - 0.15}
        bottom={plan.floorY}
        top={plan.ceilingY}
        color={p.rib}
      />
    </group>
  );
}

function gridLines(radius: number): Float32Array {
  const points: number[] = [];
  const STEP = Math.PI / 24;
  const at = (lat: number, lon: number): number[] => [
    Math.cos(lat) * Math.sin(lon) * radius,
    Math.sin(lat) * radius,
    -Math.cos(lat) * Math.cos(lon) * radius,
  ];
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let k = 0; k < 48; k++) {
      points.push(
        ...at((lat * Math.PI) / 180, k * STEP),
        ...at((lat * Math.PI) / 180, (k + 1) * STEP),
      );
    }
  }
  for (let lon = 0; lon < 360; lon += 30) {
    for (let k = -12; k < 12; k++) {
      points.push(
        ...at(k * STEP, (lon * Math.PI) / 180),
        ...at((k + 1) * STEP, (lon * Math.PI) / 180),
      );
    }
  }
  return new Float32Array(points);
}

function Shell({ plan, p, accent }: { plan: WorldPlan; p: Palette; accent: string }): JSX.Element {
  const r = plan.radius + 1.2;
  const lines = useMemo(() => gridLines(r - 0.05), [r]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[r, 48, 32]} />
        <Surface color={p.wall} glow={0.2} />
      </mesh>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial name="brand-accent" color={accent} transparent opacity={0.45} />
      </lineSegments>
    </group>
  );
}

function Corridor({
  plan,
  p,
  accent,
}: {
  plan: WorldPlan;
  p: Palette;
  accent: string;
}): JSX.Element {
  const hw = 4.6;
  const far = Math.min(...plan.positions.map((q) => q[2]), 0) - 14;
  const near = 16;
  const length = near - far;
  const midZ = (near + far) / 2;
  const ribs = Math.floor(length / 5);
  const wallH = plan.ceilingY - plan.floorY;
  const wallY = (plan.ceilingY + plan.floorY) / 2;
  return (
    <group>
      <mesh position={[0, plan.floorY, midZ]} rotation={flat}>
        <planeGeometry args={[hw * 2, length]} />
        <Surface color={p.floor} />
      </mesh>
      <mesh position={[0, plan.ceilingY, midZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[hw * 2, length]} />
        <Surface color={p.wall} glow={0.45} />
      </mesh>
      {[-hw, hw].map((x) => (
        <group key={x}>
          <mesh position={[x, wallY, midZ]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[length, wallH]} />
            <Surface color={p.wall} />
          </mesh>
          <mesh position={[x * 0.97, plan.floorY + 0.12, midZ]}>
            <boxGeometry args={[0.08, 0.06, length]} />
            <Glow color={accent} />
          </mesh>
        </group>
      ))}
      <Stripes
        count={ribs}
        spacing={5}
        z0={near - 2}
        width={hw * 2}
        y={plan.floorY + 0.02}
        color={p.rib}
      />
    </group>
  );
}

function Studio({ plan, p, accent }: { plan: WorldPlan; p: Palette; accent: string }): JSX.Element {
  const xs = plan.positions.map((q) => q[0]);
  const x0 = Math.min(...xs, 0) - 16;
  const x1 = Math.max(...xs, 0) + 16;
  const wall = plan.kind === "horizontal-gallery";
  return (
    <group>
      {wall ? (
        <>
          <mesh position={[(x0 + x1) / 2, plan.floorY, 2.4]} rotation={flat}>
            <planeGeometry args={[x1 - x0, 7.2]} />
            <Surface color={p.floor} />
          </mesh>
          <mesh position={[(x0 + x1) / 2, plan.floorY + 4.5, -1.2]}>
            <planeGeometry args={[x1 - x0, 9]} />
            <Surface color={p.wall} />
          </mesh>
          <mesh position={[(x0 + x1) / 2, plan.floorY + 0.05, -1.15]}>
            <boxGeometry args={[x1 - x0, 0.1, 0.05]} />
            <Glow color={accent} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, plan.floorY, 0]} rotation={flat}>
            <circleGeometry args={[plan.radius + 18, 64]} />
            <Surface color={p.floor} />
          </mesh>
          <mesh position={[0, plan.floorY + 0.01, 0]} rotation={flat}>
            <ringGeometry args={[plan.radius + 0.9, plan.radius + 1.05, 64]} />
            <Glow color={accent} />
          </mesh>
          <mesh position={[0, plan.floorY + 0.005, 0]} rotation={flat}>
            <circleGeometry args={[plan.radius + 0.9, 64]} />
            <Surface color={p.wall} />
          </mesh>
        </>
      )}
    </group>
  );
}

/**
 * Brand-coloured set dressing for a scene: a gradient sky, fog tuned to the camera range, a
 * vignette, and a floor and walls that fit the recipe. Put it inside `TorosSite` next to the
 * `Section`s and `BackdropLights`.
 */
export function World({ recipe, mood, children }: WorldProps): JSX.Element {
  const { colors } = useBrand();
  useFlatTone();
  const plan = useWorldPlan(recipe);
  const m = mood ?? moodOf(colors.background);
  const p = useMemo(() => palette(colors, m), [colors, m]);
  const room = plan.kind === "room";
  const sphere = plan.kind === "sphere-of-screens";
  const corridor = plan.kind === "fly-through";
  return (
    <WorldContext.Provider value={plan}>
      <fog attach="fog" args={[p.fog, plan.fog[0], plan.fog[1]]} />
      <Sky top={p.skyTop} bottom={p.skyBottom} />
      <Vignette color={m === "dark" ? "#000000" : mix(colors.background, "#000000", 0.45)} />
      {room && <Room plan={plan} p={p} accent={colors.accent} />}
      {sphere && <Shell plan={plan} p={p} accent={colors.accent} />}
      {corridor && <Corridor plan={plan} p={p} accent={colors.accent} />}
      {!room && !sphere && !corridor && <Studio plan={plan} p={p} accent={colors.accent} />}
      {children}
    </WorldContext.Provider>
  );
}
