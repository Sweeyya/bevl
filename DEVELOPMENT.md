# Development

## Setup

```sh
# 1. Clone the repo
git clone https://github.com/Sweeyya/doodley.git
cd doodley

# 2. Install pnpm (if not already installed)
npm install -g pnpm@12.20.0

# 3. Install dependencies
pnpm install

# 4. Build all packages
pnpm build
```

## Daily commands

| Command            | What it does                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `pnpm build`       | Build all packages                                                                       |
| `pnpm test`        | Run all unit tests                                                                       |
| `pnpm lint`        | Lint and auto-fix                                                                        |
| `pnpm lint:ci`     | Lint without fixing (used in CI)                                                         |
| `pnpm typecheck`   | TypeScript check across all packages                                                     |
| `pnpm clean`       | Delete all dist/ folders                                                                 |
| `pnpm changeset`   | Add a changeset for your PR                                                              |
| `pnpm verify`      | Lint, typecheck and unit tests (about 1 minute)                                          |
| `pnpm verify:full` | `verify` plus fixtures, browser e2e and example scores (about 5 minutes, needs Chromium) |
| `pnpm hooks`       | Turn on the pre-push hook that runs `lint:ci`, `typecheck` and `test` before each push   |

## What runs on GitHub

Every pull request runs the fast checks: lint, typecheck, unit tests, build, the dependency audit and the workflow audit (about 2 minutes).

The slow checks (broken fixtures, browser e2e, example scores, Lighthouse, screenshots) do **not** run on a pull request by default. They run on every push to `main`, nightly, and on demand:

- Add the **`full-ci`** label to a pull request to run them on it (and on every later push to it).
- Or open the Actions tab, pick the workflow and press **Run workflow**.
- Or run `pnpm verify:full` on your own machine before merging.

Run the slow checks before merging anything that touches the checker, the runtime, the fixtures or the inputs.

## Testing commands

| Command                        | What it does                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `pnpm test:fixtures`           | Run every broken fixture against check (must all fail)                                      |
| `pnpm check:examples`          | Build each example, serve it with `vite preview`, run check (all must score 90+, no errors) |
| `pnpm test:determinism`        | Same as `check:examples`, and run check twice per example: findings must be identical       |
| `pnpm test:visual`             | Screenshot tests against the baselines for your platform                                    |
| `pnpm test:visual -- --update` | Remake the baselines for your platform (`tools/__screenshots__/<platform>/`)                |
| `pnpm test:perf`               | Lighthouse CI (phone profile, 3 runs, median) on each built example                         |

These scripts live in `tools/` (`@doodley/tools`, private). They need Chromium: `pnpm --filter @doodley/check exec playwright install chromium`.

### Screenshot baselines

Baselines differ between macOS and Linux (fonts, software WebGL), so they are stored per platform: `tools/__screenshots__/darwin/` and `tools/__screenshots__/linux/`. A missing baseline fails the test with the command to fix it; it never passes silently.

CI uses `linux`. Do not make linux baselines by hand. Run the **Update visual baselines** workflow (Actions tab, choose your branch). It makes them on the CI runner and pushes a commit to your branch. Pushes made by that workflow do not start other workflows, so re-run **Visual** afterwards.

## Working on a package

```sh
# Work in one package
cd packages/core
pnpm test          # run just this package's tests
pnpm typecheck     # typecheck just this package
pnpm build         # build just this package
```

## Workflow

1. Branch from main: `git checkout -b feat/your-feature`
2. Read AGENTS.md, ARCHITECTURE.md, and the relevant section of TESTING.md
3. Write the test first
4. Write the code
5. Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
6. Add a changeset: `pnpm changeset`
7. Open a PR — fill in PULL_REQUEST_TEMPLATE.md

## Adding a new check rule

See TESTING.md §11.

## Debugging test mode

Add `?doodley-test` to any site URL. Open the console and inspect `window.__doodley`.

## Debugging the checker

```sh
# Run check on a specific site with verbose output
doodley check --rule load/ready
doodley check --viewport desktop
doodley check --json > report.json
```
