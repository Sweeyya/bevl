---
"@toros/check": minor
"@toros/core": minor
---

New check rules: `scroll/no-spin`, `scroll/no-free-roam`, `nav/menu-exists`, `nav/link-glides`, `nav/buttons-work`, `html/no-canvas-copy`, `render/fallback`, `budgets/texture-mb`, `load/failed-requests` and `a11y/contrast-over-3d`, each with a broken fixture.

Core: the bridge `textMeshes()` now lists objects with `userData.torosText` set to a string, `textureMbEstimate` is computed from the real texture sizes, and `TorosSite` shows a static `[data-toros-fallback]` page (with an optional `fallback` prop) when WebGL is unavailable.
