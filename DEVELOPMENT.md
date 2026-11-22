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

| Command          | What it does                         |
| ---------------- | ------------------------------------ |
| `pnpm build`     | Build all packages                   |
| `pnpm test`      | Run all unit tests                   |
| `pnpm lint`      | Lint and auto-fix                    |
| `pnpm lint:ci`   | Lint without fixing (used in CI)     |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm clean`     | Delete all dist/ folders             |
| `pnpm changeset` | Add a changeset for your PR          |

## Testing commands

| Command                 | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `pnpm test:fixtures`    | Run every broken fixture against check (must all fail)   |
| `pnpm check:examples`   | Run doodley check on every example (must score 90+)      |
| `pnpm test:visual`      | Screenshot tests (run inside Docker for reproducibility) |
| `pnpm test:perf`        | Lighthouse CI on built demos                             |
| `pnpm test:determinism` | Run check --verify-determinism on every example          |

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
