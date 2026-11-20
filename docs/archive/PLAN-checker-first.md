# Doodley — Full Project Plan

Doodley is a framework that lets AI coding agents (Claude Code, Codex, Cursor, …) build **3D interactive websites**, then **check them and play through them automatically**, and get a **score**.

Think "HyperFrames, but for interactive 3D sites instead of videos":

- HyperFrames: write HTML → seek a paused timeline frame by frame → identical video every time → checkable.
- Doodley: write a scene with the Doodley runtime → run it on a controlled clock with recorded input → identical behaviour every time → checkable, playable, scorable.

The same score serves two audiences:

1. **People building sites** — the agent finds and fixes broken interactions, blank canvases, slow scenes and off-style colours before the person sees them.
2. **AI training (the startup)** — the score is a verifiable reward, so a Doodley task + its hidden play-throughs is an RL environment for agents (and later, multi-agent RL with builder / artist / critic roles).

This file is the map of the whole project. The detailed build spec for the first step is `docs/STEP1_SPEC.md`. How an agent should work in this repo is in `AGENTS.md`.

---

## 1. The one idea everything rests on: determinism

A Doodley scene must behave **exactly the same** on every run, given the same seed and the same input.

- The runtime owns the clock. In `test` mode time only moves when the engine calls `step(ms)`.
- Randomness comes only from a seeded RNG.
- Input is real browser input (mouse, keyboard, wheel, touch) sent by the engine and recorded, so a play-through can be replayed.
- No network at runtime except local `assets/`.

If this holds, `check`, `snapshot` and `play` give the same results every time, which makes them trustworthy for people and usable as a reward for training.

---

## 2. Full component map (HyperFrames → Doodley)

