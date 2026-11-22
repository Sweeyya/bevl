# Doodley

Turn any brand into a fast, accessible 3D website, from inside the AI tool you already use.

Doodley is a toolkit for coding agents (Claude, ChatGPT, Cursor, Lovable and others). You give the agent a brand kit, design tokens or a `DESIGN.md`. It generates a scroll-driven 3D site as source code **in your own repo**, then runs `doodley check` in a real browser and keeps fixing problems until the score is 90 or higher. You own the code and can deploy it anywhere.

> **Status: early development.** Nothing is published to npm yet, and the brand-to-3D step and the agent skill are not finished. See [What works today](#what-works-today).

## The idea

- **It is a website, not a game.** Scrolling (or swiping, or tapping) moves the camera. Text stays real HTML. Navigation is a normal menu. The keyboard always works.
- **You describe the motion, it happens.** There is no fixed list of camera modes. A site describes its own scroll experience as data: a camera flying forward, a ring of screens spinning around a still camera, a room you turn inside of, or anything else you can express as keyframes.
- **Every site comes tested.** `doodley check` loads the site in Chromium on a desktop and a phone profile, scrolls it, presses keys, and returns a score from 0 to 100. Every failure comes with a `Fix:` line an agent can act on.

## What works today

| Area | Status |
| --- | --- |
| Core runtime (`@doodley/core`) | Works. Scroll choreography, one progress value driven by scroll, wheel, touch, drag, swipe, tap and keyboard, snap-to-screen settling, test mode and the `window.__doodley` bridge. |
| Checker (`@doodley/check`) | Works. 19 rules covering load, render, budgets, scroll, snapping, determinism, keyboard, HTML and SEO. 12 broken fixtures prove the rules fail when they should. |
| Accessibility layer (`@doodley/a11y`) | Works. Nav bar, skip link, keyboard and reduced motion. |
| Token reader (`@doodley/tokens`) | Reads `DESIGN.md` and design-token JSON. **Not yet connected to the 3D scene.** |
| Optimizer (`@doodley/optimizer`) | Shrinks `.glb` models with glTF Transform. |
| CLI (`@doodley/cli`) | `create`, `check`, `optimize`. `add-section` and `apply-brand` are not built yet. |
| MCP server (`@doodley/mcp`) | `check_site`, `optimize_assets`, `read_brand_tokens`. `create_site`, `add_section` and `apply_brand` are not built yet. |
| Effects (`@doodley/effects`) | Scaffold only: a glass material and a shader background. |
| Mascot (`@doodley/mascot`) | Empty. Planned for V2. |
| Agent skill (`SKILL.md`) | Not written yet. |

The basic example in `examples/basic` scores 100/100.

## Try it from source

You need Node 22+ and pnpm 12.

```sh
git clone https://github.com/Sweeyya/doodley.git
cd doodley
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

You get a score, a list of failures with fixes, and a report in `.doodley/reports/<run>/report.json`.

Other commands:

```sh
node packages/cli/dist/bin.js create my-site     # scaffold a new site
node packages/cli/dist/bin.js optimize model.glb # shrink a model
```

## Describing scroll behavior

A site is a `DoodleyConfig` (usually `doodley.json`). If you give it no `choreography`, it flies forward one screen per section. To do something else, add one:

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
    "beats": [
      { "id": "hero", "at": 0 },
      { "id": "work", "at": 0.5 },
      { "id": "contact", "at": 1 }
    ],
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
- **snap**: after you stop, settle onto a screen. Directional (default), nearest, strong or none, with per-screen opt-out.
- **allow**: explicit opt-outs from the gentle-motion rules (`roll`, `spin`, `fastMoves`). The checker reports each one.

Bad specs are rejected with the field path and a fix, for example `beats[2].id "pricng" does not match any section. Fix: use one of hero, work, contact.` The design is in [ADR 003](docs/adr/003-scroll-choreography.md).

## The checker

```sh
doodley check <url> [--viewport desktop|phone] [--rule <id>] [--json]
```

- "Done" means a score of 90 or more and no errors.
- Hard gates: if `load/ready`, `render/not-blank` or `scroll/reaches-every-section` fails, the score is 0.
- It runs in test mode (`?doodley-test`): a clock the checker controls and seeded randomness, so the same site gives the same result every run.
- Test mode only works on `localhost` by default. To check a deployed preview, set `"testMode": "always"` in `doodley.json`.

Every rule and its severity is listed in [TESTING.md](TESTING.md).

## Using it from an agent (MCP)

The MCP server is not on npm yet. From a source checkout, point your agent at the built server:

```json
{
  "mcpServers": {
    "doodley": {
      "command": "node",
      "args": ["/absolute/path/to/doodley/packages/mcp/dist/server.js"],
      "env": { "DOODLEY_PROJECT_ROOT": "/absolute/path/to/your/project" }
    }
  }
}
```

The server treats every tool input as untrusted:

- Files are only read or written inside `DOODLEY_PROJECT_ROOT` (default: the working directory). `../` and symlink escapes are rejected.
- `check_site` only opens `http(s)` URLs on localhost. To allow remote sites, set `DOODLEY_ALLOW_REMOTE=1`. Cloud metadata addresses are always blocked.
- Tools only touch the file types they expect (`.glb`, `.md`, `.json`).

## Repo layout

| Path | What it is |
| --- | --- |
| `packages/core` | 3D runtime, choreography, inputs, test bridge |
| `packages/check` | The checker and its rules |
| `packages/a11y` | Nav, skip link, keyboard, reduced motion |
| `packages/tokens` | Brand and token file reader |
| `packages/optimizer` | `.glb` shrinker |
| `packages/effects` | Visual effects (scaffold) |
| `packages/mascot` | Mascot motion (V2) |
| `packages/cli` | The `doodley` command |
| `packages/mcp` | The MCP server |
| `examples/basic` | A three-section example that scores 100 |
| `fixtures/` | Tiny broken sites, each of which must fail one rule |
| `docs/adr` | Architecture decisions |

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
