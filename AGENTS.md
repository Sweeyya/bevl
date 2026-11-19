# Working in the Doodley repo

Doodley is a framework that lets AI agents build 3D interactive websites, then check them, play through them, and score them. Read these first, in order:

1. `docs/PLAN.md`: the whole project and why.
2. `docs/STEP1_SPEC.md`: the exact spec for what we are building now.

## How to work

- Build **one milestone at a time** in the order in `STEP1_SPEC.md` §11. Do not start the next milestone until the current one's "Done when" passes.
- At the start of each milestone, write a short plan. At the end, run all tests and commit with a message naming the milestone (e.g. `M2: runtime loop, RNG, state, bridge`).
- If the spec is unclear or seems wrong, **stop and ask**. Do not invent a different design. Record any agreed change in the spec in the same commit.
- Keep `docs/STEP1_SPEC.md` and the code in sync. If code must differ from the spec, update the spec and say why.
- Keep a short log of decisions and surprises in `docs/decisions.md` (date, decision, reason).

## Rules

- TypeScript strict, ESM only, Node 22+, pnpm workspaces.
- **Dependencies:** check the current version on npm before adding anything. Use a version published at least 7 days ago. Pin exact versions. No `latest`, `*`, or open ranges. Note why each dependency exists in its package README.
- **Determinism is the product.** Never add wall-clock time, unseeded randomness, timers, or network calls to the runtime's test mode or to checks. Every new check needs a determinism test.
- Every check and lint rule gets: a stable id, a message, a `Fix:` line, a fixture that triggers it, and a test.
- CLI output: `--json` on every command, `✗` + `Fix:` on failure, exit codes 0/1/2/3 as in the spec.
- Do not copy code from HyperFrames or other projects. Learning from their ideas is fine. Respect licenses.
- No secrets in the repo. No telemetry in Step 1.
- Small, readable modules. Comments only where the why is not obvious.

## Commands (fill in as they are created)

- Install: `pnpm install`
- Test all: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint/format: `pnpm lint`
- Install Chromium for tests: `pnpm exec playwright install chromium`
