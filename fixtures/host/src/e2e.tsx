import { BevlA11y } from "@bevl/a11y";
import type { BevlConfig, Choreography, InputKind, Track } from "@bevl/core";
import { defaultChoreography } from "@bevl/core";
import { useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import type { Fixture } from "./fixture.js";

const params = new URLSearchParams(location.search);

export function list(name: string): InputKind[] | undefined {
  const v = params.get(name);
  return v === null ? undefined : (v.split(",").filter(Boolean) as InputKind[]);
}

export function number(name: string): number | undefined {
  const v = params.get(name);
  return v === null ? undefined : Number(v);
}

export function sectionList(count: number): BevlConfig["sections"] {
  return Array.from({ length: count }, (_, i) => ({ id: `s${i + 1}`, title: `Section ${i + 1}` }));
}

/** Displayed progress as a scene value: probe.rotation.y runs 0 to 1 linearly with progress. */
export const PROBE_TRACK: Track = {
  target: "probe",
  prop: "rotation.y",
  keys: [
    { at: 0, value: 0, ease: "linear" },
    { at: 1, value: 1, ease: "linear" },
  ],
};

function Expose(): null {
  const scene = useThree((s) => s.scene);
  (window as unknown as { __e2e: unknown }).__e2e = {
    scene,
    displayed: () => scene.getObjectByName("probe")?.rotation.y ?? Number.NaN,
  };
  return null;
}

function Probe(): JSX.Element {
  return (
    <group name="probe">
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    </group>
  );
}

export function buildFixture(
  sections: BevlConfig["sections"],
  patch: (base: Choreography) => Choreography,
  extra?: ReactNode,
): Fixture {
  const config: BevlConfig = {
    name: "E2E fixture",
    sections,
    choreography: patch(defaultChoreography(sections.map((s) => s.id))),
  };
  return {
    config,
    head: { title: "Bevl e2e", description: "Input end-to-end fixture." },
    overlay: (
      <>
        <BevlA11y config={{ sections }} />
        <a
          href="#e2e-link"
          data-testid="link"
          style={{ position: "fixed", left: 8, bottom: 8, zIndex: 5, padding: 24, color: "#fff" }}
        >
          Example link
        </a>
        <button
          type="button"
          data-testid="button"
          style={{ position: "fixed", right: 8, bottom: 8, zIndex: 5, padding: 24 }}
        >
          Button
        </button>
      </>
    ),
    // biome-ignore lint/correctness/noComponentHookFactories: called once at module load, never re-created
    Scene: () => (
      <>
        <Expose />
        <Probe />
        {extra}
        <ambientLight intensity={0.8} />
      </>
    ),
  };
}
