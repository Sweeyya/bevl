# Toros: Testing

This file is the full testing plan. `PROJECT_PLAN.md` §11 is the short version.

The big idea: **we test the sites we make the same way a picky user would.** Load it, look at it, scroll it, click the menu, use the keyboard, turn on reduced motion, use a phone. Then give a score and a fix for every problem. That tester is `toros check`, and we use it in three places:

1. The user's agent runs it (through the MCP or the CLI) and fixes problems before the user sees them.
2. Our CI runs it on every example and demo.
3. Our golden tasks use its score to judge our MCP and skill.

---

## 1. The 8 layers

| #   | Layer                                    | Runs where                          | When                       |
| --- | ---------------------------------------- | ----------------------------------- | -------------------------- |
| 1   | Unit tests (Vitest)                      | every package                       | every PR                   |
| 2   | `toros check`                            | users' projects, our examples       | every agent loop, every PR |
| 3   | Broken fixtures                          | `fixtures/broken/`                  | every PR                   |
| 4   | Screenshot tests                         | demos and examples                  | every PR                   |
| 5   | Speed tests (Lighthouse CI + 3D budgets) | built demos                         | every PR                   |
| 6   | Accessibility tests (axe + our own)      | inside `check`                      | every PR                   |
| 7   | MCP golden tasks                         | `golden/tasks/` through Claude Code | nightly, before release    |
| 8   | Human check on a real iPhone             | The demo site                       | daily                      |

---

## 2. Test mode (in `@toros/core`)

Screenshots and checks are only useful if the site does the same thing every run. Test mode makes that true.

- Turn it on with the URL `?toros-test` (and optional `&seed=<n>`, default `1`).
- The R3F canvas uses `frameloop="never"`. Time only moves when the test calls `step(ms)`, which calls `advance()` in fixed steps of 1000/60 ms. Check how `advance()` works in the R3F version we pin and write it down in `docs/adr/002-test-mode.md`.
- All randomness in our packages goes through a seeded random function. No `Math.random`, `Date.now` or timers in our runtime code paths.
- Assets load from the project folder only. No CDN at runtime.
- Fonts must finish loading before `ready` resolves.

### 2.1 Test bridge: `window.__toros` (test mode only)

| Member         | What it gives                                                                |
| -------------- | ---------------------------------------------------------------------------- |
| `ready`        | Promise. Resolves when the scene, assets and fonts are loaded.               |
| `step(ms)`     | Moves time forward. Returns `{ time, frame }`.                               |
| `sections()`   | Every section: `{ id, index, anchor (scroll position), cameraPose, domId }`. |
| `camera()`     | `{ position, quaternion, up, fov, sectionId }`.                              |
| `scroll()`     | Current scroll progress 0 to 1.                                              |
| `stats()`      | Triangles, draw calls, geometries, textures, estimated texture MB.           |
| `materials()`  | Every material and its colors.                                               |
| `textMeshes()` | Any 3D text in the scene and how many characters it has.                     |
| `mascot()`     | If present: `{ visible, screenBox, state }`.                                 |
| `events()`     | Ordered log: section entered, nav clicked, glide start and end, errors.      |

The checker moves the site only with **real browser input** (mouse wheel, touch, clicks, keyboard). The bridge is for reading, plus `step()`.

---

## 3. How `toros check` runs

1. Lint the project config (`toros.json`, tokens file, assets exist). Stop if this fails.
2. Build or serve the project. Start headless Chromium through Playwright.
3. For each viewport:
   - **desktop:** 1440 × 900, dpr 1
   - **phone:** 390 × 844, dpr 3, touch on
4. Open `?toros-test`, wait for `ready`, record the WebGL renderer name (GPU or software).
5. Run every rule in §4.
6. Write `.toros/reports/<runId>/report.json`, pictures, and a short summary.
7. Print the score. Every problem prints `✗ <message>` and `Fix: <what to do>`.

