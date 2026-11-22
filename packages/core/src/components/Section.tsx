import type { ReactNode } from "react";
import { useContext, useLayoutEffect, useRef } from "react";
import type { Group } from "three";
import { DoodleyContext } from "../context.js";

interface SectionProps {
  id: string;
  title: string;
  children?: ReactNode;
}

export function Section({ id, title, children }: SectionProps): JSX.Element {
  const ctx = useContext(DoodleyContext);
  const ref = useRef<Group>(null);

  const index = ctx ? ctx.sections.findIndex((s) => s.id === id) : 0;
  const placement = ctx?.sectionPositions[index];
  const [x, y, z] = placement?.position ?? [0, 0, -index * 10];
  const lookAt = placement?.lookAt;

  useLayoutEffect(() => {
    if (ref.current && lookAt) ref.current.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  }, [lookAt]);

  return (
    <group
      ref={ref}
      position={[x, y, z]}
      name={`section-${id}`}
      userData={{ doodleySection: id, doodleyTitle: title }}
    >
      {children}
    </group>
  );
}
