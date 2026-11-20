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

/** Spacer that makes the page scrollable — 300vh total */
function ScrollSpacer(): JSX.Element {
  return (
    <div
      style={{
        height: "300vh",
        position: "relative",
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}

export function App(): JSX.Element {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "auto" }}>
      <DoodleySite config={config}>
        {/* Hero section — red box */}
        <Section id="hero" title="Hero">
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#e63946" />
          </mesh>
        </Section>

        {/* Features section — green box */}
        <Section id="features" title="Features">
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#2a9d8f" />
          </mesh>
        </Section>

        {/* Contact section — blue box */}
        <Section id="contact" title="Contact">
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#457b9d" />
          </mesh>
        </Section>

        {/* Ambient light so we can see the boxes */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
      </DoodleySite>

      {/* Scrollable content to drive the scroll event */}
      <ScrollSpacer />
    </div>
  );
}