Flags: `--json`, `--viewport <name>`, `--rule <id>` (run one rule), `--verify-determinism` (run twice and compare), `--update-baselines` (screenshots only).

Exit codes: `0` passed · `1` errors found · `2` bad usage · `3` environment problem (no browser, port in use).

---

## 4. Check rules

Each rule has a stable id, a default severity (`error`, `warn`, `info`), a pass rule, and a fix message. The design rule column points to `PROJECT_PLAN.md` §6.

### 4.1 Load and render

| Rule id                | Pass rule                                                                                                             | Severity |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| `load/ready`           | `ready` resolves within the `readyMs` budget                                                                          | error    |
| `load/console-errors`  | No console errors or page errors                                                                                      | error    |
| `load/failed-requests` | No failed network requests                                                                                            | error    |
| `load/webgl`           | WebGL2 works. Record the renderer. Software renderer is `info`.                                                       | error    |
| `render/not-blank`     | The 3D canvas alone is not one flat color, not all black, not magenta (nav and HTML layer are hidden while measuring) | error    |
| `render/resolution`    | Canvas pixel size equals CSS size × dpr (±1 px)                                                                       | warn     |
| `render/no-nan`        | No object has NaN position, rotation or scale                                                                         | error    |
| `render/fallback`      | With WebGL turned off, the static fallback (`[data-toros-fallback]`) shows every section title                        | error    |

### 4.2 Scroll (design rules 1, 3, 4)

The checker scrolls from top to bottom in 40 wheel steps (touch swipes on phone), stepping time after each, then back to the top.

| Rule id                        | Pass rule                                                                                                                           | Severity |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `scroll/reaches-every-section` | Every section is entered, in order                                                                                                  | error    |
| `scroll/end-reachable`         | The last section is reachable and the page can scroll back to the top                                                               | error    |
| `scroll/no-jumps`              | Camera never moves more than `maxStepMeters` in one step (no teleports)                                                             | error    |
| `scroll/speed-limit`           | Camera speed and turn speed stay under the limits in §6                                                                             | warn     |
| `scroll/no-roll`               | Camera up direction stays within 2° of world up                                                                                     | error    |
| `scroll/no-spin`               | Camera turns less than 15° per scroll step                                                                                          | error    |
| `scroll/no-free-roam`          | W, A, S, D and drag do not move the camera off the path                                                                             | error    |
| `scroll/reverse`               | Scrolling back to the top returns the camera to the start pose (within 1 cm, 0.5°)                                                  | warn     |
| `scroll/eased`                 | Camera speed has no sudden spikes (speed change between steps under the limit)                                                      | warn     |
| `scroll/snap-settles`          | After stopping between two beats, progress rests on a beat (opt-out: snap mode `none` or `snap: false`)                             | warn     |
| `scroll/snap-no-trap`          | From every beat, keyboard and wheel reach the next and previous beat                                                                | error    |
| `scroll/deterministic`         | Two fresh loads with the same seed give the same camera at 5 scroll positions (1e-6)                                                | error    |
| `scroll/motion-allowances`     | Reports each `allow.roll/spin/fastMoves` opt-out; never lowers the score. `no-roll` and `no-jumps` skip when their allowance is set | info     |

### 4.3 Navigation (design rule 5)

| Rule id            | Pass rule                                                                                              | Severity |
| ------------------ | ------------------------------------------------------------------------------------------------------ | -------- |
| `nav/menu-exists`  | A real `<nav>` with one link per section                                                               | error    |
| `nav/link-glides`  | Clicking each link ends on that section's beat, and the camera never moves more than 1.5 m in one step | error    |
| `nav/hash-updates` | The URL hash changes to the section id                                                                 | warn     |
| `nav/focus-moves`  | Focus moves to the section heading after the glide                                                     | warn     |
| `nav/buttons-work` | Every button and link in the HTML layer does something (navigates, glides, or emits an event)          | error    |

### 4.4 HTML layer and search (design rule 2)

