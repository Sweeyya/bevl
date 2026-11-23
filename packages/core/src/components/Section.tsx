import type { ReactNode } from "react";
import { useContext, useLayoutEffect, useRef } from "react";
import type { Group } from "three";
import { TorosContext } from "../context.js";

interface SectionProps {
  id: string;
  title: string;
  /** Real HTML for this section, rendered over the canvas in the DOM (not inside the 3D scene). */
  html?: ReactNode;
  children?: ReactNode;
}

export function Section({ id, title, html, children }: SectionProps): JSX.Element {
  const ctx = useContext(TorosContext);
  const ref = useRef<Group>(null);

  const index = ctx ? ctx.sections.findIndex((s) => s.id === id) : 0;
  const placement = ctx?.sectionPositions[index];
  const [x, y, z] = placement?.position ?? [0, 0, -index * 10];
  const lookAt = placement?.lookAt;

  useLayoutEffect(() => {
    if (ref.current && lookAt) ref.current.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  }, [lookAt]);

  const registerHtml = ctx?.registerHtml;
  useLayoutEffect(() => {
    if (!registerHtml || html === undefined) return;
    registerHtml(id, html);
    return () => registerHtml(id, null);
  }, [registerHtml, id, html]);

  return (
    <group
      ref={ref}
      position={[x, y, z]}
      name={`section-${id}`}
      userData={{ torosSection: id, torosTitle: title }}
    >
      {children}
    </group>
  );
}
