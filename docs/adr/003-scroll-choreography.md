# ADR 003: Scroll choreography instead of fixed camera modes

## Status

Accepted. Replaces the `cameraMode` enum (linear, orbital, carousel, room).

## Context

A fixed list of camera modes can't cover what users describe. Examples include a sphere of screens spinning around a still camera, doors opening, materials morphing, or a horizontal swipe on phones. Most published scroll-driven 3D work uses the same model: one progress value from 0 to 1 drives the whole scene state.

- GSAP ScrollTrigger scrubs a timeline of tweens on any property.
- Theatre.js stores keyframe sequences as JSON and scrubs them with scroll.
- drei `useScroll().range(from, length)` gives each object its own window of the scroll.
- scroll-rig "camera beats" keep shots as `{ at, pos, look, ease }` rows, so retuning means editing data.

## Decision

1. **One progress value.** Every input writes to one progress target from 0 to 1. The scene is a pure function of progress. Positions are never accumulated from scroll events.
2. **Choreography spec (data first).** `DoodleyConfig.choreography` holds:
   - `beats`: named markers (`{ id, at }`), one per section. The HTML layer, nav and checker hook into beats.
   - `camera`: start pose (`position`, `lookAt`, `fov`).
   - `tracks`: keyframes for any property of any named object, including `camera`. Easing is set per segment. Paths can be straight lines or Catmull-Rom curves.
   - `layouts`: optional helpers (`onSphere`, `ring`, `grid`, `line`, `alongPath`) that place an object's children.
   - `behaviors`: names of user-owned TypeScript functions `(progress, ctx) => void` for anything data can't express.
   - `input`: which inputs drive progress, chosen per pointer type.
   - `allow`: explicit opt-outs from the motion rules (`roll`, `spin`, `fastMoves`).
3. **Validation.** The spec is validated with Zod. Errors name the field path and suggest a fix, so an agent can repair them.
4. **Inputs.** Native scroll, normalized wheel and touch, drag, horizontal swipe, tap or click to advance. Inputs are chosen per `(pointer: coarse)` or `(pointer: fine)`. Trackpads are not detected because there is no reliable way to do it (Lenis issue #237). **Keyboard and nav-to-beat links are always on and can't be disabled.**
5. **Default.** If `choreography` is missing, a default is built from `sections`: the camera flies forward along -Z, one beat per section. This keeps current sites working.
6. **Determinism.** In test mode, progress skips smoothing. Behaviors must not use `Math.random`, `Date.now` or timers. A checker rule evaluates the same progress twice and compares the results.

## Trade-offs (from research, see the PR)

- Data first saves tokens and validates cleanly. tinythree measured 3.5× fewer tokens than raw Three.js, and Threenity validates scenes with Zod. The cost is that LLMs make up names in custom vocabularies, which needs example recipes and good error messages.
- The behavior escape hatch removes the expressiveness limit, but costs more tokens and brings known LLM Three.js bugs (removed APIs, per-frame allocation). It needs a determinism check.
- Changing native scroll disorients users (NN/g; Voinea & Murano). Native scroll stays the default, and keyboard access can't be disabled.
- No Theatre.js dependency (studio is AGPL, `@theatre/r3f` is pre-release) and no GSAP in the runtime. We use a small timeline of our own.
