# Working in the Doodley repo

Doodley turns any brand into a fast, accessible 3D website, used from Claude, ChatGPT, Cursor or Lovable through an MCP. Every site it makes comes tested by `doodley check`.

Read these first, in order:

1. `PROJECT_PLAN.md`: the whole project, packages, files and schedule.
2. `TESTING.md`: test mode, every `check` rule, budgets, fixtures, golden tasks.

`docs/archive/` holds old plans. Do not build from them.

## How to work

- One package per task. Every task has a "done means" line before you start.
- Every feature ships with the `check` rule that tests it and a broken fixture for that rule (`TESTING.md` §11).
- If the plan is unclear or seems wrong, stop and ask. Do not invent a different design.
- Record big decisions in `docs/adr/` (one short file each).

## Branches and commits

- Work on a branch only: `feat/<name>` or `fix/<name>`.
- Never commit to `main`. Never push to `main`.
- After every commit on a `feat/` or `fix/` branch, push it to `origin` right away (`git push -u origin <branch>`). Do not wait to be asked.
- No AI co-author lines or AI attribution in commits or commit messages.
- Every PR description must disclose AI tool use: state which tool was used and how much of the work it did. This belongs in the PR description, not the commit.
- Every PR has a changeset, a plain-language summary, screenshots if visuals changed, and the `check` score before and after if output changed.

## Rules

- TypeScript strict, ESM only, Node 22+, pnpm workspaces, Turborepo, Biome.
- **Dependencies:** check the current version on npm before adding anything. Use a version published at least 7 days ago. Pin exact versions. No `latest`, `*` or open ranges.
- **Test mode must stay repeatable.** No `Math.random`, `Date.now`, timers or network calls in runtime code paths used by test mode. Use the seeded random function and the test clock.
- Every check rule has a stable id, a severity, a pass rule, a `Fix:` message, a broken fixture and tests.
- No secrets in the repo.
- **Keep code small.** AI agents tend to leave scaffolding, duplicate helpers, and narrative comments. Before opening a PR, check `pnpm pkg:unused` output and remove anything flagged. Do not add comments that restate what the code already says.

## Commands

- Install: `pnpm install`
- Build: `pnpm build`
- Unit tests: `pnpm test`
- Fast check before pushing: `pnpm verify`. Full check: `pnpm verify:full`
- Fixtures: `pnpm test:fixtures`
- Examples score 90+: `pnpm check:examples`
- Screenshots: `pnpm test:visual`
- Speed: `pnpm test:perf`
- Lint and format: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Package exports correct: `pnpm pkg:lint`
- Type resolution correct: `pnpm pkg:types`
- Bundle size within budget: `pnpm pkg:size`
- Dead code / unused exports: `pnpm pkg:unused`
