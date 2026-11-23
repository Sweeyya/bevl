# 007: Project-editing commands live in @toros/tokens

ARCHITECTURE.md §6 lets `cli` and `mcp` depend on `check`, `tokens` and `optimizer`, but not on each other. `create`, `add-section` and `apply-brand` are needed by both, so their logic sits in `@toros/tokens` (`src/project/`). The CLI and MCP call it and add only argument handling and path confinement. Revisit by moving them to a dedicated package if this grows.
