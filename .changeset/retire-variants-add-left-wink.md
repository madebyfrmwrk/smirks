---
'smirks': minor
---

**Breaking:** the variant set changed, so a given seed renders a different face than it did in 0.0.2. `MOUTHS` drops from 9 to 7 entries, which shifts `% MOUTHS.length` for most seeds. `EYES` stays at 12, but one variant was retired and a left-eye wink — the horizontal mirror of the existing right-eye wink — was appended, so the last two eye indices resolve to different faces. Colors are unaffected: palette selection reads separate hash bits and the palettes themselves are unchanged.
