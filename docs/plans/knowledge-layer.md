# Knowledge layer: craft notes and lessons

Status: built (`toros knowledge ...`, MCP `search_knowledge`, `get_knowledge`, `add_lesson`). Decision record: `docs/adr/011-knowledge-layer.md`.

## What it is

Plain markdown files the agent searches on its own machine. No hosted service, no model call, no network, no embeddings. Two kinds:

- **note**: a craft note. How something works or what to do (text on screens, ports, brand roles, the room scaffold).
- **lesson**: a mistake that cost time, written as `Mistake:` and `Rule:`, with a `seen` count. A lesson said again raises `seen` instead of duplicating.

## Where the files are

- Bundled: `packages/tokens/knowledge/notes/*.md` and `lessons/*.md`. They ship inside `@toros/tokens`.
- Project: `<project>/.toros/knowledge/` (same layout). A project entry with the same id replaces the bundled one. This folder is the agent's own memory for that site and is not committed unless the user wants it.

## File format

```
---
id: near-black-surfaces        lowercase-hyphen, 2 to 61 characters
kind: lesson                   note or lesson
title: One line
tags: lighting, dark, surface  1 to 10 lowercase-hyphen tags
seen: 1                        lessons only
---
Body, 20 to 4000 characters. Lessons: "Mistake: ..." then a blank line, then "Rule: ...".
```

Files over 16 KB, symlinks and files that do not parse are skipped and reported by `toros knowledge lint`.

## How the agent uses it (progressive disclosure)

1. `toros knowledge search --text "dark brand looks black"` returns ids, titles and one-line summaries only.
2. `toros knowledge show <id>` returns the full entry. The agent reads the top two or three.
3. After a fix that took more than one try, the agent runs `toros knowledge add-lesson`. Quietly; the user is not told.

Scoring: a tag match is 3, a tag word in the text is 3, a title word is 2, a body word is 1 (up to 4). Ties go to the lesson seen more often, then by id. Words are lightly stemmed (plural, -ed, -ing).

## Checks

`toros knowledge lint` and the unit tests reject duplicate ids, duplicate titles, and entries of one kind that share almost all tags (merge them). The tests also hold a small eval set: prompts and the entry that must come first.

## What is not built

- Approval flow: lessons the agent writes stay in the project folder. The owner promotes one into `packages/tokens/knowledge/lessons` by PR when it keeps coming back.
- Stale-note detection.
- Embeddings or hybrid search. Add only if synonym misses show up and the library passes about 30 entries.
