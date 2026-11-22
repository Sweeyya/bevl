---
"@doodley/check": minor
"@doodley/core": minor
---

New check rules: `scroll/no-spin`, `scroll/no-free-roam`, `nav/menu-exists`, `nav/link-glides`, `nav/buttons-work`, `html/no-canvas-copy`, `render/fallback`, `budgets/texture-mb`, `load/failed-requests` and `a11y/contrast-over-3d`, each with a broken fixture.

Core: the bridge `textMeshes()` now lists objects with `userData.doodleyText` set to a string, `textureMbEstimate` is computed from the real texture sizes, and `DoodleySite` shows a static `[data-doodley-fallback]` page (with an optional `fallback` prop) when WebGL is unavailable.
