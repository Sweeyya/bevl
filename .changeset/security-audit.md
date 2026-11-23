---
"@bevl/mcp": patch
"@bevl/cli": patch
"@bevl/core": minor
"@bevl/check": patch
---

Security hardening from a full repo audit.

- MCP tools only touch files inside the project root (`BEVL_PROJECT_ROOT`, default cwd), reject symlink and `../` escapes, only open http(s) URLs on localhost (remote needs `BEVL_ALLOW_REMOTE=1`), never allow cloud metadata addresses, and use strict schemas.
- `bevl create` validates the site name and escapes it in the HTML.
- `?bevl-test` is only honored on local hosts unless `bevl.json` sets `"testMode": "always"`.
- Playwright 1.65.1 (fixes a high-severity advisory), remaining GitHub Action bumps, a Security workflow (pnpm audit and zizmor), and a Dependabot 7-day cooldown.