| Rule id                  | Pass rule                                                                                                                              | Severity       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `html/section-text`      | Every 3D section has a DOM section with a heading and text                                                                             | error          |
| `html/order-matches`     | DOM section order matches the 3D section order                                                                                         | error          |
| `html/no-canvas-copy`    | No 3D text mesh holds more than 40 characters (body copy belongs in HTML). A mesh counts as text when `userData.torosText` is a string | error          |
| `html/text-faces-viewer` | HTML text is not rotated more than 5°                                                                                                  | warn           |
| `html/static-content`    | The raw HTML (before JavaScript runs) contains every section heading                                                                   | warn at launch |
| `seo/title`              | Page has a title                                                                                                                       | error          |
| `seo/meta-description`   | Page has a meta description                                                                                                            | warn           |
| `seo/one-h1`             | Exactly one `h1`                                                                                                                       | warn           |
| `seo/img-alt`            | Every image has alt text                                                                                                               | error          |
| `seo/lang`               | `<html>` has a `lang`                                                                                                                  | warn           |

### 4.5 Accessibility (design rule 6)

axe can't see the 3D pixels behind text, so we add our own checks.

| Rule id                       | Pass rule                                                                                                                                                                                                                | Severity |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `a11y/axe`                    | No serious or critical axe violations on the HTML layer                                                                                                                                                                  | error    |
| `a11y/contrast-over-3d`       | For each text element, sample the rendered pixels behind it at every section. Contrast is at least 4.5:1 (3:1 for large text). Gives a `suggestedColor`.                                                                 | error    |
| `a11y/keyboard`               | Tab reaches the menu and every link. Enter starts the glide.                                                                                                                                                             | error    |
| `a11y/keyboard-reaches-beats` | ArrowDown visits every beat in order, ArrowUp returns, Home and End reach the ends                                                                                                                                       | error    |
| `a11y/focus-visible`          | Focused elements show a visible outline                                                                                                                                                                                  | error    |
| `a11y/skip-link`              | There is a "skip to content" link                                                                                                                                                                                        | warn     |
| `a11y/reduced-motion`         | With reduced motion on, the camera moves less than 10% as far while scrolling (travel = metres plus radians), sections still change with fades, and the keyboard reaches every beat. Skipped with `allow.reducedMotion`. | error    |
| `a11y/canvas-hidden`          | The canvas has `aria-hidden="true"` or `role="img"` with a label                                                                                                                                                         | warn     |

### 4.6 Budgets

| Rule id              | Pass rule                                             | Severity |
| -------------------- | ----------------------------------------------------- | -------- |
| `budgets/triangles`  | Under budget at every section (warn at 90%)           | error    |
| `budgets/draw-calls` | Under budget at every section                         | error    |
| `budgets/texture-mb` | Under budget                                          | error    |
| `budgets/model-mb`   | Total model files under budget                        | error    |
| `budgets/js-kb`      | JavaScript sent to the browser under budget (gzipped) | warn     |

Load speed on a phone is tested with Lighthouse CI in `perf.yml` (§6), not inside `check`, because it is slow.

### 4.7 Brand

| Rule id               | Pass rule                                                                                                          | Severity |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| `brand/palette`       | Every non-neutral material color is within CIE76 ΔE of 10 or less from a brand token color (skipped with no brand) | warn     |
| `brand/fonts`         | Visible nav links, h1-h3 and paragraphs start with a brand font (skipped with no brand)                            | warn     |
| `brand/tokens-used`   | The brand primary, secondary and accent colors each appear in a material or in the page's computed CSS colors      | warn     |
| `brand/sharp-corners` | No visible element has a rounded corner, unless the brand file sets a corner radius above 0                        | warn     |

Decision for `brand/tokens-used`: only `primary`, `secondary` and `accent` are required (background, surface and text are chrome). A color counts as used when a material color, or a computed `color`, `background-color` or border color of any element, is within ΔE 10 of it. Severity is `warn`, not `info`, so unused brand colors lower the score. Skipped with no brand.

