# ADR 001: Use React Three Fiber for the 3D runtime

## Status

Accepted

## Context

We need a 3D renderer for the web. The main options are:

1. **Plain Three.js** — full control, but we write our own component model and state management.
2. **React Three Fiber (R3F)** — React bindings for Three.js. Declarative, large ecosystem (drei), and supports `frameloop="never"` with manual `advance()` for deterministic test mode.
3. **Babylon.js** — alternative 3D engine, smaller ecosystem for React.

## Decision

Use **React Three Fiber** (`@react-three/fiber`) and **drei** (`@react-three/drei`).

## Reasons

- Declarative component model fits our section-based architecture.
- `frameloop="never"` + `advance(timestamp)` gives us a controlled clock for test mode. This is the same approach used by R3F's own test suite.
- `drei` provides ready-made helpers (orbit controls, environment, text, etc.) that we can use and constrain.
- Large community. Many examples to learn from.
- Used by production sites we want to match in quality.

## Test mode details

With `frameloop="never"`, the canvas only renders when we call `advance()`. Our `step(ms)` function in the test bridge calls `advance()` in fixed steps of `1000/60` ms (one frame). Two calls to `step()` with the same input always produce the same camera pose — that is the determinism guarantee.

Verify this against the pinned R3F version before each release. If `advance()` behavior changes in a minor version, pin the old version and open an issue.

## Trade-offs accepted

- R3F adds a React dependency to `core`. Users who don't use React will need a React runtime.
- We constrain R3F heavily (no orbit controls, no free roam, scroll only). Some R3F features are intentionally disabled.

## Alternatives rejected

- **Plain Three.js**: more code to write and maintain. We'd rebuild what R3F and drei already do well.
- **Babylon.js**: smaller React ecosystem. No `frameloop="never"` equivalent without patching.
