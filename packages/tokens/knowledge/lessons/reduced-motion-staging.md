---
id: reduced-motion-staging
kind: lesson
title: Reduced motion must hold the camera and still change sections
tags: reduced-motion, a11y, camera, choreography
seen: 1
---
Mistake: Reduced-motion staging let the camera keep travelling, or froze it so sections no longer changed.

Rule: Under reduced motion the camera holds its start pose and sections cross-fade. Camera travel must stay under 10 percent of normal, and keyboard must still reach every beat. Override only through the reducedMotion block of the choreography (mode fade or none, extra tracks, safe behaviors). Rule a11y/reduced-motion checks this.
