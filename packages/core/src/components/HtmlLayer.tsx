import { useFrame } from "@react-three/fiber";
import type { ReactNode, RefObject } from "react";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { DoodleyContext } from "../context.js";
import type { SectionConfig } from "../contract.js";
import { sectionStyle } from "../html/visibility.js";

const HEADING = "h1,h2,h3,h4,h5,h6";

const CSS = `
[data-doodley-html] [data-doodley-section]{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;padding:8vh 8vw;max-width:100%;font-family:var(--doodley-font-body,system-ui,sans-serif);color:var(--doodley-text,#fff);pointer-events:none;outline:none}
[data-doodley-html] [data-doodley-section]>div{max-width:40rem}
[data-doodley-html] [data-doodley-active="true"] :is(a,button,input,select,textarea,summary){pointer-events:auto}
[data-doodley-html] [data-doodley-section]:focus-within{opacity:1!important}
[data-doodley-html] [data-doodley-sr]{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

/** Writes visibility straight to the DOM (no React state per frame). */
export function applyHtmlLayer(
  root: HTMLElement | null,
  progress: number,
  beats: number[],
  reduced: boolean,
): void {
  if (!root) return;
  for (const el of root.querySelectorAll<HTMLElement>("[data-doodley-section]")) {
    const style = sectionStyle(progress, beats, Number(el.dataset.doodleyIndex), reduced);
    el.style.opacity = String(style.opacity);
    el.style.transform = reduced ? "" : `translateY(${style.translateY}px)`;
    el.dataset.doodleyActive = String(style.active);
  }
}

/** Lives inside the Canvas so the frame loop keeps the DOM layer in step with progress. */
export function HtmlLayerDriver({ layer }: { layer: RefObject<HTMLElement> }): null {
  const ctx = useContext(DoodleyContext);
  useFrame(() => {
    if (ctx)
      applyHtmlLayer(
        layer.current,
        ctx.getProgress(),
        ctx.choreography.beats.map((b) => b.at),
        ctx.reducedMotion,
      );
  });
  return null;
}

function SectionHtml({
  section,
  index,
  content,
  onFocusSection,
}: {
  section: SectionConfig;
  index: number;
  content: ReactNode;
  onFocusSection: (index: number) => void;
}): JSX.Element {
  const body = useRef<HTMLDivElement>(null);
  const [ownHeading, setOwnHeading] = useState(true);
  useLayoutEffect(() => {
    setOwnHeading(body.current?.querySelector(HEADING) != null);
  });
  const headingId = `heading-${section.id}`;
  return (
    <section
      id={`section-${section.id}`}
      data-doodley-section={section.id}
      data-doodley-title={section.title}
      data-doodley-index={index}
      aria-labelledby={ownHeading ? undefined : headingId}
      aria-label={ownHeading ? section.title : undefined}
      tabIndex={-1}
      onFocus={() => onFocusSection(index)}
    >
      {!ownHeading && (
        <h2 id={headingId} data-doodley-sr>
          {section.title}
        </h2>
      )}
      <div ref={body}>{content}</div>
    </section>
  );
}

interface HtmlLayerProps {
  layerRef: RefObject<HTMLDivElement>;
  content: Map<string, ReactNode>;
}

/** One `<main>` with a landmark `<section>` per config section; all text stays in the DOM in reading order. */
export function HtmlLayer({ layerRef, content }: HtmlLayerProps): JSX.Element | null {
  const ctx = useContext(DoodleyContext);
  useLayoutEffect(() => {
    if (ctx)
      applyHtmlLayer(
        layerRef.current,
        ctx.getProgress(),
        ctx.choreography.beats.map((b) => b.at),
        ctx.reducedMotion,
      );
  });
  if (!ctx) return null;
  return (
    <div
      ref={layerRef}
      data-doodley-html
      style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none" }}
    >
      <style>{CSS}</style>
      <main id="main-content" aria-label="Main content" tabIndex={-1}>
        {ctx.sections.map((s, i) => (
          <SectionHtml
            key={s.id}
            section={s}
            index={i}
            content={content.get(s.id)}
            onFocusSection={(index) => {
              const el = layerRef.current?.querySelector(`[data-doodley-index="${index}"]`);
              if ((el as HTMLElement | null)?.dataset.doodleyActive !== "true")
                ctx.goToBeat(index, ctx.reducedMotion);
            }}
          />
        ))}
      </main>
    </div>
  );
}