| #   | HyperFrames part                                                     | Doodley equivalent                                                                                                                                                                                                          | Step                     |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Composition format + 12-rule contract                                | **Doodley project format + contract** (`doodley.json`, `scene.js`, `index.html`, declared objects, interactions, state, budgets)                                                                                            | 1                        |
| 2   | Engine / producer (seekable page → frames)                           | **`@doodley/runtime`** (browser: deterministic clock, RNG, object registry, interactions, state, test bridge) + **`@doodley/engine`** (Node: Playwright drives the bridge, input, screenshots, metrics)                     | 1                        |
| 3   | CLI (`init`, `check`, `snapshot`, `preview`, `render`, …)            | **`doodley` CLI**: `init`, `lint`, `check`, `snapshot`, `play`, `preview`, `doctor`, `info`                                                                                                                                 | 1                        |
| 4   | `@hyperframes/lint`                                                  | **`@doodley/lint`** — static contract rules                                                                                                                                                                                 | 1                        |
| 5   | `check` (lint, runtime, layout, contrast)                            | **`@doodley/checks`** — load, render, motion, budgets, interactions, layout, a11y, style                                                                                                                                    | 1                        |
| 6   | `snapshot`                                                           | `doodley snapshot` — PNGs at times, scroll positions, named cameras, viewports                                                                                                                                              | 1                        |
| 7   | — (new)                                                              | **`doodley play`** — scripted play-throughs + seeded explore bot                                                                                                                                                            | 1                        |
| 8   | — (new)                                                              | **Score** — 0–100 with module breakdown, hard gates, deterministic                                                                                                                                                          | 1                        |
| 9   | Frame presets (`FRAME.md` + showcase)                                | **Style packs** (`STYLE.md` + `style.json` + `showcase/`)                                                                                                                                                                   | 1 (3 seed styles)        |
| 10  | Skills (9)                                                           | **Skills**: `doodley`, `doodley-cli` (step 1); `doodley-registry`, `asset-use`, `reverse-any-site`, `style-sampling`, `figma-to-doodley`, `r3f-to-doodley` (later)                                                          | 1 → 2                    |
| 11  | MCP server + webMCP                                                  | **`@doodley/mcp`** — exposes `init`, `lint`, `check`, `play`, `snapshot`, `info` as MCP tools                                                                                                                               | 1 (minimal) → 2          |
| 12  | Registry: 210 blocks + 239 components + `add`/`catalog`              | **Registry**: 3D blocks (hero scenes, product viewer, globe, particle field, scroll camera, portal, gallery room) and components (orbit controls, loaders, overlay UI, shaders, post-fx) + `doodley add`, `doodley catalog` | 1 (≈20 seeds) → 2 (100+) |
| 13  | `capture <url>`                                                      | `doodley capture <url>` — turn a live site into a starting project (palette, fonts, copy, layout)                                                                                                                           | 2                        |
| 14  | `history` / `undo`                                                   | `doodley history` — every write recorded, undoable, "what did the person change"                                                                                                                                            | 2                        |
| 15  | `media-use`                                                          | **`asset-use`** — get 3D models (Poly Haven, Sketchfab, generators), textures, HDRIs, sound; optimise with glTF tooling                                                                                                     | 2                        |
| 16  | `reverse-any-video`                                                  | **`reverse-any-site`** — rebuild a 3D site, compared snapshot by snapshot                                                                                                                                                   | 2                        |
| 17  | `style-sampling`                                                     | **`style-sampling`** — new site in a proven style                                                                                                                                                                           | 2                        |
| 18  | Studio (desktop app + server)                                        | **Doodley Studio** — scene tree, move objects, edit camera paths and plays; agent sees the selection                                                                                                                        | 3                        |
| 19  | Player web component                                                 | **`<doodley-player>`** — embed a Doodley scene in any page                                                                                                                                                                  | 3                        |
| 20  | SDK (headless editing)                                               | **`@doodley/sdk`** — programmatic scene edits                                                                                                                                                                               | 3                        |
| 21  | Share / publish                                                      | `doodley build`, `doodley share` — static build and a hosted link                                                                                                                                                           | 2                        |
| 22  | Cloud render (Lambda, Cloud Run, paid cloud)                         | **Cloud runs** — many checks/plays in parallel; doubles as the **RL environment runner**                                                                                                                                    | 3                        |
| 23  | Docs site + catalog                                                  | Docs site + public catalog with live demos                                                                                                                                                                                  | 2                        |
| 24  | Distribution (Claude plugin marketplace, `npx skills`, Codex plugin) | Same channels                                                                                                                                                                                                               | 1 (`npx`) → 2 (plugins)  |
| 25  | Telemetry + feedback                                                 | Opt-in telemetry + `doodley feedback`; with consent, failing cases become new training tasks                                                                                                                                | 3                        |
| 26  | — (new, startup)                                                     | **RL environment package**: task sets, hidden plays, reward, adapters for agent-RL libraries, multi-agent roles                                                                                                             | 3 → 4                    |

---

## 3. Repository layout (target)

```
doodley/
  AGENTS.md                 how agents work in this repo
  CLAUDE.md                 imports AGENTS.md
  README.md
  package.json              pnpm workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  packages/
    runtime/                @doodley/runtime   (browser)
    engine/                 @doodley/engine    (Node, Playwright)
    lint/                   @doodley/lint
    checks/                 @doodley/checks    (checks + scoring)
    cli/                    doodley            (the CLI binary)
    mcp/                    @doodley/mcp
    schema/                 @doodley/schema    (JSON schemas + TS types for doodley.json, plays, reports, style.json)
    # later: studio/, studio-server/, player/, sdk/, cloud/, rl/ (Python)
  styles/
    <style-name>/STYLE.md, style.json, showcase/
  registry/
    blocks/<name>/          full sections / scenes
    components/<name>/      small reusable pieces
  skills/
    doodley/SKILL.md (+ references/)
    doodley-cli/SKILL.md (+ references/)
  examples/
    product-viewer/  scroll-story/  mini-room/
  fixtures/
    broken/<case>/          intentionally broken projects used by tests
  docs/
    PLAN.md  STEP1_SPEC.md  …
```

---

## 4. Steps

