import { TorosA11y } from "@toros/a11y";
import type { TorosConfig } from "@toros/core";
import { Section, TorosSite } from "@toros/core";

const config: TorosConfig = {
  name: "Toros Basic Example",
  sections: [
    { id: "hero", title: "Hero" },
    { id: "features", title: "Features" },
    { id: "contact", title: "Contact" },
  ],
};

export function App(): JSX.Element {
  return (
    <TorosSite config={config} overlay={<TorosA11y config={{ sections: config.sections }} />}>
      <Section
        id="hero"
        title="Hero"
        html={
          <>
            <h1>Toros Basic Example</h1>
            <p>A scroll-driven 3D site where every word is real HTML.</p>
          </>
        }
      >
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
      </Section>

      <Section
        id="features"
        title="Features"
        html={
          <>
            <h2>Features</h2>
            <p>Fast, accessible and tested on every change.</p>
          </>
        }
      >
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#2a9d8f" />
        </mesh>
      </Section>

      <Section
        id="contact"
        title="Contact"
        html={
          <>
            <h2>Contact</h2>
            <p>Questions? We would love to hear from you.</p>
            <a href="mailto:hello@example.com">hello@example.com</a>
          </>
        }
      >
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#457b9d" />
        </mesh>
      </Section>

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </TorosSite>
  );
}
