---
"@toros/cli": minor
"@toros/mcp": minor
"@toros/tokens": minor
---

Add `toros add-section` and `toros apply-brand`, and the MCP tools `create_site`, `add_section` and `apply_brand`. New sites import `src/brand.tokens.json`, pass it as the `brand` prop, use the `overlay` prop with the accessible nav, and get a standalone package.json and tsconfig.json. The shared project-editing code lives in `@toros/tokens` because the package rules do not let `mcp` depend on `cli`.
