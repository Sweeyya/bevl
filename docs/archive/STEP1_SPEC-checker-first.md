# Doodley — Step 1 Build Spec

Read `docs/PLAN.md` first for the why. This file is the what and how for Step 1. Build it milestone by milestone (§11). Every milestone ends with its tests passing and a commit.

---

## 1. Tech choices

| Area               | Choice                                                    | Notes                                                                         |
| ------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Language           | TypeScript (strict) everywhere                            | ESM only                                                                      |
| Runtime            | Node.js 22+                                               |                                                                               |
| Monorepo           | pnpm workspaces                                           |                                                                               |
| 3D                 | three.js (WebGL2 renderer)                                | Vendored into each project via npm, never a CDN                               |
| Browser automation | Playwright (Chromium)                                     | Headless; WebGL via software GL when no GPU                                   |
| Dev server / build | Vite                                                      | `preview` uses Vite dev server; `check`/`play` serve the built or dev project |
| JS parsing (lint)  | acorn + acorn-walk                                        | Parse `scene.js` and other project JS                                         |
| Schemas            | JSON Schema (draft 2020-12) + generated TS types          | One source of truth in `packages/schema`                                      |
| Tests              | vitest                                                    | Integration tests launch real Chromium                                        |
| CLI framework      | commander                                                 |                                                                               |
| MCP                | official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) | stdio transport                                                               |
| Image ops          | pngjs + pixelmatch                                        | Blank/frozen detection, diffs                                                 |
| Colour             | culori                                                    | Palette distance (CIEDE2000), contrast                                        |
| License            | MIT                                                       |                                                                               |

**Dependency rule:** before adding any package, check npm for the current version and pick one published **at least 7 days ago**. Pin exact versions. Do not use `latest` or ranges like `*`. Record why each dependency exists in the package's README.

---

## 2. A Doodley project (the format)

```
my-site/
  doodley.json          manifest (required)
  index.html            page shell + overlay UI (required)
  scene.js              the 3D scene (required)
  assets/
    models/  textures/  hdri/  audio/  fonts/
  plays/
    *.play.json         play-through scripts
  .doodley/             tool output (gitignored): artifacts/, reports/
  package.json          depends on @doodley/runtime and three
```

### 2.1 `doodley.json`

```json
{
  "$schema": "./node_modules/@doodley/schema/doodley.schema.json",
  "name": "my-site",
  "entry": "scene.js",
  "seed": 1,
  "style": "soft-clay",
  "viewports": {
    "desktop": { "width": 1440, "height": 900, "dpr": 1 },
    "mobile": { "width": 390, "height": 844, "dpr": 2, "touch": true }
  },
  "budgets": {
    "triangles": 300000,
    "drawCalls": 150,
    "textureMB": 64,
    "assetMB": 25,
    "readyMs": 4000
  },
  "cameras": ["hero", "detail"],
  "motion": "continuous"
}
```

- `motion`: `"continuous"` (scene always animates, so a frozen frame is an error), `"on-input"` (only moves on interaction), or `"static"`.
- `style` names a style pack in `styles/` (repo) or `./styles/` (project-local).
- All fields have defaults in the schema except `name` and `entry`.

### 2.2 `scene.js`

```js
import { defineScene } from "@doodley/runtime";
import * as THREE from "three";

export default defineScene({
  setup(ctx) {
    const door = ctx.add(
      "door",
      new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.1), ctx.style.material("primary")),
    );
    ctx.state.set("doorOpen", false);
    ctx.camera.define("hero", { position: [0, 1.6, 5], target: [0, 1, 0] });
    ctx.camera.use("hero");
  },

  update(ctx, dt) {
    ctx.get("door").rotation.y += ctx.state.get("doorOpen") ? 0 : 0.001 * dt;
  },

  interactions: [
    {
      id: "open-door",
      target: "door",
      on: "click",
      run(ctx) {
        ctx.state.set("doorOpen", true);
        ctx.animate("door", { "rotation.y": -Math.PI / 2 }, { duration: 600, ease: "outCubic" });
      },
      expect: { state: { doorOpen: true }, after: 700 },
    },
  ],

  scroll: {
    length: 3,
    camera: [
      { at: 0, camera: "hero" },
      { at: 1, camera: "detail" },
    ],
  },
});
```

### 2.3 `index.html`

