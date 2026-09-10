---
'smirks': minor
---

`generate` is now documented, and the hue relationship between the two colour palettes is now a promise rather than an accident. `generate(seed)` has been exported since 0.0.1 and returns the resolved `{ eye, mouth, fg, bg }` for a seed without rendering an SVG, but no line of the README mentioned it, so the obvious use — colouring something next to the avatar, a profile cover being the common one — looked impossible. Alongside that: because `palettes.bold` is derived from the default palette index for index and both are read from the same hash bits, a seed lands on the same hue in both, so `generate(id)` and `generate(id, { palette: palettes.bold })` return a matched pair — a soft face for the avatar and the same hue saturated for the banner. That already held; it is now stated in the README and asserted in `test/colors.test.ts`, so the `.map()` derivation cannot quietly stop holding it.
