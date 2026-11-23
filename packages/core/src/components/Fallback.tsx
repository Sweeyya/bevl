import type { ReactNode } from "react";
import type { TorosConfig } from "../contract.js";

export function hasWebGL(): boolean {
  if (typeof document === "undefined") return true;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/** Static page shown instead of the canvas when WebGL is unavailable. */
export function Fallback({
  config,
  children,
}: {
  config: TorosConfig;
  children?: ReactNode;
}): JSX.Element {
  return (
    <main data-toros-fallback>
      {children ?? (
        <>
          <h1>{config.name}</h1>
          {config.sections.map((s) => (
            <section key={s.id} id={`section-${s.id}`}>
              <h2>{s.title}</h2>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
