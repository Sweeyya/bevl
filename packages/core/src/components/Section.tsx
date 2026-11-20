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

  // Find this section's index to compute its world position
  const index = ctx ? ctx.sections.findIndex((s) => s.id === id) : 0;
  const spacing = ctx ? ctx.sectionSpacing : 10;
  const z = -index * spacing;

  return (
    <group
      position={[0, 0, z]}
      name={`section-${id}`}
      userData={{ doodleySection: id, doodleyTitle: title }}
    >
      {children}
    </group>
  );
}
