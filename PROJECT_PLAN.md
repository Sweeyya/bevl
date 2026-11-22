# Doodley: Project Plan

This file explains the whole idea and every file in our repo. Read it before you write code.

The name is **Doodley**. The CLI is `doodley`. Packages are `@doodley/<name>`.

The full testing plan is in `TESTING.md`. Read it before you write any test or any feature.

---

## 1. The Idea in One Line

An open source tool that turns any brand into a fast, accessible 3D website, used straight from Claude, ChatGPT, Cursor or Lovable through an MCP. **Every site it makes comes tested.**

---

## 2. The Problem

- People want sites that stand out. 3D does that.
- Today, 3D sites are hard to build. You glue pieces from many places (21st.dev, Unicorn Studio, Spline).
- 3D sites are often slow on phones.
- Search engines and screen readers can't read text inside a 3D canvas.
- Simple mascots (no arms or legs) are hard to rig and animate.
- Nobody turns a design system into a full 3D brand world.
- **AI agents can't see what they built.** They write 3D code, but they can't tell if the screen is blank, the scroll is jumpy, or the text is hard to read.

---

## 3. What It Does

1. Takes a brand kit or design system in.
2. Builds the whole website as a 3D space.
3. Keeps it feeling like a website, so it never feels like a game.
4. Adds the brand mascot and makes it move.
5. Shrinks models and effects so the site loads fast.
6. Adds a real HTML layer so search engines and screen readers work.
7. **Checks the site and scores it, so the agent can find and fix problems before the user sees them.**
8. Writes everything into the user's own project. They own the code.

---

## 4. Who It Is For

- **Start:** founders, designers and creators who want a portfolio or landing page that stands out.
- **Later:** agencies and brands.

---

## 5. How People Use It

1. They type in Claude (or ChatGPT, Cursor, Lovable): "Make my site a 3D world with our brand kit and mascot."
2. Our MCP asks a few design questions with options. They can pick one or type their own idea.
3. Our MCP writes the site into their project folder.
4. **Our MCP runs `check`. The agent reads the report and fixes every error, then runs `check` again until the score is 90 or higher.**
5. They run it on localhost and look around.
6. They deploy to Vercel or anywhere they want.

**We don't host anything.** Their computer runs the optimizer and the checker. Their AI plan pays for the tokens. Their host serves the site. Our cost is close to zero.

---

## 6. Design Rules: It Must Feel Like a Website

These rules are built into the engine. Every feature has to follow them. **`check` tests every rule** (see `TESTING.md` §4).

1. **Progress is the main control.** Scroll, wheel, touch, swipe, drag or tap move one progress value from 0 to 1, and a choreography spec turns that value into the whole scene state (`docs/adr/003-scroll-choreography.md`). Keyboard always works. No WASD and no free roaming off the choreography.
2. **Text stays flat and crisp.** Text comes from the HTML layer and faces the viewer.
3. **Depth shows importance.** Things closer to the viewer matter more. Nobody needs to explore to find content.
4. **Motion is gentle by default.** No camera spins or tilts, smooth easing and a speed limit. A spec can opt out on purpose with `allow`, and the report shows the opt-out.
5. **Navigation is normal.** A real menu and real buttons. Clicking a link glides the camera to that section.
6. **Reduced motion mode.** If the user turns on reduced motion, we use soft fades.
7. **Test mode is repeatable.** With `?doodley-test`, the site runs on a clock we control and uses seeded randomness. The same test gives the same pictures every time.

---

## 7. Features

### V1 (launch Tuesday)

- **Core runtime:** sections in 3D, a **scroll choreography** (beats, tracks on any property, layouts, behaviors, inputs per device), an HTML layer, **test mode**.
- **Brand tokens in:** read design token JSON or a DESIGN.md file. Turn colors, fonts and material style into 3D materials and lighting.
- **Optimizer CLI:** one command that compresses and simplifies models.
- **Effects pack:** glass and a shader background.
- **Checker:** `doodley check` loads the site in a real browser, scrolls it, clicks the menu, takes pictures and gives a score from 0 to 100 with a fix for every problem.
- **MCP server:** tools to create a site, add a section, apply a brand, optimize assets **and check the site**.
- **Skill:** a SKILL.md so agents know when to use us, and that they must run `check` before they say they are done.
- **Demo:** the Spectr landing page rebuilt in 3D, with its check report.