### 4.8 Optimizer

| Rule id                | Pass rule                                                           | Severity |
| ---------------------- | ------------------------------------------------------------------- | -------- |
| `optimizer/smaller`    | Optimized files are smaller than the originals                      | error    |
| `optimizer/looks-same` | Pictures before and after optimizing differ by 2% of pixels or less | error    |

### 4.9 Mascot (V2)

| Rule id                    | Pass rule                                              | Severity |
| -------------------------- | ------------------------------------------------------ | -------- |
| `mascot/visible`           | Mascot is on screen in the sections where it should be | error    |
| `mascot/idle-moves`        | Idle motion changes the picture over 2 seconds         | warn     |
| `mascot/not-covering-text` | Mascot's screen box never overlaps a text element      | error    |
| `mascot/reduced-motion`    | With reduced motion on, the mascot barely moves        | error    |

### 4.10 Determinism

| Rule id                  | Pass rule                                                                                                     | Severity |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | -------- |
| `determinism/same-twice` | With `--verify-determinism`: two runs give the same report and pictures that differ by 0.1% of pixels or less | error    |

---

## 5. Score and report

### 5.1 Score (0 to 100)

| Group                 | Weight                                                            |
| --------------------- | ----------------------------------------------------------------- |
| Load and render       | 15                                                                |
| Scroll                | 20                                                                |
| Navigation            | 10                                                                |
| HTML layer and search | 15                                                                |
| Accessibility         | 15                                                                |
| Budgets               | 15                                                                |
| Brand                 | 5                                                                 |
| Mascot                | 5 (if there is no mascot, its weight is shared out to the others) |

- A group's score is the share of its rules that pass, averaged over viewports. Errors count as fail. Warnings count as half a pass. Info doesn't count.
- **Hard gates:** the score is 0 if `load/ready`, `render/not-blank` or `scroll/reaches-every-section` fails.
- **"Done" means:** score 90 or more **and** no errors.

### 5.2 Report (`report.json`)

```json
{
  "runId": "2026-11-20T10-00-00Z-ab12",
  "tool": { "name": "toros", "version": "0.1.0" },
  "project": "demo",
  "seed": 1,
  "renderer": { "desktop": "ANGLE (Apple M2)", "phone": "ANGLE (Apple M2)" },
  "score": 93,
  "passed": true,
  "groups": { "scroll": { "score": 100, "weight": 20 } },
  "findings": [
    {
      "rule": "a11y/contrast-over-3d",
      "severity": "error",
      "viewport": "phone",
      "section": "pricing",
      "message": "Heading contrast is 2.8:1 over the glass background",
      "fix": "Change the heading color to #1A1A2E or add a solid backing panel",
      "evidence": {
        "screenshot": ".toros/reports/.../pricing-phone.png",
        "data": { "ratio": 2.8 }
      }
    }
  ],
  "artifacts": ["..."]
}
```

The report has a JSON Schema in `packages/check/schema/report.schema.json`. The MCP tool returns this same JSON.

---

## 6. Starting numbers (argue about these, then lock them in `toros.budgets.json`)

| Budget                                            | Desktop | Phone   |
| ------------------------------------------------- | ------- | ------- |
| Triangles on screen                               | 500,000 | 150,000 |
| Draw calls                                        | 200     | 80      |
| Texture memory                                    | 64 MB   | 24 MB   |
| Model files total                                 | 8 MB    | 8 MB    |
| JavaScript (gzipped)                              | 400 KB  | 400 KB  |
| `ready` time (local)                              | 3 s     | 5 s     |
| Camera max move per scroll step (`maxStepMeters`) | 1.5 m   | 1.5 m   |
| Camera max turn per scroll step                   | 15°     | 15°     |

Lighthouse (phone profile, 3 runs, median), in `lighthouserc.json`:

