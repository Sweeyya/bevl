---

name: toros
description: Builds branded, fast, accessible scroll-driven 3D websites and verifies them with the Toros checker. Use when the user wants a 3D website, a 3D landing page, a scroll-driven or scroll-animated 3D experience, a branded 3D site from a brand kit, DESIGN.md or design tokens, or describes camera and scroll motion (fly-through, carousel, sphere of screens, room). Also use when asked to check, score, repair or optimize a Toros site or its GLB assets.
license: MIT
compatibility: Needs Node 22+, pnpm, and Chromium for the checker. Works with the Toros MCP server or the toros CLI. Claude Code, Cursor, Codex, Lovable and other Agent Skills clients.
metadata:
version: "1"
---

# Toros

Toros makes a scroll-driven 3D website from a brand. A single `progress` value from 0 to 1 drives the whole scene. Every site is tested in a real browser by `check`, which returns a score from 0 to 100.

**Golden rule: never say a site is done without a passing `check` run, and always paste its score.** Passing means score >= 90 AND zero errors (`passed: true` in the report).

## When to use

Use this skill when the user asks for:

- a 3D website, 3D landing page, animated or scroll-driven 3D page
- a site built from a brand kit, `DESIGN.md`, or design-tokens JSON
- a described scroll experience ("fly through", "carousel", "I am inside a sphere of screens")
- a score, check, fix or speed-up of an existing Toros site, or shrinking a `.glb`

## When not to use

- Plain 2D pages, blogs, dashboards, or forms with no 3D need.
- Games or free-roam 3D worlds. Toros is scroll, swipe, or key driven, one progress value.
- Video editing, Blender modelling, or generating 3D models. Toros uses models you supply.
- Sites that must run without WebGL and have no fallback plan.

## Workflow

Follow these steps in order. Do not skip the check.

1. **Gather inputs.** Ask only for what is missing:
   - Brand: a `DESIGN.md`, a design-tokens `.json`, or colors, fonts and tone in words.
   - Sections: the list of pages or sections (id, title, what each says).
   - Content: real copy and any `.glb` models or images.
   - Scroll feel: how the user wants scrolling to feel, in their own words (see step 4).
2. **Create or open the project.** New site: `create_site` (MCP) or `toros create <name>`. Existing: work in its project root.
3. **Apply the brand.** `read_brand_tokens` on the brand file to inspect it, then `apply_brand` (MCP) or `toros apply-brand`. Pass the tokens to the runtime as `<TorosSite config={config} brand={brandTokens}>`. Never hard-code brand colors that contradict the tokens.
4. **Add sections and author the choreography.** `add_section` (MCP) or `toros add-section`. Put text in each section as real HTML (see Content rules). Write `config.choreography` to match the user's description. Read [references/choreography.md](references/choreography.md) first.
5. **Start the dev server** and run the checker on its localhost URL (see Commands).
6. **Repair loop.** Read every finding and its `Fix:` line, change the source, re-run. Repeat until score >= 90 with zero errors. See [references/repair-loop.md](references/repair-loop.md) and [references/rules.md](references/rules.md).
7. **Only then say done.** Report: the score, `passed` value, number of warnings left and any `allow` opt-outs in use. Paste the final summary line or JSON score. If you cannot get a passing run, say so plainly and show what still fails.

If the request is unclear or conflicts with these rules, ask the user instead of inventing a different design.

## Tools and commands

### MCP tools (server name `toros`)

| Tool                | What it does                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_site`        | Opens a running site, runs every rule, returns a scored report, and writes a report under `<projectDir>/.toros/reports`. Args: `url`, optional `projectDir`, `seed`, `viewport` (`desktop` or `phone`), `ruleId`. |
| `optimize_assets`   | Shrinks a `.glb` inside the project with glTF Transform. Args: `input`, optional `output`, `textureSize` (64 to 4096, default 1024).                                                                              |
| `read_brand_tokens` | Reads a `DESIGN.md` or design-tokens `.json` inside the project and returns parsed brand tokens. Read-only. Arg: `filePath`.                                                                                      |
| `create_site`       | Scaffolds a new Toros site in the project.                                                                                                                                                                        |
| `add_section`       | Adds a section to an existing site.                                                                                                                                                                               |
| `apply_brand`       | Applies brand tokens to the site.                                                                                                                                                                                 |

`create_site`, `add_section` and `apply_brand` are part of the final tool set. Their exact argument names may differ from this page. Read the tool's own input schema before calling and trust it over this file.

### CLI equivalents

| Command                                                                                                   | Purpose              |
| --------------------------------------------------------------------------------------------------------- | -------------------- |
| `toros create <name> [-d <dir>]`                                                                          | Scaffold a new site  |
| `toros add-section ...`                                                                                   | Add a section        |
| `toros apply-brand ...`                                                                                   | Apply brand tokens   |
| `toros optimize <file.glb> [-o <out>] [--texture-size <px>]`                                              | Shrink a GLB         |
| `toros check <url> [--project-dir <dir>] [--seed <n>] [--viewport desktop\|phone] [--rule <id>] [--json]` | Score a running site |

Run `toros <command> --help` for the exact flags of `add-section` and `apply-brand`.

`toros check` exit codes: `0` passed, `1` ran and found issues, `2` bad usage, `3` environment error (browser missing, port in use). Exit `3` is not a site failure: fix the environment, then re-run.

### Check the quick way

1. Start the dev server, for example `pnpm dev`, and note the URL, such as `http://localhost:5173`.
2. `toros check http://localhost:5173` (or MCP `check_site`).
3. Use `--rule <id>` (or `ruleId`) to re-run one rule while repairing, then run the full check once at the end. Only a full run counts as the final result.