### Scroll choreography (replaces camera modes)

Decision: `docs/adr/003-scroll-choreography.md`. Contract: `packages/core/src/choreography/types.ts`.

| Task                | Package | Done means                                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 Timeline runtime | `core`  | Spec is validated with Zod (errors give the field path and a fix), keyframes and easing evaluate any property, camera tracks support curves, layout helpers place children, behaviors register by name, a default spec is built from `sections`, `cameraMode` and `camera/modes.ts` are deleted, the basic example still goes red → green → blue, and unit tests pass. |
| C2 Inputs           | `core`  | Native scroll, wheel, touch, drag, horizontal swipe and tap/click advance all write one progress target. Inputs are chosen per pointer type, keyboard and beat links always work, smoothing is frame-rate independent and skipped in test mode, and unit tests pass.                                                                                                   |
| C3 Checker rules    | `check` | Scroll rules read beats. New rules: `scroll/deterministic`, `a11y/keyboard-reaches-beats` and `scroll/motion-allowances` (reports opt-outs). Each has a broken fixture and tests.                                                                                                                                                                                      |
| C4 Recipes          | `core`  | Example specs (linear fly-through, sphere of screens, carousel, room) live under `recipes/` as data for agents, not as an enum.                                                                                                                                                                                                                                        |

### V2 Preview (if time allows)

- **Mascot motion:** for simple characters with no limbs. Bend, squash, bob and blink using shader deformers. No bones needed.
- **Mascot behaviors:** idle, wave, point, follow the scroll, special loading screen.
- **Mascot checks:** the mascot is on screen, its idle motion moves, and it never covers text.

### Later

- Real auto rigging with bones.
- Blender add on.
- Phone testing in the cloud (paid).
- Visual editor overlay.
- Multi page routing.
- Marketplace where designers sell effects and worlds.
- **Score as a reward:** use `check` scores to train and test AI agents (RL environments). See `docs/archive/PLAN-checker-first.md` for the old long-term plan.

---

## 8. How It Is Built

We use a **monorepo**: one repo with many small packages. People can install only what they need.

**Main tools:**

- **TypeScript** for all code.
- **React Three Fiber** and **drei** for 3D. Test mode uses `frameloop="never"` and `advance()` to step time ourselves. Check the exact `advance()` behavior for the R3F version we pin, because it changed between versions.
- **glTF Transform** for shrinking models.
- **pnpm workspaces** to manage packages.
- **Turborepo** to run builds fast.
- **Changesets** for versions and changelogs.
- **Vitest** for unit tests.
- **Playwright** for browser and screenshot tests, and as the engine inside `check`.
- **@axe-core/playwright** for accessibility scans of the HTML layer.
- **Lighthouse CI** for load speed on a phone profile.
- **pixelmatch** for comparing pictures.
- **Biome** for linting and formatting.
- **GitHub Actions** for CI.

**Packages:**

| Package     | What it does                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `core`      | 3D runtime. Sections, scroll camera path, design rules, **test mode and test bridge**.                       |
| `tokens`    | Reads design systems. Turns tokens into 3D materials and lights.                                             |
| `a11y`      | HTML layer, keyboard navigation, screen reader support, reduced motion.                                      |
| `optimizer` | Shrinks models and textures. Enforces the performance budget.                                                |
| `effects`   | Glass, shader backgrounds and other effects.                                                                 |
| `mascot`    | Mascot motion and behaviors.                                                                                 |
| `check`     | **The checker. Runs the site in a browser, tests every design rule and budget, and writes a scored report.** |
| `mcp`       | The MCP server that agents call.                                                                             |
| `cli`       | Command line tool. Examples: `doodley optimize scene.glb`, `doodley check`                                   |

