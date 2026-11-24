---
id: font-lines-dropped
kind: lesson
title: Brand fonts written as Headings and Body lines were silently dropped
tags: fonts, brand, design-md, parsing
seen: 1
---
Mistake: A DESIGN.md line like "- Headings: Georgia, serif" was ignored because the font regex ran across lines, so the site fell back to default fonts with no warning.

Rule: Write one font per line (- Headings: Georgia, serif and - Body: Inter, sans-serif). After apply-brand, read src/brand.tokens.json and fix the file if a font came out as a default. A typography section with no readable font now exits non-zero with a Fix line.
