# Toros

Turn any brand into a fast, accessible 3D website, from inside the AI tool you already use.

Toros is a toolkit for coding agents (Claude, ChatGPT, Cursor, Lovable and others). You give the agent a brand kit, design tokens or a `DESIGN.md`. It generates a scroll-driven 3D site as source code **in your own repo**, then runs `toros check` in a real browser and keeps fixing problems until the score is 90 or higher. You own the code and can deploy it anywhere.

> **Status: early development.** Nothing is published to npm yet. The core pieces work end to end from a source checkout, but expect rough edges. See [What works today](#what-works-today) for what is and is not done.

## The idea

- **It is a website, not a game.** Scrolling (or swiping, or tapping) moves the camera. Text stays real HTML. Navigation is a normal menu. The keyboard always works.
- **You describe the motion, it happens.** There is no fixed list of camera modes. A site describes its own scroll experience as data: a camera flying forward, a ring of screens spinning around a still camera, a room you turn inside of, or anything else you can express as keyframes.
- **Every site comes tested.** `toros check` loads the site in Chromium on a desktop and a phone profile, scrolls it, presses keys, and returns a score from 0 to 100. Every failure comes with a `Fix:` line an agent can act on.

## What works today

| Area                                | Status                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core runtime (`@toros/core`)        | Works. Scroll choreography, six ready-made recipes, one progress value driven by scroll, wheel, touch, drag, swipe, tap and keyboard, snap-to-screen settling, a real HTML text layer (`<Section html={...}>`), brand tokens applied to materials, lights and fonts, a no-WebGL fallback, test mode and the `window.__toros` bridge. |
| Checker (`@toros/check`)            | Works. 32 rules covering load, render, budgets, scroll, snapping, determinism, navigation, keyboard, HTML, SEO, contrast and brand. 27 broken fixtures prove the rules fail when they should, and browser end-to-end tests cover the real inputs.                                                                                    |
| Accessibility layer (`@toros/a11y`) | Works. Nav bar, skip link and keyboard. Nav links glide to screens.                                                                                                                                                                                                                                                                  |
| Token reader (`@toros/tokens`)      | Works. Reads `DESIGN.md` and design-token JSON, and holds the shared project commands (create, add-section, apply-brand).                                                                                                                                                                                                            |
| Optimizer (`@toros/optimizer`)      | Works for dedup, prune, weld, resample, instance and sparse with no extra packages. Draco (`--draco`) and WebP textures (`--textures`) are opt-in and need `draco3dgltf` or `sharp` installed. Not yet tested on models with textures.                                                                                               |
| CLI (`@toros/cli`)                  | `create`, `add-section`, `apply-brand`, `check`, `optimize`.                                                                                                                                                                                                                                                                         |
| MCP server (`@toros/mcp`)           | `check_site`, `optimize_assets`, `read_brand_tokens`, `create_site`, `add_section`, `apply_brand`. Confined to the project folder and to localhost.                                                                                                                                                                                  |
| Agent skill (`skills/toros`)        | Written, with a test that keeps its rule table in sync with the checker. Not yet tried with a real agent.                                                                                                                                                                                                                            |
| Effects (`@toros/effects`)          | Scaffold only: a glass material and a shader background.                                                                                                                                                                                                                                                                             |
| Mascot (`@toros/mascot`)            | Empty. Planned for V2.                                                                                                                                                                                                                                                                                                               |

Not done yet: the `html/order-matches` rule, Linux screenshot baselines for the visual tests, the Spectr demo, golden agent tasks, and publishing to npm.

Both examples (`examples/basic` and `examples/recipes`) score 100/100.

## Try it from source

You need Node 22+ and pnpm 12.

```sh
git clone https://github.com/Sweeyya/bevl.git
cd toros
pnpm install
pnpm build

# Download the browser the checker uses (one time)
cd packages/check && pnpm exec playwright install chromium && cd ../..

# Run the basic example
cd examples/basic
pnpm dev --port 3042
```

In a second terminal, check it:

```sh
node packages/cli/dist/bin.js check http://localhost:3042 --project-dir examples/basic
```

You get a score, a list of failures with fixes, and a report in `.toros/reports/<run>/report.json`.

Other commands:

```sh
node packages/cli/dist/bin.js create my-site     # scaffold a new site
node packages/cli/dist/bin.js optimize model.glb # shrink a model
```

## Describing scroll behavior

A site is a `TorosConfig` (usually `toros.json`). If you give it no `choreography`, it flies forward one screen per section. To do something else, add one:

```json
{
  "name": "my-site",
  "sections": [
    { "id": "hero", "title": "Hero" },
    { "id": "work", "title": "Work" },
    { "id": "contact", "title": "Contact" }
  ],
  "choreography": {
    "version": 1,
    "camera": { "position": [0, 0, 0] },
    "beats": [{ "id": "hero", "at": 0 }, { "id": "work", "at": 0.5 }, { "id": "contact", "at": 1 }],
    "layouts": { "sections": { "arrange": "onSphere", "radius": 8, "facing": "inward" } },
    "tracks": [
      {
        "target": "camera",
        "prop": "lookAt",
        "keys": [
          { "at": 0, "value": [0, 0, -8] },
          { "at": 0.5, "value": [8, 0, 0] },
          { "at": 1, "value": [0, 0, 8] }
        ]
      }
    ],
    "snap": { "mode": "directional" }
  }
}
```

The pieces:

- **beats**: named points on the 0 to 1 progress line, one per section. Nav links, the HTML layer and the checker all use them.
- **tracks**: keyframes for any property of any named object, including the camera. Easing per segment, and curved paths for positions.
- **layouts**: helpers that place children in a line, grid, ring, on a sphere or along a path.
- **behaviors**: your own small TypeScript functions for anything data can't express. They must be pure functions of progress (no clocks, no `Math.random`).
- **input**: which inputs move progress, chosen separately for mouse and touch.
- **snap**: after you stop, settle onto a screen. Directional (default), nearest, strong or none, with per-screen opt-out. The picture glides first and snaps 0.25 s after you stop (`snap.delay`), easing over `snap.duration` seconds (default scales with distance, 0.35 to 1.2 s).
- **allow**: explicit opt-outs from the gentle-motion rules (`roll`, `spin`, `fastMoves`, `reducedMotion`). The checker reports each one.
- **reducedMotion**: optional. With reduced motion on, the camera already stays still, sections stand on one spot and cross-fade, and object tracks and behaviors pause. You do not need to write anything for that. `{ mode?, tracks?, behaviors? }` is for authors who want a gentler alternative (extra tracks, safe behaviors) or `mode: "none"` to keep full motion on purpose (needs `allow.reducedMotion`). See [ADR 005](docs/adr/005-reduced-motion.md).

Bad specs are rejected with the field path and a fix, for example `beats[2].id "pricng" does not match any section. Fix: use one of hero, work, contact.` The design is in [ADR 003](docs/adr/003-scroll-choreography.md).

### Recipes

You don't have to write a choreography from scratch. `@toros/core` exports `recipes` for common experiences: `fly-through`, `sphere-of-screens`, `carousel`, `room`, `horizontal-gallery` and `orbit-product`. Each one works for 1 to 12 sections.

```ts
import { recipes } from "@toros/core";
const choreography = recipes["room"].create(sections.map((s) => s.id));
```

Start from a recipe and edit it. `examples/recipes` renders any of them: `?recipe=carousel&sections=6`.

## The checker

```sh
toros check <url> [--viewport desktop|phone] [--rule <id>] [--json]
```

- "Done" means a score of 90 or more and no errors.
- Hard gates: if `load/ready`, `render/not-blank` or `scroll/reaches-every-section` fails, the score is 0.
- It runs in test mode (`?toros-test`): a clock the checker controls and seeded randomness, so the same site gives the same result every run.
- Test mode only works on `localhost` by default. To check a deployed preview, set `"testMode": "always"` in `toros.json`.

Every rule and its severity is listed in [TESTING.md](TESTING.md).

## Using it from an agent (MCP)

The MCP server is not on npm yet. From a source checkout, point your agent at the built server:

```json
{
  "mcpServers": {
    "toros": {
      "command": "node",
      "args": ["/absolute/path/to/toros/packages/mcp/dist/server.js"],
      "env": { "TOROS_PROJECT_ROOT": "/absolute/path/to/your/project" }
    }
  }
}
```

The server treats every tool input as untrusted:

- Files are only read or written inside `TOROS_PROJECT_ROOT` (default: the working directory). `../` and symlink escapes are rejected.
- `check_site` only opens `http(s)` URLs on localhost. To allow remote sites, set `TOROS_ALLOW_REMOTE=1`. Cloud metadata addresses are always blocked.
- Tools only touch the file types they expect (`.glb`, `.md`, `.json`).

## Repo layout

| Path                 | What it is                                          |
| -------------------- | --------------------------------------------------- |
| `packages/core`      | 3D runtime, choreography, inputs, test bridge       |
| `packages/check`     | The checker and its rules                           |
| `packages/a11y`      | Nav, skip link, keyboard, reduced motion            |
| `packages/tokens`    | Brand and token file reader                         |
| `packages/optimizer` | `.glb` shrinker                                     |
| `packages/effects`   | Visual effects (scaffold)                           |
| `packages/mascot`    | Mascot motion (V2)                                  |
| `packages/cli`       | The `toros` command                                 |
| `packages/mcp`       | The MCP server                                      |
| `examples/basic`     | A three-section example that scores 100             |
| `fixtures/`          | Tiny broken sites, each of which must fail one rule |
| `docs/adr`           | Architecture decisions                              |

Built with TypeScript (strict, ESM), React Three Fiber, Three.js, Playwright, Vitest, Biome, Turborepo and pnpm.

## Developing

```sh
pnpm build            # build every package
pnpm test             # unit tests
pnpm test:fixtures    # every broken fixture must fail its rule (needs Chromium)
pnpm lint             # lint and format
pnpm typecheck
```

Read [AGENTS.md](AGENTS.md) first, then [PROJECT_PLAN.md](PROJECT_PLAN.md), [ARCHITECTURE.md](ARCHITECTURE.md), [TESTING.md](TESTING.md) and [DEVELOPMENT.md](DEVELOPMENT.md). Work on a `feat/` or `fix/` branch, never on `main`. Dependencies are pinned to exact versions that are at least 7 days old.

## Security

Run `pnpm audit` and see `.github/workflows/security.yml` for the automated checks. To report a vulnerability, open a private security advisory on the GitHub repository rather than a public issue.

## License

No license has been chosen yet, so all rights are reserved for now.
