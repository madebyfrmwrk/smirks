---
'smirks': minor
---

**Breaking (API):** `palettes.monochrome` is renamed to `palettes.monochromeLight`, and a new `palettes.monochromeDark` adds the inverse — one fixed white-on-black pair. Previously the white-on-black pair existed only inside `duotone`, where the seed chose it, so there was no way to pin every avatar to the dark form. Unlike the other changes in this release this one breaks compilation rather than visuals; the fix is a rename, `monochrome` to `monochromeLight`. Both pairs are now declared once and `duotone` is composed from them, so the three presets cannot drift apart — its output is byte-identical to before, verified across 300 seeds.
