# Doodley: Build Plan for V1

This is **how** we build V1, task by task. `PROJECT_PLAN.md` says **what** we build. `TESTING.md` says **how we test it**.

Today is **Fri Nov 20**. Launch is **Tue Nov 24**. The "Thu night" work in `PROJECT_PLAN.md` §15 moves to Friday.

---

## 1. How the work is split

We build in **4 lanes** that run at the same time. Each lane can be its own Devin or Claude task.

| Lane           | Packages                             | What it makes                            |
| -------------- | ------------------------------------ | ---------------------------------------- |
| **A. Runtime** | `core`, `tokens`, `a11y`, `effects`  | The 3D website itself                    |
| **B. Checker** | `check`, `fixtures/broken/`          | The tester and the broken practice sites |
| **C. Tools**   | `optimizer`, `cli`, `mcp`, `skills/` | What agents and users call               |
| **D. Ship**    | CI, docs, demo, release              | Getting it out the door                  |

### The two contracts lanes must agree on first

Lanes A and B meet in two places. Lock these on Friday (in `ARCHITECTURE.md`) before anyone builds past them:

1. **`doodley.json`**: the site config every project has (sections, brand file, budgets, viewports).
2. **The test bridge `window.__doodley`**: what core exposes and check reads (`TESTING.md` §2.1).

If one of these has to change, change `ARCHITECTURE.md` first, then tell the other lane.

---

## 2. Task list

Every task has an id, a lane, what it depends on, and a "done means" line. **A task is not done until its done-means is true and CI is green.**

### Phase 0: Foundation (Fri)