---

## 9. Repo Map

```
doodley/
  packages/
    core/
    tokens/
    a11y/
    optimizer/
    effects/
    mascot/
    check/
    mcp/
    cli/
  apps/
    docs/          docs website
    playground/    live demos to try things
  examples/
    spectr/        our first demo site
  fixtures/
    broken/        small sites that are broken on purpose, one problem each
  golden/
    tasks/         the 5 MCP golden task prompts and their expected checks
  skills/
    doodley/
      SKILL.md
  docs/
    adr/           decision records
    archive/       old plans
  .github/
    workflows/
      ci.yml
      visual.yml
      perf.yml
      golden.yml
      release.yml
      scorecard.yml
    ISSUE_TEMPLATE/
      bug.md
      feature.md
    PULL_REQUEST_TEMPLATE.md
    dependabot.yml
    CODEOWNERS
  .changeset/
  AGENTS.md
  CLAUDE.md
  PROJECT_PLAN.md
  README.md
  ARCHITECTURE.md
  DEVELOPMENT.md
  TESTING.md
  RELEASING.md
  CONTRIBUTING.md
  CHANGELOG.md
  SECURITY.md
  CODE_OF_CONDUCT.md
  ROADMAP.md
  GOVERNANCE.md
  DESIGN.md
  LICENSE
  server.json
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  biome.json
```

---

## 10. Every File and Why

### 10.1 Files for AI Agents

| File                        | What goes in it                                                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                 | Main rules for every agent (Devin, Codex, Cursor). Build commands, test commands, code style, folders to never touch, commit rules.                                                                                                                        |
| `CLAUDE.md`                 | Short. First line is `@AGENTS.md` so Claude reads the same rules. Add Claude only notes here.                                                                                                                                                              |
| `skills/doodley/SKILL.md`   | Tells agents when to use our tool and the work loop: build, run `check`, fix, run `check` again. The description should match how people ask. Example: "Use when the user wants a 3D website, a 3D landing page, an animated mascot or a branded 3D site." |
| `apps/docs/public/llms.txt` | Short summary of our docs for AI tools to read.                                                                                                                                                                                                            |

### 10.2 Engineering Docs

