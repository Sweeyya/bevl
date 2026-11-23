---
"@doodley/check": patch
"@doodley/a11y": patch
---

Fix three problems found by checking every recipe: `scroll/no-free-roam` no longer reports leftover camera travel from the previous rule as free roaming (it waits for the camera to stop), `a11y/contrast-over-3d` ignores text that is faded out by a parent, and the nav bar scrolls sideways so links 7 to 12 of a 12-section site can be reached on a phone.
