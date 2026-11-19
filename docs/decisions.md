# Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-18 | Name: Doodley. npm `doodley` free; GitHub user `doodley` taken, so the repo lives under the founder's account | Checked npm registry and GitHub on this date |
| 2026-11-18 | Step 1 authoring is vanilla three.js through `@doodley/runtime`, not React Three Fiber | The runtime must own the clock and input for determinism; R3F path comes later |
| 2026-11-18 | TypeScript + pnpm + Playwright + Vite | Web-native stack; Playwright gives real browser input and screenshots |
