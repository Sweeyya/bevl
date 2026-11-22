import { DoodleyA11y } from "@doodley/a11y";
import type { DoodleyConfig } from "@doodley/core";
import { DoodleySite, Section } from "@doodley/core";

const config: DoodleyConfig = {
  name: "Doodley Basic Example",
  sections: [
    { id: "hero", title: "Hero" },
    { id: "features", title: "Features" },
    { id: "contact", title: "Contact" },
  ],
};

export function App(): JSX.Element {
  return (
    <DoodleySite config={config} overlay={<DoodleyA11y config={{ sections: config.sections }} />}>
      <Section id="hero" title="Hero">
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
      </Section>

      <Section id="features" title="Features">
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#2a9d8f" />
        </mesh>
      </Section>

      <Section id="contact" title="Contact">
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#457b9d" />
        </mesh>
      </Section>

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </DoodleySite>
  );
}
