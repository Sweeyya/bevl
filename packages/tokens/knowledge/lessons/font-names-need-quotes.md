---
id: font-names-need-quotes
kind: lesson
title: Multi-word font names need quoting in CSS stacks
tags: fonts, css, brand, quoting
seen: 1
---
Mistake: A brand font with spaces in its name (for example Source Serif 4) was written bare into the CSS font-family stack, which is invalid, so the browser used the fallback.

Rule: Write the font name plainly in the brand file. fontStack in @toros/core quotes multi-word families and adds a system fallback. When you write CSS by hand outside fontStack, quote any family that contains spaces, and check the shots to see the real font.