### Step 1 — The base (detailed in `docs/STEP1_SPEC.md`)

Goal: an agent can `init` a site, build it with the runtime, and get trustworthy `lint`, `check`, `snapshot`, `play` results and a score, from the CLI or MCP.

Deliverables:

- Project format + contract, runtime, engine, lint, checks + score, CLI (8 commands), minimal MCP server.
- 3 seed style packs (placeholders until the founder's own styles are added).
- ~20 registry seeds (blocks + components) usable by copying.
- 3 examples, a set of broken fixtures, 2 skills.
- Tests: unit, integration against fixtures, determinism.

Done when: the acceptance criteria in `STEP1_SPEC.md` §12 all pass.

### Step 2 — Grow

- Registry to 100+ items with `doodley add` / `doodley catalog`, quality bar, demo page per item.
- `capture <url>`, `history` / `undo`, `build`, `share`.
- Skills: `doodley-registry`, `asset-use`, `reverse-any-site`, `style-sampling`, `figma-to-doodley`, `r3f-to-doodley`.
- Asset pipeline: model/texture/HDRI search + import, glTF optimisation, budget-aware.
- MCP: all CLI jobs as tools; snapshot returns images.
- Distribution: Claude Code plugin marketplace entry, `npx skills add`, Codex plugin zip.
- Docs site with live catalog.
- Public gallery of before/after (agent alone vs agent + Doodley) — this is the main proof for users.

### Step 3 — Scale + training

- Studio (desktop app) with selection context for agents, `<doodley-player>`, `@doodley/sdk`.
- Cloud runs: many isolated sessions in parallel (containers), queue, artifacts.
- **RL environment package**:
  - Task = prompt + style + required interactions + budgets + **hidden** plays.
  - Reward = Doodley score from hidden plays + checks; hard gates on lint/determinism.
  - Anti-reward-hacking: hidden plays, the agent cannot edit plays/budgets/checker, determinism verified by re-run, contract lint must pass, randomised seeds/viewports at eval.
  - Adapters for existing agent-RL environment libraries/standards (verify their current APIs when building; candidates seen in research: PrimeIntellect `verifiers`, NVIDIA NeMo Gym, OpenReward standard, Harbor tasks).
  - Baseline eval: run several models through the task set, publish scores.
- Opt-in telemetry → anonymised failing cases → new tasks.

### Step 4 — Multi-agent

- Role-split tasks: builder (geometry/layout), artist (style/materials/lighting), engineer (interactions/perf), critic (runs plays, files findings).
- Per-role credit: map each finding/score module to the role that owns it, so multi-agent RL frameworks can assign reward per agent.
- Multi-agent benchmark: same tasks solved by 1 agent vs a team; publish.

---

## 5. What is deliberately NOT in scope (for now)

- React Three Fiber as the primary authoring format (Step 1 is vanilla three.js through the runtime; an `r3f-to-doodley` path comes later).
- WebGPU-only features (keep WebGL2 as baseline; WebGPU optional later).
- Our own 3D model generator (use existing sources/generators via `asset-use`).
- Hosting a paid cloud before Step 3.

---

## 6. Risks to keep in mind

- **Headless WebGL**: CI machines often have no GPU and use software rendering. Treat headless FPS as unreliable; measure work (draw calls, triangles) instead, and label software rendering in reports.
- **Determinism leaks**: any `Date.now`, `Math.random`, timer, or CDN fetch breaks repeatability. Lint must catch them and the determinism test must run in CI.
- **Scope**: HyperFrames is a company project with ~10.5k files. Ship each step so it is useful alone.
- **Demand is unproven**: 3D-website agent skills on GitHub have stayed small (3–4.3k stars as of Nov 2026). The before/after gallery in Step 2 is the test of demand — build it early.
- **Name**: `doodley` is free on npm (checked Nov 18 2026). The GitHub username `doodley` is taken, so the repo lives under the founder's account or a differently named org. Claim the npm name and `@doodley` scope early.
