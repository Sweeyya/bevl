# Releasing

## How it works

1. Every PR includes a changeset: `pnpm changeset` → pick the packages that changed → write one sentence.
2. When PRs merge to `main`, the release workflow opens a "Release packages" PR that bumps versions and updates `CHANGELOG.md`.
3. Merging that PR publishes to npm.

## Versioning rules

- **Patch (1.0.1):** bug fixes, no behavior change.
- **Minor (1.1.0):** new features, nothing breaks.
- **Major (2.0.0):** breaking changes.

A new `check` rule that makes old sites fail is **minor** if it starts as `warn`. Turning a `warn` into an `error` is **major**.

## npm setup (required before first publish — do this manually)

The release workflow uses npm trusted publishing with provenance. No npm token is stored in the repo. To set it up:

1. Create an npm account if you don't have one.
2. Go to npmjs.com → your account → Access Tokens → Generate New Token → Granular Access Token.
3. Set the token to allow publishing for the `@bevl` scope.
4. Add it as a GitHub Actions secret named `NPM_TOKEN` in the repo settings.
5. Enable provenance on npm: in the publish step, `NPM_CONFIG_PROVENANCE=true` is already set in `release.yml`.

Until this is set up, the release workflow will fail at the publish step. That is expected.

## First publish checklist

- [ ] npm account created
- [ ] `NPM_TOKEN` secret added to GitHub repo
- [ ] `@bevl` scope claimed on npm (publish once manually with `pnpm publish --access public` from each package)
- [ ] `server.json` filled in for MCP Registry listing
- [ ] `README.md` has a GIF and sample check report
- [ ] All examples score 90+ on `pnpm check:examples`
