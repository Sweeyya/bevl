import { BevlA11y } from "@bevl/a11y";
import type { BevlConfig, Choreography } from "@bevl/core";
import { defaultChoreography, Section } from "@bevl/core";
import type { Fixture } from "./fixture.js";

export const config: BevlConfig = {
  name: "Fixture baseline",
  sections: [
    { id: "hero", title: "Hero" },
    { id: "features", title: "Features" },
    { id: "contact", title: "Contact" },
  ],
};

export function withChoreography(patch: Partial<Choreography>): BevlConfig {
  const base = defaultChoreography(config.sections.map((s) => s.id));
  return { ...config, choreography: { ...base, ...patch } };
}

export const overlay = <BevlA11y config={{ sections: config.sections }} />;

export const head = {
  title: "Bevl fixture",
  description: "A three-section baseline site used by the broken fixtures.",
};

export const sectionHtml: Record<string, JSX.Element> = {
  hero: (
    <>
      <h1>Fixture baseline</h1>
      <p>A small three-section site with real text in the page.</p>
    </>
  ),
  features: (
    <>
      <h2>Features</h2>
      <p>Every section keeps its words as HTML so people and search engines can read them.</p>
    </>
  ),
  contact: (
    <>
      <h2>Contact</h2>
      <p>Say hello and we will answer soon.</p>
      <a href="mailto:hello@example.com">hello@example.com</a>
    </>
  ),
};

const COLORS = ["#e63946", "#2a9d8f", "#457b9d"];

export function Scene(): JSX.Element {
  return (
    <>
      {config.sections.map((s, i) => (
        <Section key={s.id} id={s.id} title={s.title} html={sectionHtml[s.id]}>
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
