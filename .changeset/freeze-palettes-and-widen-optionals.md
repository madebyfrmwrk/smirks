---
'smirks': major
---

**Breaking (API):** `palettes` is deep-frozen at module init and every public optional is now declared `?: T | undefined`. Nothing froze the palettes before, so `palettes.default.pairs[0] = {...}` silently rerouted colors for every seed — and because the vanilla and React entries each bundle their own copy, a mutation made `generateSvg` and `<Smirk>` disagree about the same seed in the same app. All five presets also publish `readonly` arrays now; three of them previously emitted mutable ones. The optional widening fixes the opposite problem: under `exactOptionalPropertyTypes` a consumer could not write `title={user.displayName}` or `fg={theme.brandFg}` from a nullable source, and TypeScript reported it as a missing `mode` discriminant rather than as the nullability it was. Both changes are type-level or runtime-guard only; no rendered output moves.
