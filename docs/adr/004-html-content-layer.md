# ADR 004: HTML content layer for section text

## Status

Accepted.

## Context

Design rule 2 says text stays real HTML. Until now `<Section>` only rendered 3D children and `BevlSite` rendered an empty hidden anchor per section, so search engines and screen readers had nothing to read. `<Section>` lives inside the R3F `<Canvas>`, which cannot contain DOM.

## Decision

1. **API:** `<Section id title html={<>...</>}>`. `html` is a React node.
2. **Registry:** `Section` registers its `html` node in a layout effect through `registerHtml` on `BevlContext`; `BevlSite` keeps the nodes in state and renders them in the DOM, outside the canvas. Cleanup unregisters. Trade-off: html is rendered in the BevlSite tree, so React contexts created inside the Canvas children are not available to it.
3. **Markup:** one `<main id="main-content">` containing one `<section id="section-<id>" aria-labelledby>` per config section, in config order. If the author's html has no h1 to h6, a visually hidden `<h2>` with the section title is added; otherwise the section is labelled with `aria-label`. `BevlA11y` no longer renders its own `<main>`; its skip link targets the layer's `main`.
4. **Presentation:** the layer is `position: fixed; inset: 0; pointer-events: none`. Each frame, `HtmlLayerDriver` (inside the Canvas) writes opacity, a small translateY and `data-bevl-active` straight to the DOM from the progress value. No React state per frame, no timers. Visibility comes from the pure `sectionVisibility(progress, beats, index)`: fully visible within a quarter of the gap to the neighbouring beats, fading to 0 at half a gap. Interactive elements of the active section get `pointer-events: auto`.
5. **Reduced motion:** no transform, only the fade (see ADR 005).
6. **Brand:** CSS custom properties with fallbacks (`--bevl-font-body`, `--bevl-text`).

## Accessibility rationale

All text stays in the DOM in reading order. Off-focus sections are only faded (opacity 0, no pointer events), never `display: none`, `visibility: hidden`, `inert` or `aria-hidden`. Search engines and screen readers see everything, and Tab visits links in section order. When focus enters a section that is not active, it calls `goToBeat` for that section, so the camera and visible text follow keyboard focus. A focused section is forced fully visible.

## Check rules

`html/section-text` (error): each bridge section has a heading and non-empty visible text. `html/headings` (warn): exactly one h1 and no skipped levels.
