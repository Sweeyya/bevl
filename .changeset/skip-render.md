---
"@toros/core": patch
---

The test bridge's `step()` now simulates every frame but draws only the last one. Rules that step 30 frames used to trigger 30 full renders, which is very slow on machines without a GPU.
