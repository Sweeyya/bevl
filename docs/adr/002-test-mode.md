# ADR 002: Deterministic test mode via frameloop="never"

## Status

Accepted

## Context

Screenshot tests and the checker are only useful if the site does the same thing every run. Without a fixed clock, animations and scroll positions differ between runs, making screenshots flaky.

## Decision

Add a test mode activated by `?toros-test` in the URL. In this mode:

1. R3F canvas uses `frameloop="never"` — the scene only renders when we call `advance()`.
2. Our `step(ms)` function calls `advance()` in fixed steps of `1000/60` ms.
3. All randomness in our packages goes through a seeded `rand(seed)` function. No `Math.random`, `Date.now`, or timers in runtime code paths.
4. Assets load from the project folder only. No CDN.
5. Fonts finish loading before `ready` resolves.

The checker uses only real browser input (wheel, touch, click, keyboard) to interact with the site. It reads state through `window.__toros`. It never calls `step()` to advance time — that is for unit tests only.

## Verification

Before each release, run `pnpm test:determinism`. This calls `toros check --verify-determinism` on every example. Two runs must produce identical reports and screenshots that differ by 0.1% of pixels or less.

## R3F version note

`advance()` behavior has changed between R3F versions. When we pin a new R3F version, run the determinism check and record the result in this file.

Tested with:

- R3F 9.x: `advance(timestamp)` accepts an absolute timestamp in ms. Steps of `1000/60` produce stable poses. ✓

## Trade-offs accepted

- Test mode adds a small code path (`?toros-test` branch) to `core`. It is only honored on local hosts (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost`) unless `toros.json` sets `"testMode": "always"` (for checking a preview URL). `"never"` turns it off. This keeps a visitor from freezing or inspecting a deployed site by adding `?toros-test` to the URL.
- Seeded random means the site always looks the same in test mode. That is intentional.
