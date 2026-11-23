import { Section } from "@toros/core";
import type { Fixture } from "../../host/src/fixture.js";
import { config, good } from "../../host/src/good.js";

function Scene(): JSX.Element {
  return (
    <>
      {config.sections.map((s) => (
        <Section
          key={s.id}
          id={s.id}
          title={s.title}
          html={
            <>
              <h1>{s.title}</h1>
              <h3>Details</h3>
              <p>Text for {s.title}.</p>
            </>
          }
        >
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#457b9d" />
          </mesh>
        </Section>
      ))}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </>
  );
}

export const fixture: Fixture = { ...good, Scene };
