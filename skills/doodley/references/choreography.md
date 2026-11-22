# Authoring choreography

`config.choreography` is data: the scene is a pure function of one `progress` value from 0 to 1. Background: `docs/adr/003-scroll-choreography.md`. Types: `packages/core/src/choreography/types.ts`. Validation: `packages/core/src/choreography/schema.ts`.

## From description to data

When the user describes an experience, answer these questions in order. Ask the user only if the description does not decide one.

1. **What is the camera doing?** Moving through space, or standing still and turning? This gives `camera` plus `tracks` with `target: "camera"` (props `position`, `lookAt`, `fov`).
2. **Where do the sections live?** In a line, a ring, a grid, on a sphere, or along a path? This gives `layouts.sections` (`arrange` of `line`, `grid`, `ring`, `onSphere`, `alongPath`). With no `sections` layout, sections sit 10 units apart along -Z.
3. **Which things move by themselves as progress changes?** Rotating props, fading logos, color changes? Give the object a `name` (`<mesh name="logo">`) and add tracks on that name, such as `rotation.y`, `position`, `material.opacity`, `material.color`.
4. **Which progress value is each section in focus?** This gives `beats`: one per section, ordered by `at` from 0 to 1.
5. **How does the user drive it?** Scroll, drag, or swipe? This gives `input` (`fine` for mouse, `coarse` for touch). Keyboard and nav links are always on.
6. **Should it settle on sections?** Default is snapping (`directional`). Use `strong` for one beat per gesture. `none` only if the user wants free scroll.
7. **Anything data cannot express?** Register a behavior with `registerBehavior(name, (progress, ctx) => {...})` and list its name in `behaviors`. It must be pure: no `Math.random`, `Date.now`, timers. Use `ctx.rand()`.

## Reference of the fields

- `beats[]`: `{ id, at, snap? }`. `id` must match a section id, each used once, `at` in 0 to 1 sorted ascending, and every section needs one. `snap: false` lets progress rest near that beat.
- `camera`: `{ position: [x,y,z], lookAt?: [x,y,z], fov? }`.
- `tracks[]`: `{ target, prop, keys: [{ at, value, ease? }], path? }`. `value` is a number, `[x,y,z]`, or a color string. `ease` is `linear`, `smooth` (default), `easeIn`, `easeOut` or `easeInOut`, applied to the segment ending at that key. `path: "curve"` makes a Catmull-Rom curve through Vec3 keys (default `linear`). At least one key.
- `layouts`: record of id to `{ arrange, radius?, spacing?, columns?, direction?, points?, facing?, center? }`. `facing` is `inward`, `outward` or `camera` (default). The id `sections` places the Section groups. Any other id is the `name` of a group in the scene and places that group's children. `alongPath` needs at least 2 `points`.
- `input`: `{ fine?, coarse?, wheelMultiplier?, touchMultiplier?, smoothing? }`. Input kinds: `scroll`, `wheel`, `touch`, `drag`, `swipe-x`, `tap-advance`. Default is `["scroll"]` for both.
- `snap`: `{ mode?, delay?, commit?, coarse? }`. Modes: `directional` (default), `nearest`, `strong`, `none`.
- `allow`: `{ roll?, spin?, fastMoves? }`. Opt-outs only when the user asked for it. The checker reports each.

Limits that the checker enforces: the camera may move at most 1.5 m per scroll step, turn at most 15 degrees per step, and must not roll more than 2 degrees. If a beat gap is large, add camera keyframes or use `path: "curve"` instead of widening `fastMoves`.

Invalid choreography falls back to the default and logs `[doodley] invalid choreography: <path>: <message>. Fix: ...` to the console. Read the message: it names the field.

## Recipes (starting points)

`@doodley/core` exports `recipes`: `fly-through`, `sphere-of-screens`, `carousel`, `room`, `horizontal-gallery` and `orbit-product`. Each has a `description` and `whenToUse`, and `recipes["carousel"].create(sectionIds)` returns a ready `Choreography` for any section count. Start from one when it matches, then edit it. The worked examples below work without recipes.

## Worked example 1: fly through (the default)

"Fly forward through a series of rooms, one per section." Camera moves along -Z. Three sections, keys linear. This is what `defaultChoreography` builds.

```json
{
  "version": 1,
  "beats": [
    { "id": "hero", "at": 0 },
    { "id": "features", "at": 0.5 },
    { "id": "contact", "at": 1 }
  ],
  "camera": { "position": [0, 0, 6], "lookAt": [0, 0, 0], "fov": 60 },
  "tracks": [
    {
      "target": "camera",
      "prop": "position",
      "keys": [
        { "at": 0, "value": [0, 0, 6], "ease": "linear" },
        { "at": 0.5, "value": [0, 0, -4], "ease": "linear" },
        { "at": 1, "value": [0, 0, -14], "ease": "linear" }
      ]
    },
    {
      "target": "camera",
      "prop": "lookAt",
      "keys": [
        { "at": 0, "value": [0, 0, 0], "ease": "linear" },
        { "at": 0.5, "value": [0, 0, -10], "ease": "linear" },
        { "at": 1, "value": [0, 0, -20], "ease": "linear" }
      ]
    }
  ]
}
```

