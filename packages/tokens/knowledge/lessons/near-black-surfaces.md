---
id: near-black-surfaces
kind: lesson
title: Dark brands render near-black without compensated light
tags: lighting, dark, surface, three, brand
seen: 1
---
Mistake: A dark brand surface looked almost black. In three 0.187 diffuse light is divided by pi, and an ambient light tinted with the dark surface colour made everything render at about a third of its colour.

Rule: Use BackdropLights, which multiplies intensities by pi, and turn off ACES tone mapping in the brand scene. Add light before judging a dark brand, then look at the shots.
