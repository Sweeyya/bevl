import { Section } from "@doodley/core";
import type { Fixture } from "../../host/src/fixture.js";
import { config, good, sectionHtml } from "../../host/src/good.js";

function Scene(): JSX.Element {
  return (
    <>
      {config.sections.map((s) => (
        <Section
          key={s.id}
          id={s.id}
          title={s.title}
          html={s.id === "contact" ? undefined : sectionHtml[s.id]}
        >
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#2a9d8f" />
          </mesh>
        </Section>
      ))}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </>
  );
}

export const fixture: Fixture = { ...good, Scene };
