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
2. **Choreography spec (data first).** `BevlConfig.choreography` holds:
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

## Addendum: glide, then snap

Snapping feels like two phases: the picture follows the user, then settles.

- **Follow.** Continuous input (scroll, wheel, touch, drag, swipe) moves the target. The displayed value chases it with frame-rate independent exponential smoothing (`input.smoothing`, default 6).
- **Free glide.** Snapping starts after `snap.delay` seconds without input. The default is 0.25 s (was 0.12 s), so a small nudge keeps gliding before it is pulled to a screen.
- **Settle.** Snaps, nav clicks and keyboard moves glide from the displayed value to the destination over a fixed duration with ease-in-out (`easeInOut`): `clamp(0.35 + 0.9 * |distance|, 0.35, 1.2)` seconds, where distance is a fraction of the full length. `snap.duration` (seconds, 0 to 5, also under `snap.coarse`) sets a fixed duration instead; 0 jumps. The glide starts at zero speed, never moves backwards and lands exactly on the beat.
- **Scrollbar.** The native scroll position follows the displayed value on every frame instead of jumping to the destination. Programmatic scroll events are recognised by an expected-position guard and not read back as input.
- **Interruption.** User input cancels a glide at once and continues from the displayed value (no jump). Wheel and drag deltas are added to the displayed value, not to the destination.
- **Unchanged.** Reduced motion jumps straight to the beat. Test mode ignores smoothing and glides, and is driven only by stepped frame time.
