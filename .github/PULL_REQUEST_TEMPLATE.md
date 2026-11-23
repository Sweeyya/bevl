## What this PR does

<!-- One paragraph. What changed and why. -->

## Check score (if output changed)

|         | Before | After |
| ------- | ------ | ----- |
| Desktop |        |       |
| Phone   |        |       |

<!-- Run: pnpm check:examples -->
<!-- Paste the score here. Skip if no package output changed. -->

## Screenshots

<!-- Add before/after screenshots if visuals changed. -->

## Checklist

- [ ] I read AGENTS.md before starting
- [ ] Every new feature has a check rule and a broken fixture
- [ ] Unit tests pass: `pnpm test`
- [ ] Lint passes: `pnpm lint:ci`
- [ ] Typecheck passes: `pnpm typecheck`
- [ ] Build passes: `pnpm build`
- [ ] I added a changeset: `pnpm changeset`
- [ ] CI is green (slow checks: add the `full-ci` label, or ran `pnpm verify:full` locally, if this touches the checker, runtime, fixtures or inputs)
