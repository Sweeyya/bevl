---
"@doodley/core": minor
"@doodley/check": minor
"@doodley/a11y": patch
---

Replace fixed camera modes with a data-driven scroll choreography (ADR 003).

- `choreography` in `doodley.json`: beats, keyframe tracks on any property, curved camera paths, layouts, behaviors, inputs per pointer type, snapping, and `allow` opt-outs. Validated with Zod; errors name the field and give a fix.
- One progress value driven by scroll, wheel, touch, drag, horizontal swipe, tap-advance and keyboard (always on).
- Snap-to-beat settling: directional, nearest, strong or none, with per-beat opt-out and touch overrides.
- `DoodleySite` gains an `overlay` prop; nav links glide to beats.
- New checker rules: `scroll/snap-settles`, `scroll/snap-no-trap`, `a11y/keyboard-reaches-beats`, `scroll/deterministic`, `scroll/motion-allowances`, plus broken fixtures (`pnpm test:fixtures`).
- Removed: `cameraMode`, `CameraPath` and the four camera-mode builders.
