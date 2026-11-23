---
"@bevl/core": minor
---

Add test mode and window.__bevl bridge (T1.2)

- `?bevl-test` URL param activates test mode: `frameloop="never"`, deterministic
- `window.__bevl` bridge: `ready`, `step()`, `sections()`, `camera()`, `scroll()`, `stats()`, `events()`
- `makeRand(seed)` seeded PRNG (mulberry32) — use instead of Math.random in runtime code
- Bridge resolves `ready` after `document.fonts.ready`