| File              | What goes in it                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ARCHITECTURE.md` | What each package does. How data moves from brand kit to finished site to check report. Read this first before editing. |
| `DEVELOPMENT.md`  | How to set up the repo, run it locally and debug it.                                                                    |
| `TESTING.md`      | Every test type, how to run it, how to approve new screenshots, every `check` rule.                                     |
| `RELEASING.md`    | How versions, changesets and npm publishing work.                                                                       |
| `docs/adr/`       | One short file per big decision and why we made it. Example: `001-react-three-fiber.md`, `002-test-mode.md`.            |
| `DESIGN.md`       | Our own brand system, written for agents. Our tool also reads files like this from users.                               |

### 10.3 Files for Contributors and Users

| File                               | What goes in it                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                        | Most important file. One line on what it does, a GIF, one command install, a short example, a sample check report, links to docs. |
| `CONTRIBUTING.md`                  | How to help. Setup steps, how to open a PR, what a good PR looks like.                                                            |
| `CHANGELOG.md`                     | What changed in each version. Changesets writes this for us.                                                                      |
| `SECURITY.md`                      | How to report security problems privately.                                                                                        |
| `CODE_OF_CONDUCT.md`               | How people should treat each other.                                                                                               |
| `ROADMAP.md`                       | What we plan to build next.                                                                                                       |
| `GOVERNANCE.md`                    | Who makes decisions and how.                                                                                                      |
| `LICENSE`                          | MIT.                                                                                                                              |
| `.github/ISSUE_TEMPLATE/`          | Forms for bug reports and feature ideas. The bug form asks for the `check --json` report.                                         |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist every PR fills out.                                                                                                     |
| `.github/CODEOWNERS`               | Who reviews which folders.                                                                                                        |

### 10.4 Config Files

| File                     | What it does                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `package.json`           | Root scripts like `pnpm build`, `pnpm test`, `pnpm test:visual`, `pnpm check:examples`. |
| `pnpm-workspace.yaml`    | Tells pnpm where the packages live.                                                     |
| `turbo.json`             | Tells Turborepo how to run builds and tests in order.                                   |
| `tsconfig.base.json`     | Shared TypeScript settings.                                                             |
| `biome.json`             | Lint and format rules.                                                                  |
| `.changeset/`            | Small notes about each change. Used for versions.                                       |
| `.github/dependabot.yml` | Bot that keeps dependencies updated.                                                    |
| `server.json`            | Our listing info for the official MCP Registry.                                         |
| `lighthouserc.json`      | Lighthouse CI budgets for the demos.                                                    |
| `doodley.budgets.json`   | Default 3D budgets (triangles, draw calls, texture MB, model MB, load time).            |

### 10.5 CI Workflows (`.github/workflows/`)

CI runs checks on every PR. A PR can't merge until all checks pass.

| Workflow        | When                       | What it checks                                                                                                                                                                                                                                           |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`        | every PR                   | Install, lint, type check, unit tests, build every package, package checks (publint and "Are the types wrong"), bundle size, **every broken fixture fails the check it should fail**, **`check` scores every example 90 or more**, **determinism test**. |
| `visual.yml`    | every PR                   | Opens each demo in test mode, takes pictures at every section and on desktop and phone sizes, and compares them to approved ones.                                                                                                                        |
| `perf.yml`      | every PR                   | Lighthouse on a phone profile (load time, layout shift, blocking time), plus triangle count, draw calls, texture and model size from `check`. Fails if over budget.                                                                                      |
| `golden.yml`    | nightly and before release | Runs the 5 MCP golden tasks through Claude Code. Each result must build and score 90 or more. Saves the scores so we can see if they drop.                                                                                                               |
| `release.yml`   | release PR merge           | Publishes to npm with provenance.                                                                                                                                                                                                                        |
| `scorecard.yml` | weekly                     | Runs OpenSSF Scorecard for a security grade.                                                                                                                                                                                                             |

---

## 11. Testing

3D output is hard to test with unit tests alone. We use 8 layers. Full details, every rule and every number are in `TESTING.md`.

1. **Unit tests:** pure logic. Token to material mapping, budget math, camera path math, MCP tool inputs.
2. **The checker (`doodley check`):** the main test. It runs the site in a real browser and tests every design rule, the HTML layer, accessibility, brand colors and budgets. It gives a score and a fix for each problem. Users' agents run it, our CI runs it, and our MCP runs it.
3. **Broken fixtures:** a small site for each kind of problem (blank screen, jumpy camera, text in the canvas, low contrast, over budget, and more). Each one must fail its check. This tests the tester.
4. **Screenshot tests:** in test mode, so pictures are the same every run. If a picture changes, the test fails and shows the difference.
5. **Speed tests:** Lighthouse on a phone profile plus 3D budgets. Fail the PR if the site gets too heavy or too slow.
6. **Accessibility tests:** axe on the HTML layer, plus our own checks for things axe can't see: text contrast against the 3D pixels behind it, keyboard navigation through every section, and reduced motion.
7. **MCP golden tasks:** 5 fixed prompts run through Claude Code with our MCP. The result has to build and score 90 or more in `check`.
8. **Human check:** open the demo on a real iPhone once a day. No test catches taste. Use the checklist in `TESTING.md` §9.

**Tuning tools:**

- **leva:** sliders on screen for colors, glass thickness, camera speed. Tweak, then copy the numbers into code.
- **Three.js DevTools MCP:** lets Claude inspect and change the live scene.

---

## 12. Releases

1. Every PR includes a small changeset file.
2. A bot opens a release PR that bumps versions and updates the changelog.
3. Merging the release PR publishes to npm.
4. We use npm trusted publishing with provenance. No npm token is stored anywhere, and people can verify the package came from our repo.

We follow semantic versioning:

