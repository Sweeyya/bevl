import { DoodleyA11y } from "@doodley/a11y";
import type { Choreography, DoodleyConfig } from "@doodley/core";
import { defaultChoreography, Section } from "@doodley/core";
import type { Fixture } from "./fixture.js";

export const config: DoodleyConfig = {
  name: "Fixture baseline",
  sections: [
    { id: "hero", title: "Hero" },
    { id: "features", title: "Features" },
    { id: "contact", title: "Contact" },
  ],
};

export function withChoreography(patch: Partial<Choreography>): DoodleyConfig {
  const base = defaultChoreography(config.sections.map((s) => s.id));
  return { ...config, choreography: { ...base, ...patch } };
}

export const overlay = <DoodleyA11y config={{ sections: config.sections }} />;

export const head = {
  title: "Doodley fixture",
  description: "A three-section baseline site used by the broken fixtures.",
};

const COLORS = ["#e63946", "#2a9d8f", "#457b9d"];

export function Scene(): JSX.Element {
  return (
    <>
      {config.sections.map((s, i) => (
        <Section key={s.id} id={s.id} title={s.title}>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color={COLORS[i] ?? "#ffffff"} />
          </mesh>
        </Section>
      ))}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </>
  );
}

export const good: Fixture = { config, overlay, Scene, head };