| Id   | Lane | Task                                                                                                               | Depends on | Done means                                                                                                       |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| T0.1 | D    | Monorepo scaffold: pnpm, Turborepo, TypeScript, Biome, Vitest, Changesets, 9 package skeletons                     | none       | `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass                                |
| T0.2 | D    | CI and repo files: `ci.yml`, dependabot, PR and issue templates, CODEOWNERS                                        | T0.1       | CI runs on a PR and passes                                                                                       |
| T0.3 | D    | `ARCHITECTURE.md` with both contracts, `DEVELOPMENT.md`, ADR 001 (R3F) and 002 (test mode), `doodley.budgets.json` | T0.1       | Both contracts written as TypeScript types in `packages/core/src/contract.ts` and described in `ARCHITECTURE.md` |
| T0.4 | D    | Release pipeline: Changesets release workflow, npm trusted publishing                                              | T0.2       | A test changeset opens a release PR. (Publishing needs the npm account set up by a person.)                      |

### Phase 1: Runtime and checker skeleton (Fri to Sat)

| Id   | Lane | Task                                                                                                          | Depends on | Done means                                                                              |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| T1.1 | A    | `core`: `<DoodleySite>`, `<Section>`, scroll camera path with speed limit and no roll                         | T0.3       | A 3-section example scrolls smoothly in the browser. Unit tests for camera path math.   |
| T1.2 | A    | `core`: test mode (`?doodley-test`, `frameloop="never"`, seeded random) and the test bridge                   | T1.1       | Two runs of the example give identical camera poses at every step (unit + browser test) |
| T1.3 | A    | `tokens`: read DESIGN.md and design-token JSON into a theme; theme into materials and lights                  | T0.3       | Unit tests: 3 sample brand files give the expected colors, fonts and materials          |
| T1.4 | A    | `a11y`: HTML layer, `<nav>` that glides the camera, keyboard, skip link, reduced motion fades, WebGL fallback | T1.1       | Example works with keyboard only and with reduced motion on                             |
| T1.5 | B    | `check` skeleton: Playwright engine, viewports, report JSON + schema, score, `Fix:` output, exit codes        | T0.3       | `doodley check` on the example writes a valid report                                    |
| T1.6 | B    | Rules: `load/*`, `render/*`, `budgets/*` + their fixtures                                                     | T1.5, T1.2 | Each fixture fails exactly its rule (`pnpm test:fixtures`)                              |

### Phase 2: Tools and the rest of the checker (Sat)

| Id   | Lane | Task                                                                                | Depends on | Done means                                                                                   |
| ---- | ---- | ----------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| T2.1 | B    | Rules: `scroll/*`, `nav/*` + fixtures                                               | T1.6, T1.4 | Fixtures fail correctly; example passes                                                      |
| T2.2 | B    | Rules: `html/*`, `seo/*`, `a11y/*` (axe + contrast over 3D) + fixtures              | T1.6, T1.4 | Fixtures fail correctly; example passes                                                      |
| T2.3 | B    | Rules: `brand/*`, `determinism/*` + fixtures                                        | T1.6, T1.3 | Fixtures fail correctly; `--verify-determinism` passes on the example                        |
| T2.4 | C    | `optimizer`: `doodley optimize <file.glb>` with glTF Transform; `optimizer/*` rules | T1.5       | A heavy test model shrinks and `optimizer/looks-same` passes                                 |
| T2.5 | A    | `effects`: glass material and shader background, both with budget-friendly defaults | T1.1, T1.3 | Example with both effects still scores 90 or more                                            |
| T2.6 | C    | `cli`: `create`, `add-section`, `apply-brand`, `optimize`, `check`                  | T1.5, T1.3 | CLI end-to-end test makes a site from scratch that scores 90 or more                         |
| T2.7 | C    | `mcp`: tools that call the same functions as the CLI; `server.json`                 | T2.6       | An MCP client test calls every tool and gets valid JSON                                      |
| T2.8 | C    | `skills/doodley/SKILL.md`: when to use it, the build → check → fix loop             | T2.7       | A fresh Claude Code session with only the skill and MCP builds a site that scores 90 or more |

### Phase 3: Demo and full CI (Sun)

| Id   | Lane | Task                                                                 | Depends on | Done means                                                          |
| ---- | ---- | -------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| T3.1 | D    | Spectr demo in `examples/spectr`                                     | T2.5, T2.6 | Scores 90 or more on desktop and phone; passes the iPhone checklist |
| T3.2 | D    | `visual.yml`: screenshot tests in the pinned Playwright Docker image | T1.2, T3.1 | Baselines committed; CI compares them                               |
| T3.3 | D    | `perf.yml`: Lighthouse CI phone profile + 3D budgets                 | T3.1       | CI fails a PR that adds a heavy model                               |
| T3.4 | D    | Golden tasks (5 prompts) + `golden.yml` nightly                      | T2.8       | All 5 score 90 or more locally                                      |
| T3.5 | D    | Docs site (minimal) + `llms.txt`                                     | T2.6       | Docs build and deploy                                               |

### Phase 4: Polish and launch (Mon to Tue)

| Id   | Lane | Task                                                           | Depends on | Done means                                      |
| ---- | ---- | -------------------------------------------------------------- | ---------- | ----------------------------------------------- |
| T4.1 | D    | README with GIF and sample check report; before and after page | T3.1       | README reviewed by both of us                   |
| T4.2 | D    | Publish to npm, MCP Registry, skills.sh                        | T0.4, T4.1 | `npx doodley create` works from a clean machine |
| T4.3 | D    | Launch posts                                                   | T4.2       | Posted Tuesday                                  |

### V2 preview (only if everything above is green by Sunday night)

| Id   | Lane | Task                                                  | Done means                                                    |
| ---- | ---- | ----------------------------------------------------- | ------------------------------------------------------------- |
| T5.1 | A    | `mascot`: shader deformers (bend, squash, bob, blink) | Mascot moves in the demo and the site still scores 90 or more |
| T5.2 | B    | `mascot/*` rules + fixtures                           | Fixtures fail correctly                                       |

---

## 3. Day plan

| Day     | Lane A                 | Lane B                 | Lane C                 | Lane D                        |
| ------- | ---------------------- | ---------------------- | ---------------------- | ----------------------------- |
| **Fri** | T1.1                   | T1.5                   |                        | T0.1 → T0.2, T0.3, T0.4       |
| **Sat** | T1.2, T1.3, T1.4, T2.5 | T1.6, T2.1, T2.2, T2.3 | T2.4, T2.6, T2.7, T2.8 |                               |
| **Sun** | T5.1 (if time)         | T5.2 (if time)         |                        | T3.1 → T3.2, T3.3, T3.4, T3.5 |
| **Mon** | fixes                  | fixes                  | fixes                  | T4.1, T4.2                    |
| **Tue** |                        |                        |                        | T4.3                          |

**Cut order if we fall behind** (from `PROJECT_PLAN.md` §15): mascot, then golden tasks down to 2, then the brand color check. **Never cut:** test mode, the load, blank screen, budget, scroll and HTML layer checks.

---

## 4. Rules for every task

1. Start a branch: `feat/<task-id>-<short-name>` (example: `feat/t1.2-test-mode`).
2. Read the task row, `ARCHITECTURE.md`, and the matching part of `TESTING.md`.
3. Write the tests first when you can.
4. Every new feature comes with its check rule and broken fixture.
5. Add a changeset.
6. Open a PR with: plain-language summary, screenshots if visuals changed, check score before and after.
7. The other person reviews. CI must be green. Squash merge.

---

## 5. Prompt to give an agent for a task

```
Read AGENTS.md, PROJECT_PLAN.md, TESTING.md, ARCHITECTURE.md and docs/BUILD_PLAN.md.
Do task <ID> only. Work on a new branch named feat/<id>-<short-name>.
Stop when its "done means" line is true and all checks pass.
If anything in the plan is unclear, stop and ask me.
```