## Choreography in one minute

`config.choreography` describes how progress changes the scene. Fields:

- `beats`: one per section, `{ id, at, snap? }`, ordered by `at` from 0 to 1. Every section needs exactly one beat.
- `camera`: start pose `{ position, lookAt?, fov? }`.
- `tracks`: keyframes for any property of any named object, including `camera`.
- `layouts`: place children as `line`, `grid`, `ring`, `onSphere` or `alongPath`. The layout id `sections` places the Section groups. Any other id names a group in the scene and places its children.
- `behaviors`: names registered with `registerBehavior()` for motion data cannot express. Must be pure functions of progress.
- `input`: which inputs drive progress, separately for mouse (`fine`) and touch (`coarse`).
- `snap`: `directional` (default), `nearest`, `strong`, `none`.
- `allow`: explicit opt-outs `roll`, `spin`, `fastMoves`.

If `choreography` is missing, the site gets a default forward fly-through. An invalid choreography is reported on the console and falls back to the default, so always check for `load/console-errors` findings. Translate user descriptions with the steps and four worked examples in [references/choreography.md](references/choreography.md).

Recipes: `@toros/core` exports `recipes` (`fly-through`, `sphere-of-screens`, `carousel`, `room`, `horizontal-gallery`, `orbit-product`). `recipes["room"].create(sectionIds)` returns a ready `Choreography`. Use one as a starting point and then edit it.

## Content rules

- **Body text must be real HTML**, outside the canvas, never only drawn as 3D text or textures. Screen readers, search engines and the `html/section-text` rule need it. Each section needs a DOM element with a heading.
- Put text on screen with the Section `html` prop: `<Section id="hero" title="Hero" html={<><h2>Title</h2><p>Real copy.</p></>}>`.
- No walls of text in 3D. Keep on-screen copy to a heading and a few short lines per section.
- Keyboard must work and cannot be disabled: Arrow keys, Home, End, PageUp, PageDown, Space and Tab to nav links. Never stop those keydown events.
- Reduced motion must work. Keep motion gentle: no camera roll, no teleporting moves (max 1.5 m per scroll step), no fast spin.
- Provide a page `<title>` and a `<meta name="description">` in `index.html`.
- Keep geometry small: triangles and draw calls have budgets. Run `optimize_assets` on every `.glb` you add.

## Safety rules

- The MCP only reads and writes inside the project root (`TOROS_PROJECT_ROOT`, default the working folder). Do not try to escape it with `..` or absolute paths.
- `check_site` only opens localhost URLs. Remote sites need the user to set `TOROS_ALLOW_REMOTE=1` themselves. Never set it on your own.
- Test mode (`?toros-test`) runs only on localhost unless `toros.json` sets `testMode`. Do not widen `testMode` to pass a check without asking the user.
- Never edit generated checker reports under `.toros/reports`. Re-run the check instead.
- Never disable, skip, or filter out rules to reach a passing score. `--rule` is for quick iteration only, never for the final run.
- Use `allow` opt-outs (`roll`, `spin`, `fastMoves`) only when the user asked for that motion. Say so in your final message. The checker lists each one as an info finding and skips the matching rule.
- Do not use `Math.random`, `Date.now`, or timers in scene code or behaviors. Use the seeded `rand()` passed to behaviors.
- Do not add dependencies without checking the version on npm. Pin exact versions.

## Reference files

- [references/choreography.md](references/choreography.md): translating a described scroll experience into beats, layouts and tracks, with worked examples.
- [references/rules.md](references/rules.md): every checker rule with meaning and typical fix, scoring, and hard gates.
- [references/repair-loop.md](references/repair-loop.md): how to read a report and the step-by-step repair loop.
