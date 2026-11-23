---
"@bevl/core": minor
"@bevl/check": minor
"@bevl/a11y": patch
---

Reduced motion now holds the camera still: sections stand on one spot and cross-fade, and object tracks and behaviors pause. New optional `reducedMotion` choreography block (`mode`, `tracks`, `behaviors`) and `allow.reducedMotion`, a live `useReducedMotion` hook, a `motion()` bridge getter, and the `a11y/reduced-motion` check with its `ignores-reduced-motion` fixture.