- **Patch (1.0.1):** bug fixes.
- **Minor (1.1.0):** new features that don't break anything.
- **Major (2.0.0):** breaking changes.

A new `check` rule that makes old sites fail is a **minor** change only if it starts as a warning. Turning a warning into an error is a **major** change.

---

## 13. Getting Found

Order to do these:

1. **npm:** publish packages with good keywords (threejs, react three fiber, mcp, 3d website, mascot, testing).
2. **Official MCP Registry:** add `server.json` and run `mcp-publisher publish`. Our name will start with `io.github.sweeyya/`. Other directories copy from it.
3. **skills.sh:** so people can run `npx skills add sweeyya/doodley`.
4. **Claude directory:** submit our plugin bundle (skills plus MCP) from GitHub once docs and demos look polished.
5. **GitHub topics:** threejs, react three fiber, mcp, 3d, webgl.
6. **Docs site:** one page per use case, a playground, a demo gallery, and a before and after page (agent alone vs agent with Doodley, with both check scores).

Stars don't matter for listing. Good demos bring stars.

---

## 14. How We Work Together

### Branches

- `main` is protected. Nobody pushes to it directly.
- Every change happens on a branch. Name it like `feat/glass-effect` or `fix/camera-jitter`.
- Merge to `main` only through a PR.

### Commits

- Agents (Devin, Claude, Codex) work on branches only.
- Agents never commit to `main`.
- No AI co author lines or AI attribution in commits.
- We squash and commit the final changes ourselves before merging.

### PRs

- Small. One feature per PR.
- Every PR has a plain language summary, screenshots and a short screen recording if it changes visuals.
- **Every PR that changes a demo or a package that affects output pastes the `check` score before and after.**
- Every PR has a changeset.
- The other person reviews before merging.
- CI must be green.

### Using Devin

- One package per task.
- Every task has a clear spec, tests and a "done means" line.
  - Example: "Done means the glass hero renders, passes the screenshot test, stays under budget and the Spectr demo still scores 90 or more."
- Every new feature comes with the `check` rule that tests it and a broken fixture for that rule.
- Run several Devin tasks at once.
- Review everything Devin makes.

### Who Owns What

Fill this in together:

| Area               | Owner |
| ------------------ | ----- |
| core and tokens    |       |
| a11y and optimizer |       |
| effects and mascot |       |
| check and fixtures |       |
| mcp, cli and skill |       |
| docs and demo      |       |
| CI and releases    |       |

---

## 15. Schedule to Tuesday

| Day           | Goals                                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thu night** | Write the spec and APIs. Set up monorepo, CI and release pipeline. Write AGENTS.md, ARCHITECTURE.md and TESTING.md. **Pick budget numbers.**                                  |
| **Fri**       | Core runtime with test mode, tokens to materials, HTML layer. **`check` skeleton: load, blank screen, console errors, budgets, report and score.**                            |
| **Sat**       | Optimizer CLI, MCP server, skill, effects pack, mascot motion. **`check` scroll, menu, HTML layer, contrast, reduced motion and keyboard rules, plus their broken fixtures.** |
| **Sun**       | Spectr demo, docs site, speed checks in CI. **Screenshot tests, golden tasks, Spectr scores 90 or more.**                                                                     |
| **Mon**       | Polish. README with GIF and a sample check report. Publish to npm. List on MCP Registry and skills.sh.                                                                        |
| **Tue**       | Launch posts.                                                                                                                                                                 |

**Rule:** if a feature is messy on Monday, cut it. A small, clean V1 beats a big, messy one.

**What to cut first if time runs out:** mascot, then golden tasks down to 2, then the brand color check. **Never cut:** test mode, the load, blank screen, budget, scroll and HTML layer checks. Those are what make "comes tested" true.

---

## 16. Still to Decide

- Exact budget numbers (load time, triangles, draw calls). `TESTING.md` §6 has starting numbers to argue about.
- The 5 MCP golden task prompts. `TESTING.md` §8 has drafts.
- The design questions the MCP asks users.
- Which check rules are errors and which are warnings at launch.
