---
"@toros/optimizer": patch
"@toros/cli": minor
---

Fix `optimizeGlb` failing on every real GLB. It called Draco and WebP compression without the encoder packages they need. The default pipeline (dedup, prune, weld, resample, instance, sparse) now works with no extra packages. Draco (`--draco`, needs `draco3dgltf`) and WebP textures (`--textures`, needs `sharp`) are opt-in and fail with a clear message if the package is missing.
