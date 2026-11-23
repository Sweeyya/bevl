import { Section } from "@doodley/core";
import { buildFixture, sectionList } from "../../host/src/e2e.js";

const sections = sectionList(3);
const mode = new URLSearchParams(location.search).get("mode");

export const fixture = buildFixture(
  sections,
  (base) => ({
    ...base,
    ...(mode === "none" ? { reducedMotion: { mode: "none" as const } } : {}),
  }),
  sections.map((s) => (
    <Section key={s.id} id={s.id} title={s.title} html={<h2>{s.title}</h2>}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#2a9d8f" opacity={0.8} />
      </mesh>
    </Section>
  )),
);
