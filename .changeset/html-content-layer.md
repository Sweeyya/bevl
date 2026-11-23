---
"@toros/core": minor
"@toros/a11y": minor
"@toros/check": minor
---

Add a real HTML content layer. `<Section html={...}>` renders section text in the DOM over the canvas, in a `main` landmark with one labelled section per section, faded in by scroll progress and respecting reduced motion. `TorosA11y` no longer renders its own `main`. `html/section-text` now needs a heading and real text, and the new `html/headings` rule checks for one h1 and no skipped levels.
