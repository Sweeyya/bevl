---
"@toros/check": patch
"@toros/core": patch
---

Checker rules now wait for the test bridge and for scrolls to take effect, and report an error finding instead of passing when they cannot run. scroll/reaches-every-section really scrolls to every beat and checks progress and camera pose. Removes an unused core barrel file.