| Metric                   | Limit          |
| ------------------------ | -------------- |
| Largest Contentful Paint | 2.5 s or less  |
| Cumulative Layout Shift  | 0.1 or less    |
| Total Blocking Time      | 300 ms or less |
| Performance score        | 0.8 or more    |

The table above is the target. `toros.budgets.json` keeps the target numbers. What `pnpm test:perf` enforces today (`lighthouserc.json`, `tools/perf.mjs`) is a measured starting point for the example, because the example is client-rendered and loads one 1.1 MB (303 KB gzip) script before anything paints:

| Metric                   | Enforced now | Why                                                                                                                                                                                                                                                                |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Largest Contentful Paint | 6.5 s        | Measured 4.6 to 5.9 s for `examples/basic` (Lighthouse mobile, simulated slow 4G, 4x CPU slowdown, SwiftShader WebGL). FCP equals LCP, so the cost is the script download and start. Headroom for runner noise. Lower it as the bundle shrinks; the goal is 2.5 s. |
| Cumulative Layout Shift  | 0.1          | The Core Web Vitals "good" line. Measured 0.                                                                                                                                                                                                                       |
| Total Blocking Time      | 300 ms       | Starting guess, kept. Measured 0 to 46 ms on a quiet machine; it rose past 450 ms only while the machine was heavily loaded.                                                                                                                                       |
| Performance score        | 0.5          | Measured 0.52 to 0.72 on a heavily loaded dev machine (the dev machine was the only one available; CI numbers will tell). The goal is 0.8.                                                                                                                         |

Lighthouse runs headless Chromium with software WebGL (SwiftShader), so GPU cost is not measured; this test covers load and main-thread cost only. Frame rate and draw cost are covered by the `budgets/*` check rules.

---

## 7. Broken fixtures (`fixtures/broken/`)

Each folder is a tiny site with **one** problem and an `expected.json`:

```json
{ "mustFail": ["scroll/no-jumps"], "mayAlsoFail": [] }
```

The test fails if a `mustFail` rule passes, or if any rule not listed fails.

| Fixture                   | Must fail                      |
| ------------------------- | ------------------------------ |
| `blank-canvas`            | `render/not-blank`             |
| `console-error`           | `load/console-errors`          |
| `missing-model`           | `load/failed-requests`         |
| `nan-camera`              | `render/no-nan`                |
| `no-fallback`             | `render/fallback`              |
| `camera-teleport`         | `scroll/no-jumps`              |
| `camera-roll`             | `scroll/no-roll`               |
| `camera-spin`             | `scroll/no-spin`               |
| `wasd-roam`               | `scroll/no-free-roam`          |
| `unreachable-section`     | `scroll/reaches-every-section` |
| `no-nav`                  | `nav/menu-exists`              |
| `link-jumps`              | `nav/link-glides`              |
| `dead-button`             | `nav/buttons-work`             |
| `text-in-canvas`          | `html/no-canvas-copy`          |
| `missing-section-text`    | `html/section-text`            |
| `section-order-mismatch`  | `html/order-matches`           |
| `low-contrast-over-glass` | `a11y/contrast-over-3d`        |
| `no-keyboard`             | `a11y/keyboard`                |
| `ignores-reduced-motion`  | `a11y/reduced-motion`          |
| `too-many-triangles`      | `budgets/triangles`            |
| `huge-textures`           | `budgets/texture-mb`           |
| `off-brand-colors`        | `brand/palette`                |
| `unused-brand-colors`     | `brand/tokens-used`            |
| `default-grey-look`       | `brand/not-default-look`       |
| `rounded-corners`         | `brand/sharp-corners`          |
| `wrong-font`              | `brand/fonts`                  |
| `random-without-seed`     | `scroll/deterministic`         |
| `snap-never-settles`      | `scroll/snap-settles`          |
| `snap-trap`               | `scroll/snap-no-trap`          |
| `keyboard-skips-beat`     | `a11y/keyboard-reaches-beats`  |
| `mascot-covers-text` (V2) | `mascot/not-covering-text`     |