- Loads `scene.js` through the runtime: `<script type="module">import { mount } from '@doodley/runtime'; import scene from './scene.js'; mount(scene, document.getElementById('stage'));</script>`
- Overlay UI is normal HTML/CSS. Interactive elements carry:
  - `data-dy-id="<unique id>"` so checks and plays can find them.
  - `data-dy-action="<interaction id>"` to bind a button to a declared interaction (`on: 'action'`).

---

## 3. The contract (rules every project follows)

`doodley lint` and `doodley check` enforce these. Each violation prints a `Fix:` line.

1. **Named objects.** Every object that matters (interaction targets, anything referenced by plays, budgets, or styles) is added with `ctx.add(id, object)`. Ids are unique, kebab-case.
2. **Runtime owns time.** Scene code never calls `Date.now`, `performance.now`, `new Date()`, `setTimeout`, `setInterval`, or `requestAnimationFrame`. Use `dt`, `ctx.time`, `ctx.animate`, `ctx.after(ms, fn)`.
3. **Seeded randomness only.** Never `Math.random` or `crypto.getRandomValues`; use `ctx.random()` / `ctx.randomInt(a, b)`.
4. **Local assets only.** No `fetch`/`import` from http(s) URLs. Load files with `ctx.load('assets/...')`. Paths are relative, no leading `/`.
5. **Declared interactions.** Every user-triggerable behaviour is an entry in `interactions` with `id`, `target` (object id or `data-dy-id`), `on` (`click` | `hover` | `drag` | `key:<Key>` | `scroll` | `action`), `run`, and an `expect` describing its observable result.
6. **Observable state.** App state lives in `ctx.state` (JSON-serialisable values only). Checks read it.
7. **Seekable animation.** Animate with `ctx.animate` / `ctx.tween` (time-driven, owned by the runtime). No third-party animation loop that keeps its own clock.
8. **Overlay UI is addressable.** Every interactive DOM element has `data-dy-id`; buttons that trigger scene behaviour use `data-dy-action`.
9. **Style tokens.** Colours, materials, lights and post-effects come from `ctx.style` tokens. An off-palette colour needs `ctx.style.allowOffPalette(id, reason)`.
10. **Budgets declared.** Budgets live in `doodley.json`; the scene must stay within them.
11. **Resize and reduced motion.** The runtime handles resize; scenes read `ctx.reducedMotion` and reduce or remove large motion when true.
12. **No hidden globals.** Scene code does not write to `window` (the runtime exposes the test bridge itself).

---

## 4. `@doodley/runtime` (browser)

### 4.1 Public API

- `defineScene(def) → SceneDef` — validates shape, returns it.
- `mount(def, element, options?) → Instance` — creates renderer, scene, camera, starts the loop. Mode from URL param `?dy-mode=test` or option; default `live`.
- `ctx` (passed to `setup`, `update`, `run`):
  - `add(id, obj)`, `get(id)`, `has(id)`, `remove(id)`, `list()`
  - `time` (ms since start), `frame` (integer)
  - `random()`, `randomInt(a, b)`, `randomPick(arr)` — seeded (mulberry32 or similar) from `doodley.json.seed`, overridable by `?dy-seed=`
  - `state.get(k)`, `state.set(k, v)`, `state.all()`
  - `animate(id, props, { duration, ease, delay })`, `tween(from, to, opts, onUpdate)`, `after(ms, fn)`
  - `camera.define(name, { position, target, fov })`, `camera.use(name)`, `camera.current`
  - `load(path) → Promise<asset>` (glTF/GLB, textures, HDR, audio); tracks pending loads for `ready`
  - `style.color(token)`, `style.material(token)`, `style.light(rigName)`, `style.fog()`, `style.post()`, `style.allowOffPalette(id, reason)`
  - `reducedMotion` (boolean), `viewport` ({ width, height, dpr })
  - `emit(name, data)` — custom events recorded in the event log

### 4.2 Loop and modes

- `live`: `requestAnimationFrame` drives the loop; `dt` = real elapsed, clamped to 100 ms.
- `test`: the loop is paused. Only `bridge.step(ms)` advances time, in fixed sub-steps of 1000/60 ms, calling `update` and rendering once at the end of the step (or every sub-step if `{ renderEach: true }`).
- Both modes run the exact same `update` code path.

### 4.3 Test bridge — `window.__doodley` (test mode only)

