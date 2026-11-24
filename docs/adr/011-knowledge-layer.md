# ADR 011: Knowledge layer as local markdown files

## Status

Accepted.

## Context

The trial and the handoff produced lessons (near-black surfaces, dropped fonts, reduced-motion staging) that lived only in people's heads. The agent needs them at build time. Nothing may call a paid service or be hosted by the owner.

## Decision

1. Notes and lessons are markdown files with frontmatter, bundled in `@toros/tokens` and read from `.toros/knowledge` in the project. No hosted retrieval.
2. Search is deterministic tag and keyword scoring (the same approach as the reference library). Embeddings only if the library outgrows it.
3. Search returns summaries; a second call returns the full entry, so the agent loads only what it needs.
4. Lessons carry a `seen` count. The agent writes them into the project folder; promotion into the bundled set is a human PR.
5. Project files are read-only data: symlinks, oversized and malformed files are skipped. `add_lesson` writes only inside the project root.

## Consequences

- Works offline and costs nothing to run.
- Synonym misses are possible. The eval set in the tests shows when that starts to matter.