Rule: **every new check rule ships with its broken fixture in the same PR.**

---

## 8. MCP golden tasks (`golden/tasks/`)

Five fixed prompts run through Claude Code with our MCP and skill, in a clean temp folder. Drafts:

1. "Make a 3D landing page for a coffee roaster using this DESIGN.md." (we give the file)
2. "Make a 4-section portfolio site for a product designer using these design tokens." (we give the JSON)
3. "Add a pricing section to this site." (we give a finished site)
4. "Switch this site to this new brand kit." (we give a site and a new kit)
5. "This model is too heavy. Make the site fast on phones without changing how it looks." (we give a heavy model)

Each task folder has `prompt.md`, its input files, and `expected.json` (for example: number of sections, which rules must pass).

Pass means: the project builds, `check` scores 90 or more with no errors, and `expected.json` holds. We save the score, time taken and tokens used for every run so we can see trends.

How to run Claude Code without a person in the loop: use its non-interactive print mode with our MCP config. Look up the exact flags in the current Claude Code docs and write them in `golden/README.md`. Golden tasks cost tokens, so they run nightly and before release, not on every PR.

---

## 9. Screenshot tests

- Run in test mode, seed 1.
- Pictures at: each section's anchor, the halfway point between sections, and the top of the page. Both viewports.
- Compare with pixelmatch. A test fails if more than 0.5% of pixels differ.
- Implemented in `tools/visual.mjs`. Per example and viewport it takes 3 pictures: page top, halfway between the first two sections, and the last section. Time moves only through `step()`. Pixelmatch per-pixel threshold is 0.1.
- Baselines are stored per platform in `tools/__screenshots__/<platform>/` because fonts and software WebGL differ between macOS and Linux. A missing baseline fails the run.
- CI runs on `ubuntu-latest` with the Playwright Chromium pinned by `@toros/check` and compares with `linux` baselines. Those are made only by the "Update visual baselines" workflow (same runner), never by hand. Locally, `pnpm test:visual -- --update` makes baselines for your own platform.
- A PR that changes baselines must show old and new pictures in the PR description.

---

## 10. Human check (daily, real iPhone)

Open the demo site on a real iPhone, then answer each item yes or no in the PR or the daily note:

1. It loads in under 3 seconds on mobile data.
2. Scrolling feels smooth. No stutter, no jumps.
3. All text is sharp and easy to read.
4. The menu works and glides to the right section.
5. Nothing feels like a game. I never feel lost.
6. It looks like the brand.
7. The phone doesn't get hot after 1 minute.
8. Reduced motion (Settings → Accessibility → Motion) gives soft fades.
9. VoiceOver reads the sections in order.
10. I would show this to someone.

Anything that fails here but passed `check` becomes a new check rule or a better number.

---

## 11. How to add a new check rule

1. Pick an id: `<group>/<name>`.
2. Write the pass rule as a number when possible.
3. Start it as `warn` (see `PROJECT_PLAN.md` §12 for why).
4. Add its broken fixture and `expected.json`.
5. Add unit tests for its math and an integration test on the fixture.
6. Add a row to the right table in §4 and a `fix` message that tells the agent exactly what to change.
7. Add a changeset.

---

## 12. Commands

| Command                        | What it runs                                                          |
| ------------------------------ | --------------------------------------------------------------------- |
| `pnpm test`                    | Unit tests                                                            |
| `pnpm test:fixtures`           | Every broken fixture against `check`                                  |
| `pnpm check:examples`          | `check` on every example and demo (all must score 90 or more)         |
| `pnpm test:visual`             | Screenshot tests against this platform's baselines                    |
| `pnpm test:visual -- --update` | Remake baselines for this platform                                    |
| `pnpm test:perf`               | Lighthouse CI on the built examples                                   |
| `pnpm test:determinism`        | `check:examples`, then `check` twice per example: findings must match |
| `pnpm golden`                  | The 5 golden tasks (costs tokens)                                     |