## Worked example 2: inside a sphere of screens

"I am inside a sphere with screens on the inside and they spin around me." The camera stands still at the center. The sections form a ring facing inward, and the camera look target sweeps from screen to screen, which reads as the screens spinning past. Use `ring` for a belt of screens, or `onSphere` for a full sphere (compute look targets with `layoutPositions(spec, count)` from `@doodley/core`, which returns the same positions the runtime uses).

```json
{
  "version": 1,
  "beats": [
    { "id": "one", "at": 0 },
    { "id": "two", "at": 0.333 },
    { "id": "three", "at": 0.667 },
    { "id": "four", "at": 1 }
  ],
  "camera": { "position": [0, 0, 0], "lookAt": [0, 0, 6], "fov": 70 },
  "layouts": {
    "sections": { "arrange": "ring", "radius": 6, "facing": "inward" }
  },
  "tracks": [
    {
      "target": "camera",
      "prop": "lookAt",
      "keys": [
        { "at": 0, "value": [0, 0, 6], "ease": "easeInOut" },
        { "at": 0.333, "value": [6, 0, 0], "ease": "easeInOut" },
        { "at": 0.667, "value": [0, 0, -6], "ease": "easeInOut" },
        { "at": 1, "value": [-6, 0, 0], "ease": "easeInOut" }
      ]
    }
  ],
  "snap": { "mode": "strong" }
}
```

The ring puts section `i` at `[sin(a) * r, 0, cos(a) * r]` with `a = i / count * 2 pi`, so the look keys above match the four section positions. If you change `radius`, `count` or `arrange`, recompute the keys. Keep each turn gentle: if `scroll/no-jumps` or the turn limit complains, add intermediate look keys between screens. To keep the camera from looking at the same point twice, never loop back to the first screen with a 360 degree key.

## Worked example 3: horizontal carousel

"Swipe sideways through cards." Sections sit on a line along X. The camera slides along X. Touch users swipe, mouse users scroll or drag.

```json
{
  "version": 1,
  "beats": [{ "id": "intro", "at": 0 }, { "id": "work", "at": 0.5 }, { "id": "about", "at": 1 }],
  "camera": { "position": [0, 0, 6], "lookAt": [0, 0, 0] },
  "layouts": {
    "sections": { "arrange": "line", "direction": [1, 0, 0], "spacing": 8 }
  },
  "tracks": [
    {
      "target": "camera",
      "prop": "position",
      "keys": [
        { "at": 0, "value": [0, 0, 6] },
        { "at": 0.5, "value": [8, 0, 6] },
        { "at": 1, "value": [16, 0, 6] }
      ]
    },
    {
      "target": "camera",
      "prop": "lookAt",
      "keys": [
        { "at": 0, "value": [0, 0, 0] },
        { "at": 0.5, "value": [8, 0, 0] },
        { "at": 1, "value": [16, 0, 0] }
      ]
    }
  ],
  "input": { "fine": ["scroll", "drag"], "coarse": ["swipe-x"] },
  "snap": { "mode": "strong" }
}
```

The section groups are placed at x = 0, 8, 16 by the layout, and each camera key looks at its section. Each 8 m gap is eased across half the scroll, which keeps each step under 1.5 m.

## Worked example 4: a logo that turns and fades

"As I scroll the logo spins half a turn, then fades into the next section." Name the object (`<mesh name="logo">`) and animate it with tracks. Fading needs `transparent` on the material.

```json
{
  "version": 1,
  "beats": [{ "id": "hero", "at": 0 }, { "id": "story", "at": 1 }],
  "camera": { "position": [0, 0, 6], "lookAt": [0, 0, 0] },
  "tracks": [
    {
      "target": "logo",
      "prop": "rotation.y",
      "keys": [{ "at": 0, "value": 0 }, { "at": 1, "value": 3.14 }]
    },
    {
      "target": "logo",
      "prop": "material.opacity",
      "keys": [{ "at": 0.6, "value": 1 }, { "at": 1, "value": 0, "ease": "easeOut" }]
    }
  ]
}
```

```tsx
<Section id="hero" title="Hero">
  <mesh name="logo">
    <boxGeometry args={[2, 2, 2]} />
    <meshStandardMaterial color="#e63946" transparent />
  </mesh>
</Section>;
```

For motion that keyframes cannot express (for example physics-like wobble), register a pure behavior and list its name in `behaviors`.

## Checklist before running check

- Every section id appears once in `beats`, `at` ascending from 0 to 1.
- Camera step per beat is small, or has curve and intermediate keys.
- Every `target` name exists in the scene (an unknown target is silently skipped, so check the spelling).
- No `allow` flags unless the user asked.
- Section text is real HTML, not 3D text.