| Member                         | Returns / does                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready: Promise<void>`         | resolves when setup finished and all `ctx.load` promises settled                                                                                      |
| `version`                      | runtime version                                                                                                                                       |
| `step(ms, opts?)`              | advance the clock; returns `{ time, frame }`                                                                                                          |
| `time()`                       | current time                                                                                                                                          |
| `state()`                      | `ctx.state.all()`                                                                                                                                     |
| `objects()`                    | list of `{ id, type, visible, position, rotation, scale, worldBox }`                                                                                  |
| `object(id)`                   | details for one object incl. material colours                                                                                                         |
| `project(id)`                  | screen-space centre `{ x, y, onScreen, occluded }` (raycast from camera through that pixel; `occluded` if the first hit is not the object or a child) |
| `interactions()`               | declared interactions with targets and triggers                                                                                                       |
| `stats()`                      | `renderer.info` (triangles, calls, geometries, textures) + estimated texture MB                                                                       |
| `materials()`                  | every material in the scene with id-owner and colour values                                                                                           |
| `events()`                     | ordered log: interaction fired, state changes, custom emits, errors                                                                                   |
| `setScroll(p)`                 | not used by plays (they scroll with real input); for snapshot only                                                                                    |
| `cameras()`, `useCamera(name)` | for snapshot only                                                                                                                                     |

Plays never call `run` directly. They send real input; the runtime maps input → interaction (raycast for object targets, DOM events for `data-dy-*`).

### 4.4 Input mapping

- Pointer events on the canvas raycast against registered objects; the nearest hit owning an interaction with a matching trigger fires it.
- `hover` fires on pointerenter of the target; `drag` gives `{ dx, dy }` to `run`.
- `key:<Key>` listens on `window` keydown.
- `scroll` maps wheel/touch scroll to `scroll.length` progress `0..1` and drives the scroll camera track.
- `action` fires from clicks on `[data-dy-action]`.

---

## 5. `@doodley/engine` (Node)

- `openProject(dir, { viewport, seed, reducedMotion })` → session.
  - Starts a Vite server for the project (random free port).
  - Launches Chromium via Playwright with WebGL enabled. When no GPU is available, use Chromium's software GL (look up the current flags for the installed Chromium version and record them in `docs/decisions.md`; do not guess). Detect and record which renderer is actually used via `WEBGL_debug_renderer_info`.
  - Opens `index.html?dy-mode=test&dy-seed=<seed>`, waits for `__doodley.ready` with timeout = `budgets.readyMs` × 2.
  - Collects console messages, page errors, failed requests, timing of ready.
- Session methods: `step(ms)`, `state()`, `objects()`, `project(id)`, `stats()`, `materials()`, `events()`, `screenshot({ path, clip? })`, `click({ object | domId | x,y })`, `hover`, `drag(from, by)`, `key(key, holdMs)`, `scroll(to, durationMs)`, `setViewport`, `close()`.
- Input helpers translate `object` targets with `project(id)`; if `onScreen` is false or `occluded` is true, the action fails with a clear finding instead of clicking blindly.
- Every input is appended to a recording (`.doodley/reports/<run>/input.jsonl`) so a run can be replayed.

---

## 6. `@doodley/lint` (static)

Runs without a browser. Rules (ids are stable; each has `severity`, `message`, `fix`):

| Rule id                    | Checks                                                    |
| -------------------------- | --------------------------------------------------------- |
| `manifest/schema`          | `doodley.json` matches schema                             |
| `manifest/entry-exists`    | entry file exists                                         |
| `style/exists`             | named style pack found                                    |
| `time/no-wallclock`        | `Date.now`, `performance.now`, `new Date()` in scene code |
| `time/no-timers`           | `setTimeout`, `setInterval`, `requestAnimationFrame`      |
| `random/no-unseeded`       | `Math.random`, `crypto.getRandomValues`                   |
| `net/no-remote`            | http(s) URLs in imports, `fetch`, loaders                 |
| `assets/relative-paths`    | asset strings start with `assets/`, no leading `/`        |
| `assets/exist`             | referenced asset files exist                              |
| `objects/unique-ids`       | duplicate literal ids in `ctx.add`                        |
| `interactions/shape`       | each has `id`, `target`, `on`, `run`, `expect`            |
| `interactions/unique-ids`  | duplicate interaction ids                                 |
| `dom/action-bound`         | every `data-dy-action` names a declared interaction       |
| `dom/ids-unique`           | duplicate `data-dy-id`                                    |
| `globals/no-window-writes` | assignments to `window.*` in scene code                   |
| `plays/schema`             | every `plays/*.play.json` matches schema                  |

---

## 7. `@doodley/checks` (runtime checks)

`check` runs lint first; if lint has errors, runtime checks are skipped and the report says so (`skipped: lint-errors`), never "0 problems".

Each check returns findings `{ id, severity: error|warn|info, message, fix, evidence?: { screenshot?, data? }, viewport }`. Run every check on every viewport in `doodley.json`.

| Module       | Check id                                                                        | Pass rule                                                                                                          |
| ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| load         | `load/ready`                                                                    | `__doodley.ready` resolves within `budgets.readyMs`                                                                |
| load         | `load/console-errors`                                                           | no console errors or page errors                                                                                   |
| load         | `load/failed-requests`                                                          | no failed requests                                                                                                 |
| load         | `load/webgl`                                                                    | WebGL2 context created; record renderer string; `info` if software renderer                                        |
| render       | `render/not-blank`                                                              | screenshot is not a single colour (luminance std-dev above threshold) and not pure black/magenta                   |
| render       | `render/resolution`                                                             | canvas backing size = CSS size × dpr (±1 px)                                                                       |
| render       | `render/no-nan`                                                                 | no object has NaN in position/rotation/scale                                                                       |
| motion       | `motion/not-frozen`                                                             | if `motion: continuous`: two screenshots 1000 ms of `step` apart differ (pixelmatch ratio above threshold)         |
| motion       | `motion/reduced`                                                                | with `reducedMotion: true`, total object displacement over 2 s is ≤ 25% of normal                                  |
| budgets      | `budgets/triangles`, `budgets/draw-calls`, `budgets/textures`, `budgets/assets` | measured ≤ budget (warn at 90%)                                                                                    |
| contract     | `contract/targets-exist`                                                        | every interaction target exists at ready                                                                           |
| interactions | `interactions/reachable`                                                        | every object target is on screen and not occluded from at least one declared camera or scroll position             |
| interactions | `interactions/works`                                                            | for each interaction: fresh session → perform its trigger with real input → `step(expect.after)` → `expect` holds  |
| layout       | `layout/offscreen`                                                              | interactive DOM elements inside viewport                                                                           |
| layout       | `layout/overlap`                                                                | interactive DOM elements not covered by other elements at their centre                                             |
| a11y         | `a11y/contrast`                                                                 | overlay text contrast ≥ 4.5:1 (3:1 for large text) against the rendered pixels behind it; include `suggestedColor` |
| a11y         | `a11y/focusable`                                                                | `data-dy-action` elements are keyboard-focusable                                                                   |
| style        | `style/palette`                                                                 | every material colour is within ΔE2000 ≤ `style.json.paletteTolerance` of a palette colour, unless allowed         |
| style        | `style/lighting`                                                                | the style's light rig is present                                                                                   |
| plays        | `plays/*`                                                                       | every play in `plays/` passes (see §8)                                                                             |

### 7.1 Score

- Modules and weights: load 15, render 15, motion 5, budgets 10, interactions 25, plays 20, layout+a11y 5, style 5 = 100.
- Inside a module: score = passed checks / total checks (weighted equally), per viewport, averaged.
- **Hard gates** (score = 0): lint errors, `load/ready` fails, `render/not-blank` fails on any viewport.
- Report: `.doodley/reports/<runId>/report.json` matching `report.schema.json`:
  `{ runId, project, seed, viewports, renderer, score, modules: { name: { score, weight, checks: [...] } }, findings: [...], artifacts: [...], timing }`
- **Determinism requirement:** two runs with the same seed produce byte-identical `report.json` once `runId`, timestamps and `timing` are removed. A test enforces this.

---

## 8. Plays (`plays/*.play.json`)

```json
{
  "name": "open the door then look around",
  "viewport": "desktop",
  "seed": 1,
  "steps": [
    { "wait": "ready" },
    { "snapshot": "start" },
    { "click": { "object": "door" } },
    { "advance": 700 },
    { "expect": { "state.doorOpen": true } },
    { "scroll": { "to": 0.5, "duration": 1000 } },
    { "expect": { "camera.current": "detail" } },
    { "key": { "press": "ArrowRight", "hold": 700 } },
    { "drag": { "from": { "object": "globe" }, "by": [200, 0] } },
    { "expect": { "object.globe.rotation.y": { ">": 0.5 } } },
    { "expect": { "dom.cta.visible": true } },
    { "snapshot": "end" }
  ]
}
```

- Step types: `wait` (`ready` | ms of real time — avoid), `advance` (ms of runtime clock), `click`, `hover`, `drag`, `key`, `scroll`, `type` (into `data-dy-id` input), `expect`, `snapshot`.
- `expect` paths: `state.<key>`, `object.<id>.<prop path>`, `camera.current`, `dom.<data-dy-id>.<visible|text|value>`, `events.<name>.count`. Operators: equality, `>`, `>=`, `<`, `<=`, `!=`, `between`, `approx` (with tolerance).
- A failed step stops the play; the report records the failing step index, a screenshot, and the state at that moment.
- `doodley play --explore --seed <n> --steps <n>`: seeded bot that repeatedly picks a random available action (click a visible interactive object or DOM element, scroll, a declared key, drag a draggable), advances 300 ms, and records:
  - console/page errors → error
  - NaN transforms → error
  - **softlock**: 5 consecutive actions with no state change, no event, and pixel change below threshold → warn
  - render loop frozen when `motion: continuous` → error
  - It writes the action list as a replayable play file under `.doodley/reports/<runId>/explore.play.json`.

---

## 9. CLI (`doodley`)

Conventions (all commands):

- `--json` prints one JSON object to stdout; human mode prints a readable summary.
- Failures print `✗ <message>` and `Fix: <what to do>`.
- Exit codes: `0` ok · `1` findings with errors · `2` usage error · `3` environment problem (no browser, port, etc.).
- `--cwd <dir>` to target a project; default is the current directory.

| Command                                                                                                  | Does                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `doodley init <dir> [--style <name>] [--example <name>]`                                                 | scaffold a project (manifest, index.html, scene.js, one play, package.json), install deps                |
| `doodley lint [--json]`                                                                                  | §6                                                                                                       |
| `doodley check [--json] [--viewport <name>] [--seed <n>] [--no-plays]`                                   | lint + §7 + score; writes report                                                                         |
| `doodley snapshot [--at <ms,...>] [--scroll <p,...>] [--camera <name,...>] [--viewport <name>] [--json]` | PNGs into `.doodley/artifacts/snapshots/`; JSON lists paths                                              |
| `doodley play [<file>] [--all] [--explore --seed <n> --steps <n>] [--json]`                              | §8                                                                                                       |
| `doodley preview [--port <n>] [--background]`                                                            | Vite dev server in live mode; prints URL                                                                 |
| `doodley doctor [--json]`                                                                                | Node version, Chromium installed, WebGL renderer (GPU or software), ports; always exits 0, JSON has `ok` |
| `doodley info [--json]`                                                                                  | project summary: objects, interactions, plays, budgets, style                                            |

---

## 10. Style packs, registry seeds, MCP, skills, examples, fixtures

### 10.1 Style packs (`styles/<name>/`)

- `STYLE.md` — human + agent description: mood, do/don't list, reference notes.
- `style.json`:

  ```json
  {
    "name": "soft-clay",
    "palette": { "bg": "#F3EDE4", "primary": "#E07A5F", "secondary": "#3D405B", "accent": "#81B29A", "ink": "#2B2B2B" },
    "paletteTolerance": 6,
    "materials": {
      "primary":   { "type": "standard", "color": "primary", "roughness": 0.85, "metalness": 0 },
      "secondary": { "type": "standard", "color": "secondary", "roughness": 0.8, "metalness": 0 }
    },
    "lights": { "default": [ { "type": "hemisphere", "sky": "bg", "ground": "secondary", "intensity": 1.2 }, { "type": "directional", "color": "#FFFFFF", "intensity": 2, "position": [3, 5, 2], "castShadow": true } ] },
    "fog": { "color": "bg", "near": 8, "far": 30 },
    "post": [],
    "motion": { "ease": "outCubic", "durationMs": 600 },
    "type": { "display": "Inter", "body": "Inter" }
  }
  ```
- `showcase/index.html` — a small Doodley project rendering sample objects in the style (it must pass `doodley check`).
- Ship three seed styles (`soft-clay`, `neon-night`, `paper-lowpoly`). They are placeholders: the founder's own styles will replace or join them.

### 10.2 Registry seeds (copy-in source; `add` command comes in Step 2)

- Blocks (≈8): `hero-orbit-object`, `product-viewer`, `scroll-camera-story`, `globe-markers`, `particle-field`, `gallery-room`, `portal-transition`, `floating-cards`.
- Components (≈12): `orbit-controls`, `gltf-loader-with-progress`, `loading-overlay`, `hotspot-label`, `tooltip`, `cta-button`, `scroll-progress-bar`, `hdri-environment`, `outline-on-hover`, `fresnel-material`, `bloom-post`, `reduced-motion-switch`.
- Each item: `meta.json` (name, kind, description, tags, objects it adds, interactions it declares), source files, `demo/` project that passes `doodley check` with score ≥ 90.

### 10.3 MCP server (`@doodley/mcp`, minimal)

- Tools: `doodley_init`, `doodley_lint`, `doodley_check`, `doodley_play`, `doodley_snapshot` (returns image content + paths), `doodley_info`.
- Each tool calls the same library functions as the CLI (not a shell-out) and returns the CLI's JSON.
- README shows how to add it to Claude Code (`.mcp.json`) and other MCP clients.

### 10.4 Skills (`skills/`)

Follow the Agent Skills format (`SKILL.md` with `name` and `description` frontmatter, short body, details in `references/`).

- `doodley` — when to use, the contract (short), the work loop: plan → `init` → build → `lint` → `check --json` → fix every error → `snapshot` and look → write/run plays → `preview` and hand to the person.
- `doodley-cli` — every command, flags, JSON shapes, failure table.

### 10.5 Examples (`examples/`)

`product-viewer`, `scroll-story`, `mini-room`. Each passes `check` with score ≥ 90 and ships 2+ plays.

### 10.6 Broken fixtures (`fixtures/broken/`)

One project per failure, each with `expected.json` listing the finding ids that must appear:
`blank-canvas`, `frozen-loop`, `missing-asset`, `remote-fetch`, `math-random`, `date-now`, `broken-interaction`, `occluded-target`, `offscreen-button`, `low-contrast`, `over-triangle-budget`, `off-palette`, `console-error`, `nan-transform`, `softlock` (explore finds it).

---

## 11. Milestones (build in this order)

| #   | Milestone                                                                                                                               | Done when                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Repo scaffold: pnpm workspace, tsconfig, vitest, lint/format, CI workflow (GitHub Actions, installs Chromium), `AGENTS.md` kept current | `pnpm install && pnpm test` green on CI                                                                                                     |
| M1  | `@doodley/schema`: schemas + types for `doodley.json`, play, report, style, registry meta                                               | schema tests validate good and bad samples                                                                                                  |
| M2  | `@doodley/runtime`: defineScene, mount, ctx, live/test loop, seeded RNG, state, animate, cameras, style tokens, input mapping, bridge   | unit tests + a browser test stepping a scene shows identical object transforms across two runs                                              |
| M3  | `@doodley/engine`: session, Vite serve, Chromium launch, ready, step, input helpers, screenshots, recording                             | integration test opens `examples/mini-room`, clicks an object, state changes                                                                |
| M4  | `@doodley/lint` with all §6 rules                                                                                                       | every lint fixture produces exactly its expected findings                                                                                   |
| M5  | `@doodley/checks` with all §7 checks + score + report                                                                                   | every runtime fixture produces its expected findings; examples score ≥ 90; determinism test passes                                          |
| M6  | Plays + explore bot                                                                                                                     | example plays pass; `softlock` fixture caught by explore; explore output replays identically                                                |
| M7  | CLI: all §9 commands, JSON, exit codes, `Fix:` lines                                                                                    | CLI e2e tests for each command                                                                                                              |
| M8  | Style packs (3) + showcases                                                                                                             | showcases pass `check`                                                                                                                      |
| M9  | Registry seeds (≈20) with demos                                                                                                         | every demo scores ≥ 90                                                                                                                      |
| M10 | MCP server                                                                                                                              | MCP e2e test: client calls each tool, gets valid JSON; snapshot returns an image                                                            |
| M11 | Skills + README + docs                                                                                                                  | a fresh agent following only the skills can build `examples/`-quality site from a prompt (manual check, record result in `docs/dogfood.md`) |

---

## 12. Step 1 acceptance criteria

1. `npx doodley init demo && cd demo && npx doodley check --json` works on macOS and Linux, and returns a valid report.
2. Every broken fixture yields its expected finding ids and no unexpected errors.
3. All examples, style showcases and registry demos score ≥ 90.
4. Determinism: `check` twice with the same seed → identical normalised `report.json`; an explore run replays to the same result.
5. Headless CI without a GPU passes, and the report labels the software renderer.
6. MCP tools work from Claude Code with the README's config.
7. Lint catches every banned API in §3 rules 2–4 and 12.
8. No dependency newer than 7 days at the time it was added; all versions pinned.
