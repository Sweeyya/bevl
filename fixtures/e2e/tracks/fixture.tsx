import { registerBehavior } from "@bevl/core";
import { buildFixture, sectionList } from "../../host/src/e2e.js";

registerBehavior("e2e-lift", (progress, ctx) => {
  const lifter = ctx.getObject("lifter") as { position: { y: number } } | undefined;
  if (lifter) lifter.position.y = progress * 4;
});

const linear = (a: number, b: number): { at: number; value: number; ease: "linear" }[] => [
  { at: 0, value: a, ease: "linear" },
  { at: 1, value: b, ease: "linear" },
];

export const fixture = buildFixture(
  sectionList(3),
  (base) => ({
    ...base,
    behaviors: ["e2e-lift"],
    tracks: [
      ...(base.tracks ?? []),
      { target: "spinner", prop: "rotation.y", keys: linear(0, 3) },
      { target: "ghost", prop: "material.opacity", keys: linear(1, 0) },
    ],
  }),
  <>
    <group name="spinner">
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
    </group>
    <mesh name="ghost">
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={1} />
    </mesh>
    <group name="lifter" />
  </>,
);
