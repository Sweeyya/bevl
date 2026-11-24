---
id: choreography-in-app
kind: note
title: Where the choreography lives and how it reaches the scene
tags: choreography, config, recipe, scroll
---
toros.json holds the site name, sections, brand file and choreography. toros recipe apply writes the choreography there.

The site App.tsx must pass it on with config={{ ...config, choreography }}. If the scene ignores your choreography, check this first. An invalid choreography is only a console error and the default fly-through is used, so run check after every edit.
