---
"@toros/core": minor
---

Scrolling now glides, then snaps. The scrollbar follows the picture instead of jumping ahead, snapping starts 0.25 s after the last input (was 0.12 s), and snaps, nav clicks and keyboard moves ease in and out over a fixed time that grows with distance. New optional `snap.duration` sets that time (0 jumps).
