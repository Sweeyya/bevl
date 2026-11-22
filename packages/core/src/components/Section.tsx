import type { ReactNode } from "react";
import { useContext } from "react";
import { DoodleyContext } from "../context.js";

interface SectionProps {
  id: string;
  title: string;
  children?: ReactNode;
}

export function Section({ id, title, children }: SectionProps): JSX.Element {
  const ctx = useContext(DoodleyContext);

  const index = ctx ? ctx.sections.findIndex((s) => s.id === id) : 0;
  const pos = ctx?.sectionPositions[index] ?? { x: 0, y: 0, z: -index * 10 };

  return (
    <group
      position={[pos.x, pos.y, pos.z]}
      name={`section-${id}`}
      userData={{ doodleySection: id, doodleyTitle: title }}
    >
      {children}
    </group>
  );
}
